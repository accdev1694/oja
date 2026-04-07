import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { getTierFromScans } from "../lib/featureGating";

// =============================================
// Unified Scan Rewards — Receipt scans earn tier progress + credits
// =============================================

/**
 * @deprecated These stub functions are kept for API compatibility but do nothing.
 * Scan credits have been migrated to the unified points system.
 * Use api.points.getPointsBalance and api.points.earnPoints instead.
 */
export const getScanCredits = query({
  args: {},
  handler: async () => {
    // H4 fix: Log deprecation warning instead of silently returning null
    console.warn("[DEPRECATED] getScanCredits is a stub. Use api.points.getPointsBalance instead.");
    return null;
  },
});

/**
 * @deprecated Stub function - scan credits migrated to unified points system.
 */
export const earnScanCredit = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async () => {
    // H4 fix: Log deprecation warning instead of silently returning null
    console.warn("[DEPRECATED] earnScanCredit is a stub. Use api.points.earnPoints instead.");
    return null;
  },
});

// =============================================================================
// CRON: Expire stale trials — runs daily, flips trial → expired
// =============================================================================

export const expireTrials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const trialSubs = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "trial"))
      .collect();

    let expired = 0;
    for (const sub of trialSubs) {
      if (sub.trialEndsAt && sub.trialEndsAt <= now) {
        await ctx.db.patch(sub._id, {
          status: "expired",
          updatedAt: now,
        });
        expired++;
      }
    }

    return { expired };
  },
});

// =============================================================================
// DATA MIGRATION — run once after deploy from Convex dashboard
// =============================================================================

/**
 * Backfill `lifetimeScans` and `tier` on existing scanCredits records.
 *
 * For each user with a scanCredits record:
 * 1. Count scanCreditTransactions for that user → lifetime scans
 * 2. Also count pointTransactions where source = "receipt_scan" (pre-credit era)
 * 3. Deduplicate by receipt (don't double-count)
 * 4. Set lifetimeScans and compute tier on latest scanCredits record
 */
export const migrateToUnifiedRewards = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allCredits = await ctx.db
      .query("scanCredits")
      .withIndex("by_user")
      .collect();
    const userIds = [...new Set(allCredits.map((c) => c.userId))];

    let migrated = 0;

    for (const userId of userIds) {
      // Count scan credit transactions
      const scanTxns = await ctx.db
        .query("scanCreditTransactions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      const receiptIds = new Set(
        scanTxns.map((t) => t.receiptId.toString()).filter(Boolean)
      );

      // Count points transactions from receipt scans (pre-credit era)
      const pointsTxns = await ctx.db
        .query("pointsTransactions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const pt of pointsTxns) {
        if (pt.source === "receipt_scan" && pt.receiptId) {
          const rid = pt.receiptId.toString();
          if (!receiptIds.has(rid)) {
            receiptIds.add(rid);
          }
        }
      }

      const lifetimeScans = receiptIds.size;
      const tierConfig = getTierFromScans(lifetimeScans);

      // Update latest scanCredits record for this user
      const latestCredit = allCredits
        .filter((c) => c.userId === userId)
        .sort(
          (a, b) => (b._creationTime || 0) - (a._creationTime || 0)
        )[0];

      if (latestCredit) {
        await ctx.db.patch(latestCredit._id, {
          lifetimeScans,
          tier: tierConfig.tier,
          updatedAt: Date.now(),
        });
        migrated++;
      }
    }

    return { migrated, totalUsers: userIds.length };
  },
});
