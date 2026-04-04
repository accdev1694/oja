import { v } from "convex/values";
import { mutation, internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { trackActivity } from "../lib/analytics";
import { requireAdmin, requireCurrentUser } from "../lib/auth";
import { normalizeEmailForTombstone } from "../lib/emailNormalizer";

/**
 * DEVELOPMENT ONLY: Reset a specific user for re-onboarding
 * Deletes all user data (pantry, lists, receipts) and resets onboarding status
 */
export const resetUserByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Verify caller is an admin
    const caller = await requireAdmin(ctx);

    // Audit log
    await ctx.db.insert("adminLogs", {
      adminUserId: caller._id,
      action: "reset_user_data",
      targetType: "users",
      targetId: args.email,
      details: `Full data reset for user email: ${args.email}`,
      createdAt: Date.now(),
    });

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    // Delete all pantry items for this user
    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const item of pantryItems) {
      await ctx.db.delete(item._id);
    }

    // Delete all shopping lists for this user
    const shoppingLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Delete all list items for each list
    for (const list of shoppingLists) {
      const listItems = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q) => q.eq("listId", list._id))
        .collect();
      for (const item of listItems) {
        await ctx.db.delete(item._id);
      }
      await ctx.db.delete(list._id);
    }

    // Delete all receipts for this user
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const receipt of receipts) {
      await ctx.db.delete(receipt._id);
    }

    // Delete price history for this user
    const priceHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const price of priceHistory) {
      await ctx.db.delete(price._id);
    }

    // Reset user onboarding status
    await ctx.db.patch(user._id, {
      onboardingComplete: false,
      cuisinePreferences: undefined,
      country: undefined,
      updatedAt: Date.now(),
    });

    return {
      email: args.email,
      deletedPantryItems: pantryItems.length,
      deletedShoppingLists: shoppingLists.length,
      deletedReceipts: receipts.length,
      deletedPriceHistory: priceHistory.length,
      message: "User reset for re-onboarding",
    };
  },
});

/**
 * Reset current user's data and re-trigger onboarding.
 * Keeps the user doc but wipes all associated data.
 */
