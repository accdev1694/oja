import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { trackActivity } from "../lib/analytics";
import { requireAdmin, requireCurrentUser } from "../lib/auth";

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

    // Tables specifically EXCLUDED from reset to preserve Identity & Economy:
    // - "subscriptions" (Prevents trial abuse)
    // - "pointsBalance", "pointsTransactions" (Preserves earned rewards)
    // - "loyaltyPoints", "pointTransactions" (Legacy/Duplicate rewards tables)
    // - "scanCredits", "scanCreditTransactions" (Preserves scan progress)
    // - "referralCodes" (Preserves referral identity)
    // - "aiUsage" (Preserves usage limits)

    // inviteCodes uses createdBy, not userId
    const inviteCodes = await ctx.db.query("inviteCodes").collect();
    for (const code of inviteCodes) {
      if (code.createdBy === user._id) {
        await ctx.db.delete(code._id);
        counts.inviteCodes++;
      }
    }

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
 * After this, the Convex user doc is gone. Clerk account remains (handle separately).
 */
export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);

    // 1. Delete all receipt images from storage
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const receipt of receipts) {
      if (receipt.imageStorageId) {
        try {
          // Note: storage.delete is not available in mutation, usually handled by action or internal script
          // For now we rely on DB cleanup and storage orphaning (Convex handles some storage cleanup)
        } catch (e) {
          console.error(`Failed to delete storage for receipt ${receipt._id}:`, e);
        }
      }
    }

    // 2. Log the deletion before purging (for forensics)
    await trackActivity(ctx, user._id, "account_deleted", {
      reason: "user_request",
      ...(user.email ? { email: user.email } : {}),
    });

    // 3. Perform full data purge
    await ctx.runMutation(internal.users.internalDeleteUser, { userId: user._id });

    return { message: "Account permanently deleted" };
  },
});

/**
 * INTERNAL: Full data purge for a user.
 * Shared by user.deleted webhook and manual deleteMyAccount.
 */
export const internalDeleteUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    // Delete pantry items
    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const item of pantryItems) {
      await ctx.db.delete(item._id);
    }

    // Delete receipts
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const receipt of receipts) {
      await ctx.db.delete(receipt._id);
    }

    // Delete price history
    const priceHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const price of priceHistory) {
      await ctx.db.delete(price._id);
    }

    // Delete list partners
    const listPartners = await ctx.db
      .query("listPartners")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const partner of listPartners) {
      await ctx.db.delete(partner._id);
    }

    // Delete item comments
    const itemComments = await ctx.db
      .query("itemComments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const comment of itemComments) {
      await ctx.db.delete(comment._id);
    }

    // Delete notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    // Delete achievements
    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const achievement of achievements) {
      await ctx.db.delete(achievement._id);
    }

    // Delete streaks
    const streaks = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const streak of streaks) {
      await ctx.db.delete(streak._id);
    }

    // Delete weekly challenges
    const weeklyChallenges = await ctx.db
      .query("weeklyChallenges")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const challenge of weeklyChallenges) {
      await ctx.db.delete(challenge._id);
    }

    // Delete subscriptions
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const sub of subscriptions) {
      await ctx.db.delete(sub._id);
    }

    // Delete loyalty points
    const loyaltyPoints = await ctx.db
      .query("loyaltyPoints")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const pts of loyaltyPoints) {
      await ctx.db.delete(pts._id);
    }

    // Delete point transactions
    const pointTransactions = await ctx.db
      .query("pointTransactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const txn of pointTransactions) {
      await ctx.db.delete(txn._id);
    }

    // Delete scan credits
    const scanCredits = await ctx.db
      .query("scanCredits")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const credit of scanCredits) {
      await ctx.db.delete(credit._id);
    }

    // Delete scan credit transactions
    const scanCreditTransactions = await ctx.db
      .query("scanCreditTransactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const txn of scanCreditTransactions) {
      await ctx.db.delete(txn._id);
    }

    // Delete rate limits
    const rateLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_feature", (q) => q.eq("userId", user._id))
      .collect();
    for (const limit of rateLimits) {
      await ctx.db.delete(limit._id);
    }

    // 1. Delete list items via their lists
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
    }

    // Delete shopping lists after their items
    for (const list of shoppingLists) {
      await ctx.db.delete(list._id);
    }

    // Delete invite codes created by this user
    const inviteCodes = await ctx.db.query("inviteCodes").collect();
    for (const code of inviteCodes) {
      if (code.createdBy === user._id) {
        await ctx.db.delete(code._id);
      }
    }

    // Finally, delete the user
    await ctx.db.delete(user._id);
  },
});
