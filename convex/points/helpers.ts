import { internal } from "../_generated/api";
import type { Id, Doc, DataModel } from "../_generated/dataModel";
import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { getTierFromScans, getNextTierInfo, getMaxEarningScans, getPointsPerScan, checkFeatureAccess, getStartOfMonth } from "../lib/featureGating";

type MutationCtx = GenericMutationCtx<DataModel>;
type QueryCtx = GenericQueryCtx<DataModel>;

/**
 * Helper to get or initialize a points balance (for mutations only)
 */
export async function getOrCreatePointsBalance(ctx: MutationCtx, userId: Id<"users">): Promise<Doc<"pointsBalance">> {
  let balance = await ctx.db
    .query("pointsBalance")
    .withIndex("by_user", (q) => q.eq("userId", userId))
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
    const newBalance = await ctx.db.get(balanceId);
    if (!newBalance) {
      throw new Error("Failed to create points balance");
    }
    balance = newBalance;
  } else {
    // Check if we need to reset the month
    const currentMonthStart = getStartOfMonth(Date.now());
    if (balance.monthStart < currentMonthStart) {
      await ctx.db.patch(balance._id, {
        earningScansThisMonth: 0,
        monthStart: currentMonthStart,
        updatedAt: Date.now(),
      });
      // Re-fetch to ensure we have post-patch state (avoids month-boundary race)
      const refreshed = await ctx.db.get(balance._id);
      if (!refreshed) throw new Error("Balance disappeared after month reset");
      balance = refreshed;
    }
  }

  return balance;
}

/**
 * Read-only helper to get points balance (for queries)
 * Returns null if balance doesn't exist
 */
export async function getPointsBalanceReadOnly(ctx: QueryCtx, userId: Id<"users">) {
  const balance = await ctx.db
    .query("pointsBalance")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  return balance;
}

/**
 * Returns a sequential week number that handles year boundaries correctly.
 * Uses ISO 8601 week numbering, then converts to a sequential count
 * so that Week 52/2025 + 1 === Week 1/2026.
 */
export function getWeekNumber(timestamp: number) {
  const d = new Date(timestamp);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  // Use sequential weeks from epoch to avoid year-boundary breaks
  // (e.g. 202552 + 1 !== 202601, but sequential numbering is always +1)
  const epochStart = new Date(Date.UTC(2020, 0, 1));
  const daysSinceEpoch = Math.floor((d.getTime() - epochStart.getTime()) / 86400000);
  return Math.floor(daysSinceEpoch / 7);
}

export async function processEarnPoints(ctx: MutationCtx, userId: Id<"users">, receiptId: Id<"receipts">) {
  // Idempotency: check if we already awarded points for this receipt
  const existingEarn = await ctx.db
    .query("pointsTransactions")
    .withIndex("by_receipt_and_type", (q) => q.eq("receiptId", receiptId).eq("type", "earn"))
    .first();
  if (existingEarn) {
    return { earned: false, reason: "already_earned" };
  }

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
    .withIndex("by_active", (q) => q.eq("isActive", true))
    .filter((q) => q.and(
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
    } else if (activeEvent.type === "tier_boost") {
      // Tier boost: temporarily treat user as one tier higher for this scan
      const boostedProgress = balance.tierProgress + (activeEvent.multiplier ? Math.round(activeEvent.multiplier) : 50);
      const boostedTier = getTierFromScans(boostedProgress);
      const boostedPoints = getPointsPerScan(boostedTier, isPremium);
      if (boostedPoints > pointsAmount) {
        eventBonus = boostedPoints - pointsAmount;
        pointsAmount = boostedPoints;
      }
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

  // Create transaction for base points (excluding event bonus — itemized separately)
  const baseAmount = pointsAmount - eventBonus;
  let runningBalance = balance.availablePoints;
  await ctx.db.insert("pointsTransactions", {
    userId: userId,
    type: "earn",
    amount: baseAmount,
    source: "receipt_scan",
    receiptId: receiptId,
    balanceBefore: runningBalance,
    balanceAfter: runningBalance + baseAmount,
    metadata: { tierAtEarn: currentTier.tier },
    createdAt: now,
  });
  runningBalance += baseAmount;

  // Create separate transaction for seasonal event bonus if applicable
  if (eventBonus > 0 && activeEvent) {
    await ctx.db.insert("pointsTransactions", {
      userId: userId,
      type: "bonus",
      amount: eventBonus,
      source: `seasonal_event_${activeEvent.name}`,
      receiptId: receiptId,
      balanceBefore: runningBalance,
      balanceAfter: runningBalance + eventBonus,
      metadata: { eventId: activeEvent._id, eventType: activeEvent.type },
      createdAt: now,
    });
    runningBalance += eventBonus;
  }

  // Create transaction for streak bonus if applicable
  if (streakBonus > 0) {
    await ctx.db.insert("pointsTransactions", {
      userId: userId,
      type: "bonus",
      amount: streakBonus,
      source: `streak_bonus_${newStreakCount}_weeks`,
      receiptId: receiptId,
      balanceBefore: runningBalance,
      balanceAfter: runningBalance + streakBonus,
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

export async function processExpirePoints(ctx: MutationCtx, userId: Id<"users">, points: number, reason: string) {
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
