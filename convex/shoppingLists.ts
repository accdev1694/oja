import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { canCreateList } from "./lib/featureGating";

/**
 * Get all shopping lists for the current user
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
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/**
 * Get active shopping lists only
 */
export const getActive = query({
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

    // Fetch both "active" and "shopping" status lists
    const active = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .order("desc")
      .collect();

    const shopping = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "shopping")
      )
      .order("desc")
      .collect();

    // Merge and sort by updatedAt descending (shopping lists first since they're in progress)
    return [...shopping, ...active].sort(
      (a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)
    );
  },
});

/**
 * Get a single shopping list by ID
 */
export const getById = query({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      return null;
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // Allow access if owner OR partner
    if (list.userId !== user._id) {
      const partner = await ctx.db
        .query("listPartners")
        .withIndex("by_list_user", (q: any) =>
          q.eq("listId", args.id).eq("userId", user._id)
        )
        .unique();
      if (!partner || partner.status !== "accepted") {
        return null;
      }
    }

    return list;
  },
});

/**
 * Create a new shopping list
 */
export const create = mutation({
  args: {
    name: v.string(),
    budget: v.optional(v.number()),
    storeName: v.optional(v.string()),
    plannedDate: v.optional(v.number()),
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

    // Feature gating: check list limit for free tier
    const access = await canCreateList(ctx, user._id);
    if (!access.allowed) {
      throw new Error(access.reason ?? "List limit reached");
    }

    const now = Date.now();

    const listId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: args.name,
      status: "active",
      budget: args.budget,
      storeName: args.storeName,
      plannedDate: args.plannedDate,
      createdAt: now,
      updatedAt: now,
    });

    return listId;
  },
});

/**
 * Update a shopping list
 */
export const update = mutation({
  args: {
    id: v.id("shoppingLists"),
    name: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("shopping"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
    budget: v.optional(v.number()),
    storeName: v.optional(v.string()),
    plannedDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.status !== undefined) updates.status = args.status;
    if (args.budget !== undefined) updates.budget = args.budget;
    if (args.storeName !== undefined) updates.storeName = args.storeName;
    if (args.plannedDate !== undefined) updates.plannedDate = args.plannedDate;

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

/**
 * Delete a shopping list
 */
export const remove = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Delete all items in the list
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete the list
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Start shopping (change status to "shopping")
 */
export const startShopping = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      status: "shopping",
      shoppingStartedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Complete shopping (change status to "completed")
 */
export const completeShopping = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    // Calculate actualTotal from item-level actual prices
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    const actualTotal = items.reduce((sum, item) => {
      if (item.isChecked && item.actualPrice) {
        return sum + item.actualPrice * item.quantity;
      }
      // Fall back to estimated price for checked items without actual price
      if (item.isChecked && item.estimatedPrice) {
        return sum + item.estimatedPrice * item.quantity;
      }
      return sum;
    }, 0);

    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
      actualTotal: actualTotal > 0 ? actualTotal : undefined,
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Archive a completed list (and record trip summary data)
 */
export const archiveList = mutation({
  args: {
    id: v.id("shoppingLists"),
    receiptId: v.optional(v.id("receipts")),
    actualTotal: v.optional(v.number()),
    pointsEarned: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.id);
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
    await ctx.db.patch(args.id, {
      status: "archived",
      archivedAt: now,
      completedAt: list.completedAt ?? now,
      receiptId: args.receiptId,
      actualTotal: args.actualTotal,
      pointsEarned: args.pointsEarned,
      updatedAt: now,
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Get archived/completed lists (history)
 */
export const getHistory = query({
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

    // Get both completed and archived lists
    const archived = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "archived")
      )
      .order("desc")
      .collect();

    const completed = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "completed")
      )
      .order("desc")
      .collect();

    // Merge and sort by completedAt descending
    return [...archived, ...completed].sort(
      (a, b) => (b.completedAt ?? b.updatedAt) - (a.completedAt ?? a.updatedAt)
    );
  },
});

/**
 * Get trip summary for an archived/completed list
 */
export const getTripSummary = query({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      return null;
    }

    // Get list items
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    // Get linked receipt if any
    let receipt = null;
    if (list.receiptId) {
      receipt = await ctx.db.get(list.receiptId);
    } else {
      // Try to find a receipt linked to this list
      receipt = await ctx.db
        .query("receipts")
        .withIndex("by_list", (q) => q.eq("listId", args.id))
        .first();
    }

    const budget = list.budget ?? 0;
    const actualTotal = list.actualTotal ?? receipt?.total ?? 0;
    const difference = budget - actualTotal;

    return {
      list,
      items,
      receipt,
      budget,
      actualTotal,
      difference,
      savedMoney: difference > 0,
      percentSaved: budget > 0 ? (difference / budget) * 100 : 0,
      pointsEarned: list.pointsEarned ?? 0,
      itemCount: items.length,
      checkedCount: items.filter((i) => i.isChecked).length,
    };
  },
});
