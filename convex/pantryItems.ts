import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Bulk create pantry items for a user
 * Used during onboarding to seed the pantry
 */
export const bulkCreate = mutation({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        category: v.string(),
        stockLevel: v.union(
          v.literal("stocked"),
          v.literal("good"),
          v.literal("low"),
          v.literal("out")
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    // Insert all items
    const promises = args.items.map((item) =>
      ctx.db.insert("pantryItems", {
        userId: user._id,
        name: item.name,
        category: item.category,
        stockLevel: item.stockLevel,
        autoAddToList: false, // Default to not auto-adding
        createdAt: now,
        updatedAt: now,
      })
    );

    await Promise.all(promises);

    return { count: promises.length };
  },
});

/**
 * Get all pantry items for the current user
 */
export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
