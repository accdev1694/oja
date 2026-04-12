import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
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
    let totalPruned = 0;
    let failed = 0;
    for (const sub of trialSubs) {
      if (!sub.trialEndsAt || sub.trialEndsAt > now) continue;

      // Isolate per-user work: a single bad subscription (e.g. orphaned user,
      // broken pantry ref) must not halt expiry for every other trial user.
      try {
        await ctx.db.patch(sub._id, {
          status: "expired",
          updatedAt: now,
        });
        expired++;

        // Prune pantry down to free-tier cap and notify the user.
        const pruneResult = await ctx.runMutation(
          internal.pantry.lifecycle.prunePantryOnDowngrade,
          { userId: sub.userId }
        );
        totalPruned += pruneResult.archived;

        if (pruneResult.archived > 0) {
          await ctx.db.insert("notifications", {
            userId: sub.userId,
            type: "trial_expired_prune",
            title: "Trial ended — items archived",
            body: `Your 7-day Premium trial ended. We archived ${pruneResult.archived} pantry ${pruneResult.archived === 1 ? "item" : "items"} to fit the free plan's ${pruneResult.cap}-item limit. Upgrade to Premium to restore them instantly.`,
            data: {
              archived: pruneResult.archived,
              cap: pruneResult.cap,
              deeplink: "/subscription",
            },
            read: false,
            createdAt: now,
          });
        } else {
          await ctx.db.insert("notifications", {
            userId: sub.userId,
            type: "trial_expired",
            title: "Trial ended",
            body: "Your 7-day Premium trial ended. Upgrade to keep unlimited pantry items, voice assistant, and all Premium features.",
            data: { deeplink: "/subscription" },
            read: false,
            createdAt: now,
          });
        }
      } catch (err) {
        failed++;
        console.error(`[expireTrials] failed for sub ${sub._id} (user ${sub.userId}):`, err);
      }
    }

    return { expired, totalPruned, failed };
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
