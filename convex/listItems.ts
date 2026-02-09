import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserListPermissions } from "./partners";

/**
 * Helper to get price estimate from currentPrices table
 * Falls back when lastPrice is unavailable
 */
async function getPriceFromCurrentPrices(
  ctx: any,
  itemName: string
): Promise<number | undefined> {
  const normalizedName = itemName.toLowerCase().trim();
  const prices = await ctx.db
    .query("currentPrices")
    .withIndex("by_item", (q: any) => q.eq("normalizedName", normalizedName))
    .collect();

  if (prices.length === 0) return undefined;

  // Return cheapest price
  const sorted = [...prices].sort((a: any, b: any) => a.unitPrice - b.unitPrice);
  return sorted[0].unitPrice;
}

/**
 * Get all items for a shopping list (owners + partners)
 */
export const getByList = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canView) return [];

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

    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) {
      throw new Error("You don't have permission to add items to this list");
    }

    const now = Date.now();

    // Price cascade: use provided price, else look up from currentPrices
    let estimatedPrice = args.estimatedPrice;
    if (estimatedPrice === undefined) {
      estimatedPrice = await getPriceFromCurrentPrices(ctx, args.name);
    }

    // Determine approval status:
    // - Owner adds → check if any approver partner exists → set pending for approver to review
    // - Partner adds → set pending for owner to review
    let approvalStatus: "pending" | "approved" | undefined;

    if (perms.isPartner) {
      // Partner adding item → always needs owner approval
      approvalStatus = "pending";
    } else if (perms.isOwner) {
      // Owner adding → check if there's an approver partner on this list
      const partners = await ctx.db
        .query("listPartners")
        .withIndex("by_list", (q: any) => q.eq("listId", args.listId))
        .collect();
      const hasApprover = partners.some((p) => p.role === "approver" && p.status === "accepted");
      approvalStatus = hasApprover ? "pending" : undefined;
    }

    const itemId = await ctx.db.insert("listItems", {
      listId: args.listId,
      userId: user._id,
      pantryItemId: args.pantryItemId,
      name: args.name,
      category: args.category,
      quantity: args.quantity,
      unit: args.unit,
      estimatedPrice,
      priority: args.priority ?? "should-have",
      isChecked: false,
      autoAdded: args.autoAdded ?? false,
      notes: args.notes,
      ...(approvalStatus ? { approvalStatus } : {}),
      createdAt: now,
      updatedAt: now,
    });

    // Notify the other party about pending approval
    if (approvalStatus === "pending") {
      if (perms.isPartner) {
        // Notify list owner
        await ctx.db.insert("notifications", {
          userId: list.userId,
          type: "approval_requested",
          title: "Approval Needed",
          body: `${user.name} wants to add "${args.name}" to the list`,
          data: { listItemId: itemId, listId: args.listId },
          read: false,
          createdAt: now,
        });
      } else {
        // Notify approver partners
        const partners = await ctx.db
          .query("listPartners")
          .withIndex("by_list", (q: any) => q.eq("listId", args.listId))
          .collect();
        for (const p of partners) {
          if (p.role === "approver" && p.status === "accepted") {
            await ctx.db.insert("notifications", {
              userId: p.userId,
              type: "approval_requested",
              title: "Approval Needed",
              body: `${user.name} wants to add "${args.name}" to the list`,
              data: { listItemId: itemId, listId: args.listId },
              read: false,
              createdAt: now,
            });
          }
        }
      }
    }

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

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const perms = await getUserListPermissions(ctx, item.listId, user._id);
    if (!perms.canEdit) {
      throw new Error("You don't have permission to edit items on this list");
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

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const perms = await getUserListPermissions(ctx, item.listId, user._id);
    if (!perms.canEdit) {
      throw new Error("You don't have permission to check items on this list");
    }

    // Block checking pending items
    if (item.approvalStatus === "pending") {
      throw new Error("This item is pending approval and cannot be checked off yet");
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
      // Item already deleted — treat as success (idempotent delete)
      return { success: true };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const perms = await getUserListPermissions(ctx, item.listId, user._id);
    // Owner can always remove. Editors/approvers can remove their own items.
    if (!perms.isOwner && !(perms.canEdit && item.userId === user._id)) {
      throw new Error("You don't have permission to remove this item");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Remove multiple items at once (bulk delete)
 */
export const removeMultiple = mutation({
  args: { ids: v.array(v.id("listItems")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    if (args.ids.length === 0) {
      return { success: true, deleted: 0 };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    let deleted = 0;
    for (const id of args.ids) {
      const item = await ctx.db.get(id);
      if (!item) continue;

      const perms = await getUserListPermissions(ctx, item.listId, user._id);
      // Owner can always remove. Editors/approvers can remove their own items.
      if (perms.isOwner || (perms.canEdit && item.userId === user._id)) {
        await ctx.db.delete(id);
        deleted++;
      }
    }

    return { success: true, deleted };
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
      // Price cascade: lastPrice → currentPrices → undefined (AI will fill later)
      let estimatedPrice = pantryItem.lastPrice;
      if (estimatedPrice === undefined) {
        estimatedPrice = await getPriceFromCurrentPrices(ctx, pantryItem.name);
      }

      const itemId = await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        pantryItemId: pantryItem._id,
        name: pantryItem.name,
        category: pantryItem.category,
        quantity: 1,
        estimatedPrice,
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
 * Add selected pantry items to a shopping list
 */
export const addFromPantrySelected = mutation({
  args: {
    listId: v.id("shoppingLists"),
    pantryItemIds: v.array(v.id("pantryItems")),
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
    let count = 0;

    for (const pantryItemId of args.pantryItemIds) {
      const pantryItem = await ctx.db.get(pantryItemId);
      if (!pantryItem || pantryItem.userId !== user._id) continue;

      // Price cascade: lastPrice → currentPrices → undefined (AI will fill later)
      let estimatedPrice = pantryItem.lastPrice;
      if (estimatedPrice === undefined) {
        estimatedPrice = await getPriceFromCurrentPrices(ctx, pantryItem.name);
      }

      await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        pantryItemId: pantryItem._id,
        name: pantryItem.name,
        category: pantryItem.category,
        quantity: 1,
        estimatedPrice,
        priority: "must-have",
        isChecked: false,
        autoAdded: true,
        createdAt: now,
        updatedAt: now,
      });

      count++;
    }

    return { count };
  },
});

/**
 * Add an item during mid-shop with 2 options:
 * - add: Add to the shopping list (always allowed, even over budget)
 * - next_trip: Defer to next trip (add to pantry as "out")
 */
export const addItemMidShop = mutation({
  args: {
    listId: v.id("shoppingLists"),
    name: v.string(),
    estimatedPrice: v.number(),
    source: v.union(
      v.literal("add"),
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

    if (args.source === "add") {
      // Always allow adding — no budget lock or impulse fund checks
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
        addedMidShop: true,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, itemId, source: "add" };

    } else if (args.source === "next_trip") {
      // Add to pantry as "Out" - will auto-add to next list
      const pantryItemId = await ctx.db.insert("pantryItems", {
        userId: user._id,
        name: args.name,
        category: args.category || "Uncategorized",
        stockLevel: "out",
        autoAddToList: true,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, deferred: true, pantryItemId, source: "next_trip" };
    }

    throw new Error("Invalid source");
  },
});

