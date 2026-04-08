import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireAdmin } from "../admin/helpers";
import { getOrCreatePointsBalance, processExpirePoints } from "./helpers";

/**
 * Cron job: Expire points older than 12 months (H5 fix: batched processing)
 * Processes in batches of 500 to avoid memory issues at scale.
 * REMAINING-3 fix: Self-schedules next batch if more data exists.
 */
export const expireOldPoints = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    const BATCH_SIZE = 500;

    // H5 fix: Process in batches to avoid unbounded memory usage
    const oldTransactions = await ctx.db
      .query("pointsTransactions")
      .withIndex("by_created", (q) => q.lt("createdAt", oneYearAgo))
      .take(BATCH_SIZE);

    // Filter for "earn" types (since the index doesn't include type)
    const earnTransactions = oldTransactions.filter(tx => tx.type === "earn" || tx.type === "bonus");

    if (earnTransactions.length === 0) {
      return { usersAffected: 0, totalExpired: 0, hasMore: false, batchesProcessed: 1 };
    }

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
      try {
        // L4 fix: Error isolation - one user's failure doesn't block others
        const balance = await ctx.db
          .query("pointsBalance")
          .withIndex("by_user", (q) => q.eq("userId", userId as never))
          .first();

        if (balance && balance.availablePoints > 0) {
          const toExpire = Math.min(balance.availablePoints, points);
          if (toExpire > 0) {
            await processExpirePoints(ctx, balance.userId, toExpire, "12_month_expiration");
            usersAffected++;
            totalExpired += toExpire;
          }
        }
      } catch (error) {
        console.error(`[expireOldPoints] Failed to expire points for user ${userId}:`, error);
        // Continue processing other users
      }
    }

    // Check if there may be more transactions to process
    const hasMore = oldTransactions.length === BATCH_SIZE;

    // REMAINING-3 fix: Self-schedule next batch if more data exists
    if (hasMore) {
      // Schedule next batch after 1 second delay to avoid overwhelming the system
      await ctx.scheduler.runAfter(1000, internal.points.expireOldPoints, {});
      console.log(`[expireOldPoints] Scheduled next batch. This batch: ${usersAffected} users, ${totalExpired} points`);
    }

    return { usersAffected, totalExpired, hasMore, batchesProcessed: 1 };
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
    const admin = await requireAdmin(ctx);

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
