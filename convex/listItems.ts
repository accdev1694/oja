import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all items for a shopping list
 */
export const getByList = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify list ownership
    const list = await ctx.db.get(args.listId);
    if (!list) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      return [];
    }

    return await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
  },
});

/**
 * Add an item to a shopping list
 */
export const create = mutation({
  args: {
    listId: v.id("shoppingLists"),
    name: v.string(),
    category: v.optional(v.string()),
    quantity: v.number(),
    unit: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    priority: v.optional(
      v.union(
        v.literal("must-have"),
        v.literal("should-have"),
        v.literal("nice-to-have")
      )
    ),
    pantryItemId: v.optional(v.id("pantryItems")),
    autoAdded: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify list ownership
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    const itemId = await ctx.db.insert("listItems", {
      listId: args.listId,
      userId: user._id,
      pantryItemId: args.pantryItemId,
      name: args.name,
      category: args.category,
      quantity: args.quantity,
      unit: args.unit,
      estimatedPrice: args.estimatedPrice,
      priority: args.priority ?? "should-have",
      isChecked: false,
      autoAdded: args.autoAdded ?? false,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return itemId;
  },
});

/**
 * Update a list item
 */
export const update = mutation({
  args: {
    id: v.id("listItems"),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    estimatedPrice: v.optional(v.number()),
    actualPrice: v.optional(v.number()),
    priority: v.optional(
      v.union(
        v.literal("must-have"),
        v.literal("should-have"),
        v.literal("nice-to-have")
      )
    ),
    notes: v.optional(v.string()),
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
    if (args.quantity !== undefined) updates.quantity = args.quantity;
    if (args.estimatedPrice !== undefined) updates.estimatedPrice = args.estimatedPrice;
    if (args.actualPrice !== undefined) updates.actualPrice = args.actualPrice;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

/**
 * Toggle item checked status
 */
export const toggleChecked = mutation({
  args: { id: v.id("listItems") },
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

    const newCheckedStatus = !item.isChecked;

    await ctx.db.patch(args.id, {
      isChecked: newCheckedStatus,
      checkedAt: newCheckedStatus ? Date.now() : undefined,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Delete a list item
 */
export const remove = mutation({
  args: { id: v.id("listItems") },
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
 * Add multiple items from pantry "Out" items
 */
export const addFromPantryOut = mutation({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify list ownership
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Get all pantry items marked as "out"
    const outItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user_stock", (q) =>
        q.eq("userId", user._id).eq("stockLevel", "out")
      )
      .collect();

    const now = Date.now();
    const addedIds: string[] = [];

    // Add each out item to the list
    for (const pantryItem of outItems) {
      const itemId = await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        pantryItemId: pantryItem._id,
        name: pantryItem.name,
        category: pantryItem.category,
        quantity: 1,
        priority: "must-have",
        isChecked: false,
        autoAdded: true,
        createdAt: now,
        updatedAt: now,
      });

      addedIds.push(itemId);
    }

    return { count: addedIds.length, itemIds: addedIds };
  },
});

/**
 * Add an item during mid-shop with 3 options:
 * - budget: Add to main budget
 * - impulse: Add to impulse fund
 * - next_trip: Defer to next trip (add to pantry as "out")
 */
export const addItemMidShop = mutation({
  args: {
    listId: v.id("shoppingLists"),
    name: v.string(),
    estimatedPrice: v.number(),
    source: v.union(
      v.literal("budget"),
      v.literal("impulse"),
      v.literal("next_trip")
    ),
    quantity: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const quantity = args.quantity ?? 1;
    const itemTotal = args.estimatedPrice * quantity;

    // Calculate current list total
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    const currentTotal = items.reduce((sum, item) => {
      return sum + (item.estimatedPrice || 0) * item.quantity;
    }, 0);

    if (args.source === "budget") {
      // Check budget lock
      const budget = list.budget || 0;
      const impulseFund = budget * 0.1;
      const totalLimit = budget + impulseFund;
      const newTotal = currentTotal + itemTotal;

      if (list.budgetLocked && budget > 0 && newTotal > totalLimit) {
        throw new Error("BUDGET_EXCEEDED");
      }

      // Add to list as regular item
      const itemId = await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        name: args.name,
        category: args.category,
        quantity,
        estimatedPrice: args.estimatedPrice,
        priority: "should-have",
        isChecked: false,
        autoAdded: false,
        isImpulse: false,
        addedMidShop: true,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, itemId, source: "budget" };

    } else if (args.source === "impulse") {
      // Calculate impulse fund usage
      const budget = list.budget || 0;
      const impulseFund = budget * 0.1;

      const impulseUsed = items
        .filter((item) => item.isImpulse)
        .reduce((sum, item) => {
          return sum + (item.estimatedPrice || 0) * item.quantity;
        }, 0);

      const impulseRemaining = impulseFund - impulseUsed;

      if (itemTotal > impulseRemaining) {
        throw new Error("IMPULSE_EXCEEDED");
      }

      // Add as impulse item
      const itemId = await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        name: args.name,
        category: args.category,
        quantity,
        estimatedPrice: args.estimatedPrice,
        priority: "nice-to-have",
        isChecked: false,
        autoAdded: false,
        isImpulse: true,
        addedMidShop: true,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, itemId, source: "impulse", impulseRemaining: impulseRemaining - itemTotal };

    } else if (args.source === "next_trip") {
      // Add to pantry as "Out" - will auto-add to next list
      const pantryItemId = await ctx.db.insert("pantryItems", {
        userId: user._id,
        name: args.name,
        category: args.category || "Uncategorized",
        stockLevel: "out",
        autoAddToList: true, // So it shows up on next shopping list
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, deferred: true, pantryItemId, source: "next_trip" };
    }

    throw new Error("Invalid source");
  },
});

/**
 * Get impulse fund usage for a list
 */
export const getImpulseUsage = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { used: 0, remaining: 0, total: 0, items: [] };
    }

    const list = await ctx.db.get(args.listId);
    if (!list) {
      return { used: 0, remaining: 0, total: 0, items: [] };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      return { used: 0, remaining: 0, total: 0, items: [] };
    }

    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    const impulseItems = items.filter((item) => item.isImpulse);
    const impulseUsed = impulseItems.reduce((sum, item) => {
      return sum + (item.estimatedPrice || 0) * item.quantity;
    }, 0);

    const budget = list.budget || 0;
    const impulseFund = budget * 0.1;
    const impulseRemaining = impulseFund - impulseUsed;

    return {
      used: impulseUsed,
      remaining: impulseRemaining,
      total: impulseFund,
      items: impulseItems,
    };
  },
});
