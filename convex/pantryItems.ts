import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getIconForItem } from "./iconMapping";

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

    // Insert all items with icons
    const promises = args.items.map((item) =>
      ctx.db.insert("pantryItems", {
        userId: user._id,
        name: item.name,
        category: item.category,
        icon: getIconForItem(item.name, item.category),
        stockLevel: item.stockLevel,
        autoAddToList: false,
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

/**
 * Get a single pantry item by ID
 */
export const getById = query({
  args: { id: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      return null;
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || item.userId !== user._id) {
      return null;
    }

    return item;
  },
});

/**
 * Create a new pantry item
 */
export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    stockLevel: v.union(
      v.literal("stocked"),
      v.literal("good"),
      v.literal("low"),
      v.literal("out")
    ),
    autoAddToList: v.optional(v.boolean()),
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

    const now = Date.now();

    const itemId = await ctx.db.insert("pantryItems", {
      userId: user._id,
      name: args.name,
      category: args.category,
      icon: getIconForItem(args.name, args.category),
      stockLevel: args.stockLevel,
      autoAddToList: args.autoAddToList ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return itemId;
  },
});

/**
 * Update a pantry item
 */
export const update = mutation({
  args: {
    id: v.id("pantryItems"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    stockLevel: v.optional(
      v.union(
        v.literal("stocked"),
        v.literal("good"),
        v.literal("low"),
        v.literal("out")
      )
    ),
    autoAddToList: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || item.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.category !== undefined) updates.category = args.category;
    if (args.stockLevel !== undefined) updates.stockLevel = args.stockLevel;
    if (args.autoAddToList !== undefined) updates.autoAddToList = args.autoAddToList;

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

/**
 * Delete a pantry item
 */
export const remove = mutation({
  args: { id: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || item.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Update just the stock level of an item (optimized for frequent updates)
 */
export const updateStockLevel = mutation({
  args: {
    id: v.id("pantryItems"),
    stockLevel: v.union(
      v.literal("stocked"),
      v.literal("good"),
      v.literal("low"),
      v.literal("out")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || item.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      stockLevel: args.stockLevel,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Migrate existing items to have icons
 * Re-assigns icons to ALL items using the mapping
 */
export const migrateIcons = mutation({
  args: {
    forceAll: v.optional(v.boolean()),
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

    // Get all items for this user
    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let updated = 0;
    const debugInfo: Array<{ name: string; category: string; oldIcon: string | undefined; newIcon: string }> = [];

    for (const item of items) {
      // Update if no icon OR if forceAll is true
      if (!item.icon || args.forceAll) {
        const icon = getIconForItem(item.name, item.category);
        debugInfo.push({
          name: item.name,
          category: item.category,
          oldIcon: item.icon,
          newIcon: icon,
        });
        await ctx.db.patch(item._id, {
          icon,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    // Log first 5 items for debugging
    console.log("Migration debug - first 5 items:", JSON.stringify(debugInfo.slice(0, 5)));

    return { updated, total: items.length };
  },
});
