import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getTierFromScans, getNextTierInfo, getMaxEarningScans, getPointsPerScan, checkFeatureAccess, getStartOfMonth } from "./lib/featureGating";

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

  let pointsAmount = getPointsPerScan(currentTier, isPremium);
  
  // Phase 5.3.1: Apply seasonal events
  const now = Date.now();
  const activeEvent = await ctx.db
    .query("seasonalEvents")
    .withIndex("by_active", (q: any) => q.eq("isActive", true))
    .filter((q: any) => q.and(
      q.lte(q.field("startDate"), now),
      q.gte(q.field("endDate"), now)
    ))
    .first();

  let eventBonus = 0;
  if (activeEvent) {
    if (activeEvent.type === "points_multiplier" && activeEvent.multiplier) {
      const multiplied = Math.round(pointsAmount * activeEvent.multiplier);
      eventBonus = multiplied - pointsAmount;
      pointsAmount = multiplied;
    } else if (activeEvent.type === "bonus_points" && activeEvent.bonusAmount) {
      eventBonus = activeEvent.bonusAmount;
      pointsAmount += eventBonus;
    }
  }

  // Check streak
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
  let streakBonus = 0;
  if (newStreakCount === 3 && currentWeek !== lastWeek) streakBonus = 50;
  if (newStreakCount === 4 && currentWeek !== lastWeek) streakBonus = 100;
  if (newStreakCount === 8 && currentWeek !== lastWeek) streakBonus = 250;
  if (newStreakCount === 12 && currentWeek !== lastWeek) streakBonus = 500;

  const totalEarnedThisScan = pointsAmount + streakBonus;

  const newTierProgress = balance.tierProgress + 1;
  const newTierInfo = getTierFromScans(newTierProgress);

  // Update balance
  await ctx.db.patch(balance._id, {
    totalPoints: balance.totalPoints + totalEarnedThisScan,
    availablePoints: balance.availablePoints + totalEarnedThisScan,
    tier: newTierInfo.tier,
    tierProgress: newTierProgress,
    earningScansThisMonth: balance.earningScansThisMonth + 1,
    lastEarnedAt: now,
    streakCount: newStreakCount,
    lastStreakScan: now,
    updatedAt: now,
  });

  // Phase 5.1: Check points achievements
  await ctx.runMutation(internal.insights.checkPointsAchievements, {
    userId,
    totalPoints: balance.totalPoints + totalEarnedThisScan,
    currentTier: newTierInfo.tier,
  });

  // Create transaction for base points (including event bonus)
  await ctx.db.insert("pointsTransactions", {
    userId: userId,
    type: "earn",
    amount: pointsAmount,
    source: activeEvent ? `receipt_scan_${activeEvent.name}` : "receipt_scan",
    receiptId: receiptId,
    balanceBefore: balance.availablePoints,
    balanceAfter: balance.availablePoints + pointsAmount,
    metadata: { tierAtEarn: currentTier.tier, eventId: activeEvent?._id },
    createdAt: now,
  });

  // Create transaction for streak bonus if applicable
  if (streakBonus > 0) {
    await ctx.db.insert("pointsTransactions", {
      userId: userId,
      type: "bonus",
      amount: streakBonus,
      source: `streak_bonus_${newStreakCount}_weeks`,
      receiptId: receiptId,
      balanceBefore: balance.availablePoints + pointsAmount,
      balanceAfter: balance.availablePoints + totalEarnedThisScan,
      metadata: { streakCount: newStreakCount },
      createdAt: now,
    });
  }

  return { 
    earned: true, 
    pointsAmount, 
    bonusPoints: streakBonus, 
    eventBonus,
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

export const awardBonusPoints = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    source: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const balance = await getOrCreatePointsBalance(ctx, args.userId);
    const now = Date.now();

    await ctx.db.patch(balance._id, {
      totalPoints: balance.totalPoints + args.amount,
      availablePoints: balance.availablePoints + args.amount,
      updatedAt: now,
    });

    // Phase 5.1: Check points achievements
    await ctx.runMutation(internal.insights.checkPointsAchievements, {
      userId: args.userId,
      totalPoints: balance.totalPoints + args.amount,
      currentTier: balance.tier,
    });

    await ctx.db.insert("pointsTransactions", {
      userId: args.userId,
      type: "bonus",
      amount: args.amount,
      source: args.source,
      balanceBefore: balance.availablePoints,
      balanceAfter: balance.availablePoints + args.amount,
      metadata: args.metadata,
      createdAt: now,
    });

    return { success: true, newBalance: balance.availablePoints + args.amount };
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

/**
 * Phase 6.4: Automated Fraud Alerts
 * Runs periodically to flag unusual activity
 */
export const checkFraudAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    
    // Get recently flagged receipts
    const flaggedReceipts = await ctx.db
      .query("receipts")
      .withIndex("by_created", (q) => q.gt("createdAt", sixHoursAgo))
      .filter((q) => q.neq(q.field("fraudFlags"), undefined))
      .collect();

    if (flaggedReceipts.length > 10) {
      // Create admin alert
      await ctx.db.insert("adminAlerts", {
        alertType: "high_fraud_activity",
        message: `${flaggedReceipts.length} flagged receipts in last 6 hours`,
        severity: "warning",
        isResolved: false,
        createdAt: Date.now(),
      });
    }

    return { flaggedCount: flaggedReceipts.length };
  }
});

/**
 * Phase 6.3: Manual Points Adjustment (Admin)
 */
export const adjustUserPoints = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    reason: v.string(),
    adminNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
      
    if (!admin?.isAdmin) throw new Error("Unauthorized");

    const balance = await getOrCreatePointsBalance(ctx, args.userId);
    const now = Date.now();

    await ctx.db.patch(balance._id, {
      availablePoints: balance.availablePoints + args.amount,
      totalPoints: balance.totalPoints + Math.max(0, args.amount),
      updatedAt: now,
    });

    await ctx.db.insert("pointsTransactions", {
      userId: args.userId,
      type: args.amount > 0 ? "bonus" : "refund",
      amount: args.amount,
      source: "admin_adjustment",
      balanceBefore: balance.availablePoints,
      balanceAfter: balance.availablePoints + args.amount,
      metadata: {
        adminId: admin._id,
        reason: args.reason,
        notes: args.adminNotes,
      },
      createdAt: now,
    });

    return { success: true };
  },
});
