import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getTierFromScans, getNextTierInfo, getMaxEarningScans, getPointsPerScan, checkFeatureAccess, getStartOfMonth } from "../lib/featureGating";

/**
 * Helper to get or initialize a points balance (for mutations only)
 */
export async function getOrCreatePointsBalance(ctx: any, userId: any) {
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

/**
 * Read-only helper to get points balance (for queries)
 * Returns null if balance doesn't exist
 */
export async function getPointsBalanceReadOnly(ctx: any, userId: any) {
  const balance = await ctx.db
    .query("pointsBalance")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  return balance;
}

export function getWeekNumber(timestamp: number) {
  const d = new Date(timestamp);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo + (d.getUTCFullYear() * 100); // Year + week to be unique across years
}

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
