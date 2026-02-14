import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getUserListPermissions } from "./partners";
import { resolveVariantWithPrice } from "./lib/priceResolver";
import { getIconForItem } from "./iconMapping";
import { canAddPantryItem } from "./lib/featureGating";

/**
 * Helper to get price estimate from currentPrices table
 * Falls back when lastPrice is unavailable
 */
async function getPriceFromCurrentPrices(
  ctx: MutationCtx | QueryCtx,
  itemName: string
): Promise<number | undefined> {
  const normalizedName = itemName.toLowerCase().trim();
  const prices = await ctx.db
    .query("currentPrices")
    .withIndex("by_item", (q) => q.eq("normalizedName", normalizedName))
    .collect();

  if (prices.length === 0) return undefined;

  // Return cheapest price
  const sorted = [...prices].sort((a, b) => a.unitPrice - b.unitPrice);
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
    // Size/Unit from variant selection (Zero-Blank: AI fills if not provided)
    size: v.optional(v.string()),    // "2pt", "500ml", "250g"
    unit: v.optional(v.string()),    // "pint", "ml", "g"
    estimatedPrice: v.optional(v.number()),
    // NEW: Price source tracking for Size/Price Modal
    priceSource: v.optional(
      v.union(
        v.literal("personal"),
        v.literal("crowdsourced"),
        v.literal("ai"),
        v.literal("manual")
      )
    ),
    priceConfidence: v.optional(v.number()),
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
        .withIndex("by_list", (q) => q.eq("listId", args.listId))
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
      size: args.size,
      unit: args.unit,
      estimatedPrice,
      priceSource: args.priceSource,
      priceConfidence: args.priceConfidence,
      priority: args.priority ?? "should-have",
      isChecked: false,
      autoAdded: args.autoAdded ?? false,
      notes: args.notes,
      ...(approvalStatus ? { approvalStatus } : {}),
      createdAt: now,
      updatedAt: now,
    });

    // Recalculate list total after adding item
    await recalculateListTotal(ctx, args.listId);

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
          .withIndex("by_list", (q) => q.eq("listId", args.listId))
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
 * Helper to mark a list as updated after item changes.
 * Totals are computed reactively client-side from item data (Convex subscriptions),
 * so we only need to bump `updatedAt` to signal the change.
 */
async function recalculateListTotal(
  ctx: MutationCtx,
  listId: Id<"shoppingLists">
): Promise<void> {
  await ctx.db.patch(listId, {
    updatedAt: Date.now(),
  });
}