export const resetMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);

    // Delete pantry items
    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    let counts = { pantryItems: 0, receipts: 0, priceHistory: 0, listPartners: 0, itemComments: 0, notifications: 0, achievements: 0, streaks: 0, weeklyChallenges: 0, nurtureMessages: 0, tipsDismissed: 0, supportTickets: 0, activityEvents: 0, listItems: 0, shoppingLists: 0, inviteCodes: 0 };
    for (const item of pantryItems) {
      await ctx.db.delete(item._id);
    }
    counts.pantryItems = pantryItems.length;

    // Delete receipts
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const receipt of receipts) {
      await ctx.db.delete(receipt._id);
    }
    counts.receipts = receipts.length;

    // Delete price history
    const priceHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const price of priceHistory) {
      await ctx.db.delete(price._id);
    }
    counts.priceHistory = priceHistory.length;

    // Delete list partners
    const listPartners = await ctx.db
      .query("listPartners")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const partner of listPartners) {
      await ctx.db.delete(partner._id);
    }
    counts.listPartners = listPartners.length;

    // Delete item comments
    const itemComments = await ctx.db
      .query("itemComments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const comment of itemComments) {
      await ctx.db.delete(comment._id);
    }
    counts.itemComments = itemComments.length;

    // Delete notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }
    counts.notifications = notifications.length;

    // Delete achievements
    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const achievement of achievements) {
      await ctx.db.delete(achievement._id);
    }
    counts.achievements = achievements.length;

    // Delete streaks
    const streaks = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const streak of streaks) {
      await ctx.db.delete(streak._id);
    }
    counts.streaks = streaks.length;

    // Delete weekly challenges
    const weeklyChallenges = await ctx.db
      .query("weeklyChallenges")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const challenge of weeklyChallenges) {
      await ctx.db.delete(challenge._id);
    }
    counts.weeklyChallenges = weeklyChallenges.length;

    // Delete nurture messages
    const nurtureMessages = await ctx.db
      .query("nurtureMessages")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const msg of nurtureMessages) {
      await ctx.db.delete(msg._id);
    }
    counts.nurtureMessages = nurtureMessages.length;

    // Delete tips dismissed
    const tipsDismissed = await ctx.db
      .query("tipsDismissed")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const tip of tipsDismissed) {
      await ctx.db.delete(tip._id);
    }
    counts.tipsDismissed = tipsDismissed.length;

    // Delete support tickets
    const supportTickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const ticket of supportTickets) {
      await ctx.db.delete(ticket._id);
    }
    counts.supportTickets = supportTickets.length;

    // Delete activity events
    const activityEvents = await ctx.db
      .query("activityEvents")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", user._id))
      .collect();
    for (const event of activityEvents) {
      await ctx.db.delete(event._id);
    }
    counts.activityEvents = activityEvents.length;

    // Delete list items via their lists (by_list index, not by_user)
    const shoppingLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    let deletedListItems = 0;
    for (const list of shoppingLists) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q) => q.eq("listId", list._id))
        .collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      deletedListItems += items.length;
    }
    counts.listItems = deletedListItems;

    // Delete shopping lists after their items
    for (const list of shoppingLists) {
      await ctx.db.delete(list._id);
    }
    counts.shoppingLists = shoppingLists.length;

    // Tables specifically EXCLUDED from RESET (but ARE deleted on full account deletion):
    // - "subscriptions" (Preserved on reset so user keeps their plan/trial)
    // - "pointsBalance", "pointsTransactions" (Preserves earned rewards)
    // - "loyaltyPoints", "pointTransactions" (Legacy/Duplicate rewards tables)
    // - "scanCredits", "scanCreditTransactions" (Preserves scan progress)
    // - "referralCodes" (Preserves referral identity)
    // - "aiUsage" (Preserves usage limits)
    // NOTE: internalDeleteUser() DOES delete subscriptions and all of the above.

    // inviteCodes uses createdBy, not userId — use by_createdBy index
    const inviteCodes = await ctx.db
      .query("inviteCodes")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", user._id))
      .collect();
    for (const code of inviteCodes) {
      await ctx.db.delete(code._id);
    }
    counts.inviteCodes = inviteCodes.length;

    // Reset user doc
    await ctx.db.patch(user._id, {
      onboardingComplete: false,
      cuisinePreferences: undefined,
      country: undefined,
      updatedAt: Date.now(),
    });

    return { message: "Account reset — you'll see onboarding next login", counts };
  },
});

/**
 * Permanently delete current user and ALL associated data.
 * After this, the Convex user doc is gone. Clerk account remains (handle separately on client).
 * Returns clerkId and email so the client can handle Clerk deletion and surface errors.
 */
export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);

    // Capture identity info before purge (needed by client for Clerk cleanup)
    const clerkId = user.clerkId;
    const email = user.email;

    // 1. Collect receipt image storage IDs for async cleanup
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const storageIds = receipts
      .map((r) => r.imageStorageId)
      .filter((id): id is string => !!id);

    // 2. Perform full data purge (purges activityEvents among other tables)
    await ctx.runMutation(internal.users.internalDeleteUser, { userId: user._id });

    // 3. Log deletion AFTER purge so the forensic record survives
    // (inserting before the purge is a no-op — internalDeleteUser wipes activityEvents)
    await trackActivity(ctx, user._id, "account_deleted", {
      reason: "user_request",
      ...(email ? { email } : {}),
      ...(clerkId ? { clerkId } : {}),
    });

    // 4. Schedule async storage cleanup for receipt images
    if (storageIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.users.cleanupUserStorage, { storageIds });
    }

    return { message: "Account permanently deleted", clerkId: clerkId ?? "", email: email ?? "" };
  },
});

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
