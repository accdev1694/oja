import { v } from "convex/values";
import { internalMutation, internalAction } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { normalizeEmailForTombstone } from "../lib/emailNormalizer";

/**
 * INTERNAL: Full data purge for a user.
 * Shared by user.deleted webhook and manual deleteMyAccount.
 *
 * COMPLETE TABLE AUDIT (last updated: 2026-03-30)
 * Every user-linked table must be cleaned here. When adding new tables with
 * userId fields, add deletion logic below.
 *
 * Admin tables (adminLogs, adminSessions, adminDashboardPreferences, savedFilters,
 * userRoles, adminRateLimits, ticketMessages, impersonationTokens) are intentionally
 * PRESERVED for audit trail integrity.
 *
 * Community/shared tables (currentPrices.lastReportedBy, itemMappings.lastConfirmedBy,
 * itemVariants) are global data and intentionally NOT purged.
 */
export const internalDeleteUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    // Helper to delete all records from a table using a by_user-style index.
    // Uses `never` casts because Convex's query() expects literal table name types,
    // but this helper is called with 20+ different tables and the alternative is
    // duplicating the same 5-line pattern for each one.
    const purgeByUser = async (table: string, index: string) => {
      const records = await (ctx.db
        .query(table as never)
        .withIndex(index as never, ((q: { eq: (field: string, value: unknown) => unknown }) =>
          q.eq("userId", user._id)) as never) as { collect: () => Promise<Array<{ _id: string }>> })
        .collect();
      for (const record of records) {
        await ctx.db.delete(record._id as never);
      }
      return records.length;
    };

    // ── Core data ────────────────────────────────────────────────────────────
    await purgeByUser("pantryItems", "by_user");
    await purgeByUser("receipts", "by_user");
    await purgeByUser("priceHistory", "by_user");
    await purgeByUser("priceHistoryMonthly", "by_user_month");

    // ── List items via their lists (by_list, not by_user) ────────────────────
    const shoppingLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const list of shoppingLists) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q) => q.eq("listId", list._id))
        .collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      // Also clean list messages for each list
      const messages = await ctx.db
        .query("listMessages")
        .withIndex("by_list", (q) => q.eq("listId", list._id))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }
    }
    for (const list of shoppingLists) {
      await ctx.db.delete(list._id);
    }

    // ── Collaboration ────────────────────────────────────────────────────────
    await purgeByUser("listPartners", "by_user");
    await purgeByUser("itemComments", "by_user");
    // Invite codes use createdBy, not userId — use the new by_createdBy index
    const inviteCodes = await ctx.db
      .query("inviteCodes")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", user._id))
      .collect();
    for (const code of inviteCodes) {
      await ctx.db.delete(code._id);
    }

    // ── Receipts & fraud ─────────────────────────────────────────────────────
    const receiptHashes = await ctx.db
      .query("receiptHashes")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id))
      .collect();
    for (const hash of receiptHashes) {
      await ctx.db.delete(hash._id);
    }
    await purgeByUser("pendingItemMatches", "by_user");

    // ── Content & messaging ──────────────────────────────────────────────────
    await purgeByUser("notifications", "by_user");
    await purgeByUser("nurtureMessages", "by_user");
    await purgeByUser("tipsDismissed", "by_user");
    await purgeByUser("tutorialHints", "by_user");
    await purgeByUser("supportTickets", "by_user");

    // ── Gamification ─────────────────────────────────────────────────────────
    await purgeByUser("achievements", "by_user");
    await purgeByUser("streaks", "by_user");
    await purgeByUser("weeklyChallenges", "by_user");

    // ── Points & rewards (ALL deleted on full account deletion) ──────────────
    await purgeByUser("pointsBalance", "by_user");
    await purgeByUser("pointsTransactions", "by_user");
    await purgeByUser("pointsReservations", "by_user");
    await purgeByUser("loyaltyPoints", "by_user");     // Legacy
    await purgeByUser("pointTransactions", "by_user");  // Legacy
    await purgeByUser("referralCodes", "by_user");

    // ── Subscriptions & billing ──────────────────────────────────────────────
    // Capture trial timing BEFORE purging (needed for tombstone below)
    const existingSub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    await purgeByUser("subscriptions", "by_user");
    await purgeByUser("scanCredits", "by_user");        // Legacy
    await purgeByUser("scanCreditTransactions", "by_user"); // Legacy
    await purgeByUser("rateLimits", "by_user_feature");

    // ── Analytics & experiments ───────────────────────────────────────────────
    const activityEvents = await ctx.db
      .query("activityEvents")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", user._id))
      .collect();
    for (const event of activityEvents) {
      await ctx.db.delete(event._id);
    }
    await purgeByUser("funnelEvents", "by_user");
    await purgeByUser("userSegments", "by_user");
    await purgeByUser("experimentAssignments", "by_user");
    await purgeByUser("experimentEvents", "by_user");
    await purgeByUser("aiUsage", "by_user");
    await purgeByUser("userTags", "by_user");

    // ── Trial abuse prevention: record tombstone BEFORE deleting user doc ──
    // Lets completeOnboarding and startFreeTrial detect returning users.
    // Uses normalized email (strips Gmail aliases/dots) to prevent easy bypasses.
    // Falls back to clerkId-only tombstone if email is missing (social auth edge case).
    //
    // Trial timing was captured in existingSub above (before subscription purge).
    // Store it so returning users resume their remaining trial time.
    const tombstoneEmail = user.email
      ? normalizeEmailForTombstone(user.email)
      : `__no_email__${user.clerkId}`;
    await ctx.db.insert("deletedAccounts", {
      email: tombstoneEmail,
      clerkId: user.clerkId,
      trialUsed: true,
      trialStartedAt: existingSub?.currentPeriodStart,
      trialEndsAt: existingSub?.trialEndsAt,
      deletedAt: Date.now(),
    });

    // ── Finally, delete the user doc ─────────────────────────────────────────
    await ctx.db.delete(user._id);
  },
});

/**
 * INTERNAL: Async cleanup of receipt image storage after account deletion.
 * Scheduled by deleteMyAccount since storage.delete is not available in mutations.
 */
export const cleanupUserStorage = internalAction({
  args: { storageIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    let deleted = 0;
    for (const storageId of args.storageIds) {
      try {
        await ctx.storage.delete(storageId as Id<"_storage">);
        deleted++;
      } catch (e) {
        console.error(`Failed to delete storage ${storageId}:`, e);
      }
    }
    console.log(`Storage cleanup complete: ${deleted}/${args.storageIds.length} files deleted`);
  },
});
