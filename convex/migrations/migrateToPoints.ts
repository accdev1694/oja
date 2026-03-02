import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getTierFromScans, getStartOfMonth } from "../lib/featureGating";

/**
 * Migration: Migrate legacy scanCredits and loyaltyPoints to the new Points system.
 * 
 * Logic:
 * 1. Identify all users.
 * 2. For each user, check for an existing pointsBalance.
 * 3. If no balance exists, create one:
 *    - availablePoints = (scanCredits.creditsEarned * 1000) + (loyaltyPoints.points)
 *    - totalPoints = availablePoints
 *    - tierProgress = scanCredits.lifetimeScans
 *    - tier = calculated from tierProgress
 * 4. Create an initial transaction record for the migration.
 */
export const run = internalMutation({
  args: { 
    batchSize: v.optional(v.number()),
    cursor: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 50;
    
    // Get users who don't have a pointsBalance yet
    const users = await ctx.db.query("users").collect();
    let migratedCount = 0;
    const now = Date.now();

    for (const user of users) {
      // Check if user already has a balance
      const existingBalance = await ctx.db
        .query("pointsBalance")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (existingBalance) continue;

      // 1. Get legacy scan credits
      const legacyCredit = await ctx.db
        .query("scanCredits")
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .order("desc")
        .first();

      // 2. Get legacy loyalty points
      const legacyLoyalty = await ctx.db
        .query("loyaltyPoints")
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .first();

      const lifetimeScans = legacyCredit?.lifetimeScans ?? 0;
      const tierInfo = getTierFromScans(lifetimeScans);
      
      // Calculate initial points
      const pointsFromCredits = Math.round((legacyCredit?.creditsEarned ?? 0) * 1000);
      const pointsFromLoyalty = legacyLoyalty?.points ?? 0;
      const initialPoints = pointsFromCredits + pointsFromLoyalty;

      // 3. Create new points balance
      await ctx.db.insert("pointsBalance", {
        userId: user._id,
        totalPoints: initialPoints,
        availablePoints: initialPoints,
        pendingPoints: 0,
        pointsUsed: legacyLoyalty?.points === undefined ? 0 : (legacyLoyalty.lifetimePoints - legacyLoyalty.points),
        tier: tierInfo.tier,
        tierProgress: lifetimeScans,
        earningScansThisMonth: 0,
        monthStart: getStartOfMonth(now),
        lastEarnedAt: legacyCredit?.updatedAt ?? 0,
        streakCount: 0,
        lastStreakScan: 0,
        createdAt: now,
        updatedAt: now,
      });

      // 4. Create migration transaction
      if (initialPoints > 0) {
        await ctx.db.insert("pointsTransactions", {
          userId: user._id,
          type: "bonus",
          amount: initialPoints,
          source: "system_migration",
          balanceBefore: 0,
          balanceAfter: initialPoints,
          metadata: { 
            migratedFromCredits: pointsFromCredits,
            migratedFromLoyalty: pointsFromLoyalty
          },
          createdAt: now,
        });
      }

      migratedCount++;
      if (migratedCount >= batchSize) break;
    }

    return { migratedCount, status: migratedCount === 0 ? "complete" : "in_progress" };
  },
});