/**
 * Update a list item
 * Enhanced for Phase 3 Size/Price Modal - supports size/price editing with override tracking
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
    // Phase 3: Size/Price Modal fields
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
    priceOverride: v.optional(v.boolean()),
    sizeOverride: v.optional(v.boolean()),
    priceSource: v.optional(
      v.union(
        v.literal("personal"),
        v.literal("crowdsourced"),
        v.literal("ai"),
        v.literal("manual")
      )
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
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.notes !== undefined) updates.notes = args.notes;

    // Handle price updates with override tracking
    if (args.estimatedPrice !== undefined) {
      updates.estimatedPrice = args.estimatedPrice;
      // If price is being manually edited, mark as override and set source to manual
      if (args.priceOverride === true || args.estimatedPrice !== item.estimatedPrice) {
        updates.priceOverride = true;
        updates.priceSource = "manual";
      }
    }
    if (args.actualPrice !== undefined) updates.actualPrice = args.actualPrice;

    // Handle size updates with originalSize tracking
    if (args.size !== undefined && args.size !== item.size) {
      // If this is the first size change, store the original size
      if (!item.originalSize && item.size) {
        updates.originalSize = item.size;
      }
      updates.size = args.size;
      updates.sizeOverride = true;
    }
    if (args.unit !== undefined) updates.unit = args.unit;

    // Allow explicit override flag setting
    if (args.priceOverride !== undefined) updates.priceOverride = args.priceOverride;
    if (args.sizeOverride !== undefined) updates.sizeOverride = args.sizeOverride;
    if (args.priceSource !== undefined) updates.priceSource = args.priceSource;

    await ctx.db.patch(args.id, updates);

    // Recalculate list total if price or quantity changed
    if (args.estimatedPrice !== undefined || args.quantity !== undefined) {
      await recalculateListTotal(ctx, item.listId);
    }

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
        // Zero-Blank: Use pantryItem's defaultSize/defaultUnit when available
        size: pantryItem.defaultSize,
        unit: pantryItem.defaultUnit,
        estimatedPrice,
        priority: "must-have",
        isChecked: false,
        autoAdded: true,
        createdAt: now,
        updatedAt: now,
      });

      addedIds.push(itemId);
    }

    // Recalculate list total after adding items
    if (addedIds.length > 0) {
      await recalculateListTotal(ctx, args.listId);
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
    if (!user) throw new Error("User not found");

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) {
      throw new Error("You don't have permission to add items to this list");
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
        // Zero-Blank: Use pantryItem's defaultSize/defaultUnit when available
        size: pantryItem.defaultSize,
        unit: pantryItem.defaultUnit,
        estimatedPrice,
        priority: "must-have",
        isChecked: false,
        autoAdded: true,
        createdAt: now,
        updatedAt: now,
      });

      count++;
    }

    // Recalculate list total after adding items
    if (count > 0) {
      await recalculateListTotal(ctx, args.listId);
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
    if (!user) throw new Error("User not found");

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) {
      throw new Error("You don't have permission to add items to this list");
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

      // Recalculate list total after adding item
      await recalculateListTotal(ctx, args.listId);

      return { success: true, itemId, source: "add" };

    } else if (args.source === "next_trip") {
      // Check pantry item limit for free tier
      const pantryAccess = await canAddPantryItem(ctx, user._id);
      if (!pantryAccess.allowed) {
        throw new Error(pantryAccess.reason ?? "Pantry item limit reached");
      }

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

/**
 * Add multiple pantry items to a shopping list in bulk.
 *
 * For each pantry item, resolves the best variant and price using:
 *   Priority 1: Highest commonality variant at store -> price cascade
 *   Priority 2: Cheapest variant -> price cascade
 *   Priority 3: Pantry item defaultSize + defaultUnit -> lastPrice
 *   Priority 4: Name only, no size, AI estimate or null price
 *
 * Each created listItem links back to its pantryItemId.
 */
export const addFromPantryBulk = mutation({
  args: {
    listId: v.id("shoppingLists"),
    pantryItemIds: v.array(v.id("pantryItems")),
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
    if (!user) throw new Error("User not found");

    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) {
      throw new Error("You don't have permission to add items to this list");
    }

    const normalizedStoreId = list.normalizedStoreId ?? undefined;
    const now = Date.now();
    const itemIds: string[] = [];
    const addedItemNames: string[] = [];

    // Determine approval status (same logic as create mutation)
    let approvalStatus: "pending" | "approved" | undefined;

    if (perms.isPartner) {
      approvalStatus = "pending";
    } else if (perms.isOwner) {
      const partners = await ctx.db
        .query("listPartners")
        .withIndex("by_list", (q) => q.eq("listId", args.listId))
        .collect();
      const hasApprover = partners.some((p) => p.role === "approver" && p.status === "accepted");
      approvalStatus = hasApprover ? "pending" : undefined;
    }

    for (const pantryItemId of args.pantryItemIds) {
      const pantryItem = await ctx.db.get(pantryItemId);
      if (!pantryItem || pantryItem.userId !== user._id) continue;

      let size: string | undefined;
      let unit: string | undefined;
      let estimatedPrice: number | undefined;
      let priceSource: "personal" | "crowdsourced" | "ai" | "manual" | undefined;
      let priceConfidence: number | undefined;

      // Priority 1 & 2: Try variant resolution (handles store-aware pricing)
      const variantResult = await resolveVariantWithPrice(
        ctx,
        pantryItem.name,
        normalizedStoreId,
        user._id,
      );

      if (variantResult && variantResult.price !== null) {
        size = variantResult.variant.size;
        unit = variantResult.variant.unit;
        estimatedPrice = variantResult.price;
        priceSource = variantResult.priceSource;
        priceConfidence = variantResult.confidence;
      } else if (variantResult) {
        // Variant found but no price -- use variant size anyway
        size = variantResult.variant.size;
        unit = variantResult.variant.unit;
      }

      // Priority 3: Fall back to pantry item defaults
      if (!size && pantryItem.defaultSize) {
        size = pantryItem.defaultSize;
        unit = pantryItem.defaultUnit;
        if (pantryItem.lastPrice != null) {
          estimatedPrice = pantryItem.lastPrice;
          priceSource = "personal";
          priceConfidence = 0.8;
        }
      }

      // Priority 4: Name-only fallback -- try currentPrices or leave undefined
      if (estimatedPrice === undefined) {
        const fallbackPrice = await getPriceFromCurrentPrices(ctx, pantryItem.name);
        if (fallbackPrice !== undefined) {
          estimatedPrice = fallbackPrice;
          priceSource = "crowdsourced";
          priceConfidence = 0.6;
        }
      }

      const itemId = await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        pantryItemId,
        name: pantryItem.name,
        category: pantryItem.category,
        quantity: 1,
        size,
        unit,
        estimatedPrice,
        priceSource,
        priceConfidence,
        priority: "should-have",
        isChecked: false,
        autoAdded: false,
        ...(approvalStatus ? { approvalStatus } : {}),
        createdAt: now,
        updatedAt: now,
      });

      itemIds.push(itemId);
      addedItemNames.push(pantryItem.name);
    }

    // Send approval notification (batched — one notification for the whole bulk add)
    if (approvalStatus === "pending" && addedItemNames.length > 0) {
      const itemsSummary = addedItemNames.length <= 3
        ? addedItemNames.join(", ")
        : `${addedItemNames.slice(0, 3).join(", ")} and ${addedItemNames.length - 3} more`;

      if (perms.isPartner) {
        await ctx.db.insert("notifications", {
          userId: list.userId,
          type: "approval_requested",
          title: "Approval Needed",
          body: `${user.name} wants to add ${addedItemNames.length} items: ${itemsSummary}`,
          data: { listId: args.listId },
          read: false,
          createdAt: now,
        });
      } else {
        const partners = await ctx.db
          .query("listPartners")
          .withIndex("by_list", (q) => q.eq("listId", args.listId))
          .collect();
        for (const p of partners) {
          if (p.role === "approver" && p.status === "accepted") {
            await ctx.db.insert("notifications", {
              userId: p.userId,
              type: "approval_requested",
              title: "Approval Needed",
              body: `${user.name} wants to add ${addedItemNames.length} items: ${itemsSummary}`,
              data: { listId: args.listId },
              read: false,
              createdAt: now,
            });
          }
        }
      }
    }

    // Recalculate list total after adding items
    if (itemIds.length > 0) {
      await recalculateListTotal(ctx, args.listId);
    }

    return { count: itemIds.length, itemIds };
  },
});

