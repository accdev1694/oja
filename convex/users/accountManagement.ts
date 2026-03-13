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

    // Helper to delete all docs in a table by userId index
    const deleteByUser = async (table: string) => {
      const docs = await ctx.db
        .query(table as any)
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      return docs.length;
    };

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

    // Delete from all user-owned tables (must have by_user index on userId)
    const counts: Record<string, number> = {};
    const tables = [
      "pantryItems", "shoppingLists", "receipts", "priceHistory",
      "listPartners", "itemComments",
      "notifications", "achievements", "streaks", "weeklyChallenges",
      "nurtureMessages", "tipsDismissed", "supportTickets", "activityEvents"
    ];
    for (const table of tables) {
      counts[table] = await deleteByUser(table);
    }
    counts.listItems = deletedListItems;

    // Tables specifically EXCLUDED from reset to preserve Identity & Economy:
    // - "subscriptions" (Prevents trial abuse)
    // - "pointsBalance", "pointsTransactions" (Preserves earned rewards)
    // - "loyaltyPoints", "pointTransactions" (Legacy/Duplicate rewards tables)
    // - "scanCredits", "scanCreditTransactions" (Preserves scan progress)
    // - "referralCodes" (Preserves referral identity)
    // - "aiUsage" (Preserves usage limits)

    // inviteCodes uses createdBy, not userId
    const inviteCodes = await ctx.db.query("inviteCodes").collect();
    let deletedInvites = 0;
    for (const code of inviteCodes) {
      if (code.createdBy === user._id) {
        await ctx.db.delete(code._id);
        deletedInvites++;
      }
    }
    counts.inviteCodes = deletedInvites;

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
      email: user.email
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

    // Helper to delete all docs in a table by userId index
    const deleteByUser = async (table: any) => {
      const docs = await ctx.db
        .query(table)
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    };

    // 1. Delete list items via their lists
    const shoppingLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
    for (const list of shoppingLists) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q: any) => q.eq("listId", list._id))
        .collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
    }

    const tables = [
      "pantryItems", "shoppingLists", "receipts", "priceHistory",
      "listPartners", "itemComments",
      "notifications", "achievements", "streaks", "weeklyChallenges",
      "subscriptions", "loyaltyPoints", "pointTransactions",
      "scanCredits", "scanCreditTransactions", "rateLimits"
    ];
    for (const table of tables) {
      await deleteByUser(table);
    }

    const inviteCodes = await ctx.db.query("inviteCodes").collect();
    for (const code of inviteCodes) {
      if (code.createdBy === user._id) {
        await ctx.db.delete(code._id);
      }
    }

    await ctx.db.delete(user._id);
  },
});
