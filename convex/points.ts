import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getTierFromScans, getNextTierInfo, getMaxEarningScans, getPointsPerScan, checkFeatureAccess } from "./lib/featureGating";

/**
 * Helper to get or initialize a points balance
 */
async function getOrCreatePointsBalance(ctx: any, userId: any) {
  let balance = await ctx.db
    .query("pointsBalance")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!balance) {
    const now = Date.now();
    const balanceId = await ctx.db.insert("pointsBalance", {
      userId,
      totalPoints: 0,
      availablePoints: 0,
      pendingPoints: 0,
      pointsUsed: 0,
      tier: "bronze",
      tierProgress: 0,
      earningScansThisMonth: 0,
      monthStart: getStartOfMonth(now),
      lastEarnedAt: 0,
      streakCount: 0,
      lastStreakScan: 0,
      createdAt: now,
      updatedAt: now,
    });
    balance = await ctx.db.get(balanceId);
  } else {
    // Check if we need to reset the month
    const currentMonthStart = getStartOfMonth(Date.now());
    if (balance.monthStart < currentMonthStart) {
      await ctx.db.patch(balance._id, {
        earningScansThisMonth: 0,
        monthStart: currentMonthStart,
        updatedAt: Date.now(),
      });
      balance.earningScansThisMonth = 0;
      balance.monthStart = currentMonthStart;
    }
  }

  return balance;
}

function getStartOfMonth(timestamp: number) {
  const d = new Date(timestamp);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function getWeekNumber(timestamp: number) {
  const d = new Date(timestamp);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo + (d.getUTCFullYear() * 100); // Year + week to be unique across years
}

export const initializePointsBalance = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Usually called internally or on signup
    return await getOrCreatePointsBalance(ctx, args.userId);
  },
});

export async function processEarnPoints(ctx: any, userId: Id<"users">, receiptId: Id<"receipts">) {
  const { isPremium } = await checkFeatureAccess(ctx, userId);
  const balance = await getOrCreatePointsBalance(ctx, userId);

  const currentTier = getTierFromScans(balance.tierProgress);
  const maxEarningScans = getMaxEarningScans(currentTier, isPremium);
  
  if (balance.earningScansThisMonth >= maxEarningScans) {
    return { earned: false, reason: "monthly_limit_reached" };
  }

  const pointsAmount = getPointsPerScan(currentTier, isPremium);
  
  // Check streak
  const now = Date.now();
  const currentWeek = getWeekNumber(now);
  const lastWeek = balance.lastStreakScan > 0 ? getWeekNumber(balance.lastStreakScan) : 0;
  
  let newStreakCount = balance.streakCount;
  if (currentWeek === lastWeek + 1) {
    newStreakCount++;
  } else if (currentWeek > lastWeek + 1) {
    newStreakCount = 1;
  } else if (lastWeek === 0) {
    newStreakCount = 1;
  }

  // Award streak bonuses
  let bonusPoints = 0;
  if (newStreakCount === 3 && currentWeek !== lastWeek) bonusPoints = 50;
  if (newStreakCount === 4 && currentWeek !== lastWeek) bonusPoints = 100;
  if (newStreakCount === 8 && currentWeek !== lastWeek) bonusPoints = 250;
  if (newStreakCount === 12 && currentWeek !== lastWeek) bonusPoints = 500;

  const newTierProgress = balance.tierProgress + 1;
  const newTierInfo = getTierFromScans(newTierProgress);

  // Update balance
  await ctx.db.patch(balance._id, {
    totalPoints: balance.totalPoints + pointsAmount + bonusPoints,
    availablePoints: balance.availablePoints + pointsAmount + bonusPoints,
    tier: newTierInfo.tier,
    tierProgress: newTierProgress,
    earningScansThisMonth: balance.earningScansThisMonth + 1,
    lastEarnedAt: now,
    streakCount: newStreakCount,
    lastStreakScan: now,
    updatedAt: now,
  });

  // Create transaction for base points
  await ctx.db.insert("pointsTransactions", {
    userId: userId,
    type: "earn",
    amount: pointsAmount,
    source: "receipt_scan",
    receiptId: receiptId,
    balanceBefore: balance.availablePoints,
    balanceAfter: balance.availablePoints + pointsAmount,
    metadata: { tierAtEarn: currentTier.tier },
    createdAt: now,
  });

  // Create transaction for bonus if applicable
  if (bonusPoints > 0) {
    await ctx.db.insert("pointsTransactions", {
      userId: userId,
      type: "bonus",
      amount: bonusPoints,
      source: `streak_bonus_${newStreakCount}_weeks`,
      receiptId: receiptId,
      balanceBefore: balance.availablePoints + pointsAmount,
      balanceAfter: balance.availablePoints + pointsAmount + bonusPoints,
      metadata: { streakCount: newStreakCount },
      createdAt: now,
    });
  }

  return { 
    earned: true, 
    pointsAmount, 
    bonusPoints, 
    newTier: newTierInfo.tier,
    newStreakCount
  };
}

export const earnPointsInternal = internalMutation({
  args: {
    userId: v.id("users"),
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    return await processEarnPoints(ctx, args.userId, args.receiptId);
  },
});

export const earnPoints = mutation({
  args: {
    userId: v.id("users"),
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    return await processEarnPoints(ctx, args.userId, args.receiptId);
  },
});

