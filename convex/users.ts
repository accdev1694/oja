import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get the current user from the database
 * Creates a new user if one doesn't exist for this Clerk ID
 */
export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "User",
      email: identity.email,
      avatarUrl: identity.pictureUrl,
      currency: "GBP", // Default for UK
      onboardingComplete: false,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(userId);
  },
});

/**
 * Get current user (read-only, doesn't create)
 */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

/**
 * Get user by Clerk ID
 */
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

/**
 * Update user profile
 */
export const update = mutation({
  args: {
    name: v.optional(v.string()),
    defaultBudget: v.optional(v.number()),
    currency: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        notifications: v.boolean(),
        haptics: v.boolean(),
        theme: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.defaultBudget !== undefined) updates.defaultBudget = args.defaultBudget;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.preferences !== undefined) updates.preferences = args.preferences;

    await ctx.db.patch(user._id, updates);
    return await ctx.db.get(user._id);
  },
});

/**
 * Set onboarding data (name, country, cuisinePreferences)
 */
export const setOnboardingData = mutation({
  args: {
    name: v.string(),
    country: v.string(),
    cuisinePreferences: v.array(v.string()),
    defaultBudget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      name: args.name,
      country: args.country,
      cuisinePreferences: args.cuisinePreferences,
      defaultBudget: args.defaultBudget,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(user._id);
  },
});

/**
 * Mark onboarding as complete
 */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      onboardingComplete: true,
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * DEVELOPMENT ONLY: Clear all users and pantry items
 */
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all users
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    // Delete all pantry items
    const pantryItems = await ctx.db.query("pantryItems").collect();
    for (const item of pantryItems) {
      await ctx.db.delete(item._id);
    }

    return { deletedUsers: users.length, deletedPantryItems: pantryItems.length };
  },
});

/**
 * DEVELOPMENT ONLY: List all users (for debugging)
 */
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      id: u._id,
      email: u.email,
      name: u.name,
      onboardingComplete: u.onboardingComplete,
    }));
  },
});

/**
 * DEVELOPMENT ONLY: Reset a specific user for re-onboarding
 * Deletes all user data (pantry, lists, receipts) and resets onboarding status
 */
export const resetUserByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

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
      "subscriptions", "loyaltyPoints", "pointTransactions",
      "scanCredits", "scanCreditTransactions",
    ];
    for (const table of tables) {
      counts[table] = await deleteByUser(table);
    }
    counts.listItems = deletedListItems;

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

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

    // Delete list items via their lists
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

    // Delete from all user-owned tables (must have by_user index on userId)
    const tables = [
      "pantryItems", "shoppingLists", "receipts", "priceHistory",
      "listPartners", "itemComments",
      "notifications", "achievements", "streaks", "weeklyChallenges",
      "subscriptions", "loyaltyPoints", "pointTransactions",
      "scanCredits", "scanCreditTransactions",
    ];
    for (const table of tables) {
      await deleteByUser(table);
    }

    // inviteCodes uses createdBy, not userId
    const inviteCodes = await ctx.db.query("inviteCodes").collect();
    for (const code of inviteCodes) {
      if (code.createdBy === user._id) {
        await ctx.db.delete(code._id);
      }
    }

    // Delete user doc itself
    await ctx.db.delete(user._id);

    return { message: "Account permanently deleted" };
  },
});