/**
 * Add a new item to a shopping list AND seed a corresponding pantry item.
 *
 * Used when the user types a brand-new item that doesn't exist in their pantry.
 * Creates both:
 *   1. A pantryItem with stockLevel: "out" (they need it, so it's out of stock)
 *   2. A listItem linked to the new pantryItem
 *
 * This ensures the pantry stays in sync with what the user shops for.
 */
export const addAndSeedPantry = mutation({
  args: {
    listId: v.id("shoppingLists"),
    name: v.string(),
    category: v.string(),
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    quantity: v.optional(v.number()),
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
    if (!user) throw new Error("User not found");

    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) {
      throw new Error("You don't have permission to add items to this list");
    }

    // Check pantry item limit for free tier
    const pantryAccess = await canAddPantryItem(ctx, user._id);
    if (!pantryAccess.allowed) {
      throw new Error(pantryAccess.reason ?? "Pantry item limit reached");
    }

    const now = Date.now();

    // 1. Create pantry item
    const icon = getIconForItem(args.name, args.category);
    const pantryItemId = await ctx.db.insert("pantryItems", {
      userId: user._id,
      name: args.name,
      category: args.category,
      icon,
      stockLevel: "out",
      autoAddToList: false,
      ...(args.size ? { defaultSize: args.size } : {}),
      ...(args.unit ? { defaultUnit: args.unit } : {}),
      ...(args.estimatedPrice != null ? {
        lastPrice: args.estimatedPrice,
        priceSource: "user" as const,
      } : {}),
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create list item linked to the new pantry item
    const listItemId = await ctx.db.insert("listItems", {
      listId: args.listId,
      userId: user._id,
      pantryItemId,
      name: args.name,
      category: args.category,
      quantity: args.quantity ?? 1,
      size: args.size,
      unit: args.unit,
      estimatedPrice: args.estimatedPrice,
      priceSource: args.estimatedPrice != null ? "manual" : undefined,
      priority: "should-have",
      isChecked: false,
      autoAdded: false,
      createdAt: now,
      updatedAt: now,
    });

    // Recalculate list total after adding item
    await recalculateListTotal(ctx, args.listId);

    return { listItemId, pantryItemId };
  },
});