export const redeemPoints = mutation({
  args: {
    userId: v.id("users"),
    points: v.number(),
    invoiceId: v.string(),
    stripeInvoiceItemId: v.string(),
  },
  handler: async (ctx, args) => {
    // Only callable from Stripe webhook internal functions, but let's assume server logic for now
    const balance = await getOrCreatePointsBalance(ctx, args.userId);

    if (balance.availablePoints < args.points) {
      throw new ConvexError("Insufficient points");
    }

    if (args.points < 500) {
      throw new ConvexError("Minimum redemption is 500 points");
    }

    const now = Date.now();
    await ctx.db.patch(balance._id, {
      availablePoints: balance.availablePoints - args.points,
      pointsUsed: balance.pointsUsed + args.points,
      updatedAt: now,
    });

    await ctx.db.insert("pointsTransactions", {
      userId: args.userId,
      type: "redeem",
      amount: -args.points,
      source: "invoice_credit",
      invoiceId: args.invoiceId,
      stripeInvoiceItemId: args.stripeInvoiceItemId,
      balanceBefore: balance.availablePoints,
      balanceAfter: balance.availablePoints - args.points,
      createdAt: now,
    });

    return { success: true };
  },
});

export const getPointsBalance = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const balance = await getOrCreatePointsBalance(ctx, user._id);
    const { isPremium } = await checkFeatureAccess(ctx, user._id);
    
    const currentTier = getTierFromScans(balance.tierProgress);
    const nextTier = getNextTierInfo(balance.tierProgress);
    const maxEarningScans = getMaxEarningScans(currentTier, isPremium);

    return {
      ...balance,
      canEarnMore: balance.earningScansThisMonth < maxEarningScans,
      nextTierInfo: nextTier,
      effectiveDiscount: balance.availablePoints / 1000,
      monthlyEarningCap: currentTier.maxPoints,
      maxEarningScans,
      isPremium,
    };
  },
});

export const getPointsHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const limit = args.limit ?? 50;

    const transactions = await ctx.db
      .query("pointsTransactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return transactions;
  },
});

export const refundPoints = internalMutation({
  args: {
    userId: v.id("users"),
    receiptId: v.id("receipts"),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const balance = await getOrCreatePointsBalance(ctx, args.userId);
    
    // We only refund up to what's available to avoid negative balance, though theoretically it could go negative
    const refundAmount = args.points;
    const now = Date.now();

    await ctx.db.patch(balance._id, {
      totalPoints: Math.max(0, balance.totalPoints - refundAmount),
      availablePoints: Math.max(0, balance.availablePoints - refundAmount),
      // We don't rollback tier or scan counts currently as that's complex, 
      // just removing the points is enough for deletion/fraud.
      updatedAt: now,
    });

    await ctx.db.insert("pointsTransactions", {
      userId: args.userId,
      type: "refund",
      amount: -refundAmount,
      source: "receipt_deleted_or_fraud",
      receiptId: args.receiptId,
      balanceBefore: balance.availablePoints,
      balanceAfter: Math.max(0, balance.availablePoints - refundAmount),
      createdAt: now,
    });
  }
});

export async function processExpirePoints(ctx: any, userId: Id<"users">, points: number, reason: string) {
  const balance = await getOrCreatePointsBalance(ctx, userId);
  
  const expireAmount = Math.min(balance.availablePoints, points);
  if (expireAmount <= 0) return;

  const now = Date.now();

  await ctx.db.patch(balance._id, {
    availablePoints: balance.availablePoints - expireAmount,
    updatedAt: now,
  });

  await ctx.db.insert("pointsTransactions", {
    userId: userId,
    type: "expire",
    amount: -expireAmount,
    source: reason,
    balanceBefore: balance.availablePoints,
    balanceAfter: balance.availablePoints - expireAmount,
    createdAt: now,
  });
}

export const expirePoints = internalMutation({
  args: {
    userId: v.id("users"),
    points: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await processExpirePoints(ctx, args.userId, args.points, args.reason);
  }
});

export const expireOldPoints = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);

    // Find "earn" transactions older than 12 months
    const oldTransactions = await ctx.db
      .query("pointsTransactions")
      .withIndex("by_created", (q) => q.lt("createdAt", oneYearAgo))
      .collect();

    // Filter for "earn" types (since the index doesn't include type)
    const earnTransactions = oldTransactions.filter(tx => tx.type === "earn" || tx.type === "bonus");

    // Group by userId and sum points
    const expiryMap = new Map<string, number>();
    for (const tx of earnTransactions) {
      const current = expiryMap.get(tx.userId) || 0;
      expiryMap.set(tx.userId, current + tx.amount);
    }

    // Call expirePoints for each user
    let usersAffected = 0;
    let totalExpired = 0;

    for (const [userId, points] of expiryMap.entries()) {
      // Check if user still has available points to expire
      const balance = await ctx.db
        .query("pointsBalance")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();

      if (balance && balance.availablePoints > 0) {
        const toExpire = Math.min(balance.availablePoints, points);
        if (toExpire > 0) {
          await processExpirePoints(ctx, userId as any, toExpire, "12_month_expiration");
          usersAffected++;
          totalExpired += toExpire;
        }
      }
    }

    return { usersAffected, totalExpired };
  }
});
