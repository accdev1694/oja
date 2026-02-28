import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { getUserListPermissions } from "./partners";
import { resolveVariantWithPrice } from "./lib/priceResolver";
import { getIconForItem } from "./iconMapping";
import { canAddPantryItem } from "./lib/featureGating";
import { isDuplicateItem } from "./lib/fuzzyMatch";
import { enrichGlobalFromProductScan } from "./lib/globalEnrichment";
import { toGroceryTitleCase } from "./lib/titleCase";

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
 * Find an existing list item that is a fuzzy duplicate of the given name.
 * Checks all items on the list (checked and unchecked).
 * Returns the matching item document or null.
 */
async function findDuplicateListItem(
  ctx: MutationCtx | QueryCtx,
  listId: Id<"shoppingLists">,
  name: string,
  size?: string | null,
) {
  const items = await ctx.db
    .query("listItems")
    .withIndex("by_list", (q) => q.eq("listId", listId))
    .collect();

  for (const item of items) {
    if (isDuplicateItem(name, size, item.name, item.size)) {
      return item;
    }
  }
  return null;
}

/**
 * Find a pantry item that is a fuzzy duplicate of the given name.
 * Returns the matching pantry item document or null.
 */
async function findDuplicatePantryItem(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">,
  name: string,
  size?: string | null,
) {
  const items = await ctx.db
    .query("pantryItems")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const item of items) {
    if (isDuplicateItem(name, size, item.name, item.defaultSize)) {
      return item;
    }
  }
  return null;
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
    force: v.optional(v.boolean()),
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

    // Normalize item name to title case
    const name = toGroceryTitleCase(args.name);

    // Duplicate check: if a fuzzy match exists on this list, ask for confirmation or bump
    const existingItem = await findDuplicateListItem(ctx, args.listId, name, args.size);
    if (existingItem) {
      if (!args.force) {
        // Return duplicate info without modifying DB — let the UI confirm
        return {
          status: "duplicate" as const,
          existingName: existingItem.name,
          existingQuantity: existingItem.quantity,
          existingSize: existingItem.size,
        };
      }
      // force=true: user confirmed — bump quantity
      await ctx.db.patch(existingItem._id, {
        quantity: existingItem.quantity + args.quantity,
        updatedAt: Date.now(),
      });
      await recalculateListTotal(ctx, args.listId);
      return { status: "bumped" as const, itemId: existingItem._id };
    }

    const now = Date.now();

    // Resolve size/unit: use provided, else pull from linked pantry item
    let size = args.size;
    let unit = args.unit;
    let estimatedPrice = args.estimatedPrice;
    let priceSource = args.priceSource;
    let priceConfidence = args.priceConfidence;

    // If pantryItemId provided, pull size/price defaults from it
    if (args.pantryItemId && (!size || estimatedPrice === undefined)) {
      const pantryItem = await ctx.db.get(args.pantryItemId);
      if (pantryItem) {
        if (!size && pantryItem.defaultSize) {
          size = pantryItem.defaultSize;
          unit = pantryItem.defaultUnit;
        }
        if (estimatedPrice === undefined && pantryItem.lastPrice != null) {
          estimatedPrice = pantryItem.lastPrice;
          priceSource = priceSource ?? "personal";
          priceConfidence = priceConfidence ?? 0.8;
        }
      }
    }

    // Price cascade: provided → pantry (above) → currentPrices
    if (estimatedPrice === undefined) {
      estimatedPrice = await getPriceFromCurrentPrices(ctx, name);
      if (estimatedPrice !== undefined) {
        priceSource = priceSource ?? "crowdsourced";
        priceConfidence = priceConfidence ?? 0.6;
      }
    }

    // Seed pantry: if no pantryItemId provided, find or create one
    let pantryItemId = args.pantryItemId;
    if (!pantryItemId) {
      const existingPantry = await findDuplicatePantryItem(ctx, user._id, name, size);
      if (existingPantry) {
        pantryItemId = existingPantry._id;
        // Pull size/price from existing pantry item if still missing
        if (!size && existingPantry.defaultSize) {
          size = existingPantry.defaultSize;
          unit = existingPantry.defaultUnit;
        }
        if (estimatedPrice === undefined && existingPantry.lastPrice != null) {
          estimatedPrice = existingPantry.lastPrice;
          priceSource = priceSource ?? "personal";
          priceConfidence = priceConfidence ?? 0.8;
        }
      } else {
        const pantryAccess = await canAddPantryItem(ctx, user._id);
        if (pantryAccess.allowed) {
          const icon = getIconForItem(name, args.category || "Other");
          pantryItemId = await ctx.db.insert("pantryItems", {
            userId: user._id,
            name,
            category: args.category || "Other",
            icon,
            stockLevel: "low",
            status: "active" as const,
            nameSource: "system" as const,
            autoAddToList: false,
            ...(size ? { defaultSize: size } : {}),
            ...(unit ? { defaultUnit: unit } : {}),
            ...(estimatedPrice != null ? {
              lastPrice: estimatedPrice,
              priceSource: "ai_estimate" as const,
            } : {}),
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    const itemId = await ctx.db.insert("listItems", {
      listId: args.listId,
      userId: user._id,
      pantryItemId,
      name,
      category: args.category,
      quantity: args.quantity,
      size,
      unit,
      estimatedPrice,
      priceSource,
      priceConfidence,
      priority: args.priority ?? "should-have",
      isChecked: false,
      autoAdded: args.autoAdded ?? false,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    // Recalculate list total after adding item
    await recalculateListTotal(ctx, args.listId);

    // Schedule AI price estimation if still no price after cascade
    if (estimatedPrice === undefined) {
      await ctx.scheduler.runAfter(0, api.ai.estimateItemPrice, {
        itemName: name,
        userId: user._id,
      });
    }

    return { status: "added" as const, itemId };
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

    if (args.name !== undefined) updates.name = toGroceryTitleCase(args.name);
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

    const newCheckedStatus = !item.isChecked;

    // Build update
    const updates: Record<string, unknown> = {
      isChecked: newCheckedStatus,
      checkedAt: newCheckedStatus ? Date.now() : undefined,
      checkedByUserId: newCheckedStatus ? user._id : undefined,
      updatedAt: Date.now(),
    };

    // When checking ON, stamp the current store on the item (multi-store support)
    if (newCheckedStatus) {
      const list = await ctx.db.get(item.listId);
      if (list?.normalizedStoreId) {
        updates.purchasedAtStoreId = list.normalizedStoreId;
        updates.purchasedAtStoreName = list.storeName;
      }
    }

    await ctx.db.patch(args.id, updates);

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
    // Owner can always remove. Members can remove their own items.
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
      // Owner can always remove. Members can remove their own items.
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
    const normalizedStoreId = list.normalizedStoreId ?? undefined;
    const needsAIEstimate: { itemName: string; userId: Id<"users"> }[] = [];

    // Pre-fetch existing list item names for dedup
    const existingListItems = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    const knownItems: { name: string; size?: string }[] = existingListItems.map((i) => ({ name: i.name, size: i.size }));

    // Add each out item to the list (skip duplicates)
    for (const pantryItem of outItems) {
      // Fuzzy duplicate check — skip if already on list
      const isDup = knownItems.some((known) => isDuplicateItem(pantryItem.name, pantryItem.defaultSize, known.name, known.size));
      if (isDup) continue;

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
        size = variantResult.variant.size;
        unit = variantResult.variant.unit;
      }

      // Priority 3: Fall back to pantry item defaults
      if (!size && pantryItem.defaultSize) {
        size = pantryItem.defaultSize;
        unit = pantryItem.defaultUnit;
      }
      if (estimatedPrice === undefined && pantryItem.lastPrice != null) {
        estimatedPrice = pantryItem.lastPrice;
        priceSource = "personal";
        priceConfidence = 0.8;
      }

      // Priority 4: Name-only fallback from currentPrices
      if (estimatedPrice === undefined) {
        const fallbackPrice = await getPriceFromCurrentPrices(ctx, pantryItem.name);
        if (fallbackPrice !== undefined) {
          estimatedPrice = fallbackPrice;
          priceSource = "crowdsourced";
          priceConfidence = 0.6;
        }
      }

      const normalizedPantryName = toGroceryTitleCase(pantryItem.name);
      const itemId = await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        pantryItemId: pantryItem._id,
        name: normalizedPantryName,
        category: pantryItem.category,
        quantity: 1,
        size,
        unit,
        estimatedPrice,
        priceSource,
        priceConfidence,
        priority: "must-have",
        isChecked: false,
        autoAdded: true,
        createdAt: now,
        updatedAt: now,
      });

      // Track items still missing price for background AI estimation
      if (estimatedPrice === undefined) {
        needsAIEstimate.push({ itemName: pantryItem.name, userId: user._id });
      }

      addedIds.push(itemId);
      knownItems.push({ name: pantryItem.name, size });
    }

    // Recalculate list total after adding items
    if (addedIds.length > 0) {
      await recalculateListTotal(ctx, args.listId);
    }

    // Schedule AI price estimation for items that have no price after cascade
    for (const item of needsAIEstimate) {
      await ctx.scheduler.runAfter(0, api.ai.estimateItemPrice, {
        itemName: item.itemName,
        userId: item.userId,
      });
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

    // Pre-fetch existing list items for dedup
    const existingListItems = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    const addedItems: { name: string; size?: string }[] = existingListItems.map((i) => ({ name: i.name, size: i.size }));

    const normalizedStoreId = list.normalizedStoreId ?? undefined;
    const needsAIEstimate: { itemId: Id<"listItems">; itemName: string; userId: Id<"users"> }[] = [];

    for (const pantryItemId of args.pantryItemIds) {
      const pantryItem = await ctx.db.get(pantryItemId);
      if (!pantryItem || pantryItem.userId !== user._id) continue;

      // Fuzzy duplicate check — skip if already on list
      const isDup = addedItems.some((known) => isDuplicateItem(pantryItem.name, pantryItem.defaultSize, known.name, known.size));
      if (isDup) continue;

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
        size = variantResult.variant.size;
        unit = variantResult.variant.unit;
      }

      // Priority 3: Fall back to pantry item defaults
      if (!size && pantryItem.defaultSize) {
        size = pantryItem.defaultSize;
        unit = pantryItem.defaultUnit;
      }
      if (estimatedPrice === undefined && pantryItem.lastPrice != null) {
        estimatedPrice = pantryItem.lastPrice;
        priceSource = "personal";
        priceConfidence = 0.8;
      }

      // Priority 4: Name-only fallback from currentPrices
      if (estimatedPrice === undefined) {
        const fallbackPrice = await getPriceFromCurrentPrices(ctx, pantryItem.name);
        if (fallbackPrice !== undefined) {
          estimatedPrice = fallbackPrice;
          priceSource = "crowdsourced";
          priceConfidence = 0.6;
        }
      }

      const normalizedPantryName = toGroceryTitleCase(pantryItem.name);
      const itemId = await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        pantryItemId: pantryItem._id,
        name: normalizedPantryName,
        category: pantryItem.category,
        quantity: 1,
        size,
        unit,
        estimatedPrice,
        priceSource,
        priceConfidence,
        priority: "must-have",
        isChecked: false,
        autoAdded: true,
        createdAt: now,
        updatedAt: now,
      });

      // Track items still missing price for background AI estimation
      if (estimatedPrice === undefined) {
        needsAIEstimate.push({ itemId, itemName: pantryItem.name, userId: user._id });
      }

      count++;
      addedItems.push({ name: pantryItem.name, size });
    }

    // Recalculate list total after adding items
    if (count > 0) {
      await recalculateListTotal(ctx, args.listId);
    }

    // Schedule AI price estimation for items that have no price after cascade
    for (const item of needsAIEstimate) {
      await ctx.scheduler.runAfter(0, api.ai.estimateItemPrice, {
        itemName: item.itemName,
        userId: item.userId,
      });
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
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
    force: v.optional(v.boolean()),
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
    const name = toGroceryTitleCase(args.name);

    if (args.source === "add") {
      // Duplicate check: if a fuzzy match exists on this list, ask for confirmation or bump
      const existingItem = await findDuplicateListItem(ctx, args.listId, name, args.size);
      if (existingItem) {
        if (!args.force) {
          return {
            status: "duplicate" as const,
            existingName: existingItem.name,
            existingQuantity: existingItem.quantity,
            existingSize: existingItem.size,
            source: "add" as const,
          };
        }
        await ctx.db.patch(existingItem._id, {
          quantity: existingItem.quantity + quantity,
          updatedAt: now,
        });
        await recalculateListTotal(ctx, args.listId);
        return { status: "bumped" as const, success: true, itemId: existingItem._id, source: "add" as const };
      }

      const itemId = await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        name,
        category: args.category,
        quantity,
        size: args.size,
        unit: args.unit,
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

      return { status: "added" as const, success: true, itemId, source: "add" as const };

    } else if (args.source === "next_trip") {
      // Fuzzy dedup: check if item already exists in pantry
      const existingPantry = await findDuplicatePantryItem(ctx, user._id, name, args.size);

      if (existingPantry) {
        // Mark existing item as out + auto-add to next list
        await ctx.db.patch(existingPantry._id, {
          stockLevel: "out",
          autoAddToList: true,
          updatedAt: now,
        });
        return { status: "added" as const, success: true, deferred: true, pantryItemId: existingPantry._id, source: "next_trip" };
      }

      // Check pantry item limit for free tier
      const pantryAccess = await canAddPantryItem(ctx, user._id);
      if (!pantryAccess.allowed) {
        throw new Error(pantryAccess.reason ?? "Pantry item limit reached");
      }

      // Add to pantry as "Out" - will auto-add to next list
      const pantryItemId = await ctx.db.insert("pantryItems", {
        userId: user._id,
        name,
        category: args.category || "Uncategorized",
        stockLevel: "out",
        status: "active" as const,
        nameSource: "system" as const,
        autoAddToList: true,
        createdAt: now,
        updatedAt: now,
      });

      return { status: "added" as const, success: true, deferred: true, pantryItemId, source: "next_trip" };
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
    const skippedDuplicates: { name: string; existingName: string }[] = [];
    const needsAIEstimate: { itemName: string; userId: Id<"users"> }[] = [];

    // Pre-fetch existing list items for dedup
    const existingListItems = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    const knownItems: { name: string; size?: string }[] = existingListItems.map((i) => ({ name: i.name, size: i.size }));

    for (const pantryItemId of args.pantryItemIds) {
      const pantryItem = await ctx.db.get(pantryItemId);
      if (!pantryItem || pantryItem.userId !== user._id) continue;

      // Fuzzy duplicate check — skip if already on list
      const matchedKnown = knownItems.find((known) => isDuplicateItem(pantryItem.name, pantryItem.defaultSize, known.name, known.size));
      if (matchedKnown) {
        skippedDuplicates.push({ name: pantryItem.name, existingName: matchedKnown.name });
        continue;
      }

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
      }
      if (estimatedPrice === undefined && pantryItem.lastPrice != null) {
        estimatedPrice = pantryItem.lastPrice;
        priceSource = "personal";
        priceConfidence = 0.8;
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

      const normalizedPantryName = toGroceryTitleCase(pantryItem.name);
      const itemId = await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        pantryItemId,
        name: normalizedPantryName,
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
        createdAt: now,
        updatedAt: now,
      });

      // Track items still missing price for background AI estimation
      if (estimatedPrice === undefined) {
        needsAIEstimate.push({ itemName: pantryItem.name, userId: user._id });
      }

      itemIds.push(itemId);
      addedItemNames.push(pantryItem.name);
      knownItems.push({ name: pantryItem.name, size });
    }

    // Recalculate list total after adding items
    if (itemIds.length > 0) {
      await recalculateListTotal(ctx, args.listId);
    }

    // Schedule AI price estimation for items that have no price after cascade
    for (const item of needsAIEstimate) {
      await ctx.scheduler.runAfter(0, api.ai.estimateItemPrice, {
        itemName: item.itemName,
        userId: item.userId,
      });
    }

    return { count: itemIds.length, itemIds, skippedDuplicates };
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
    force: v.optional(v.boolean()),
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

    const now = Date.now();
    const quantity = args.quantity ?? 1;
    const name = toGroceryTitleCase(args.name);

    // Duplicate check: if a fuzzy match exists on this list, ask for confirmation or bump
    const existingListItem = await findDuplicateListItem(ctx, args.listId, name, args.size);
    if (existingListItem) {
      if (!args.force) {
        // Return duplicate info without modifying DB — let the UI confirm
        return {
          status: "duplicate" as const,
          existingName: existingListItem.name,
          existingQuantity: existingListItem.quantity,
          existingSize: existingListItem.size,
        };
      }
      // force=true: user confirmed — bump quantity
      await ctx.db.patch(existingListItem._id, {
        quantity: existingListItem.quantity + quantity,
        updatedAt: now,
      });
      await recalculateListTotal(ctx, args.listId);
      // Resolve pantryItemId — must always return a valid ID to match normal return type
      let pantryId = existingListItem.pantryItemId;
      if (!pantryId) {
        const existingPantry = await findDuplicatePantryItem(ctx, user._id, name, args.size);
        if (existingPantry) {
          pantryId = existingPantry._id;
        } else {
          const icon = getIconForItem(name, args.category);
          pantryId = await ctx.db.insert("pantryItems", {
            userId: user._id,
            name,
            category: args.category,
            icon,
            stockLevel: "low",
            status: "active" as const,
            nameSource: "system" as const,
            autoAddToList: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
      return { status: "bumped" as const, listItemId: existingListItem._id, pantryItemId: pantryId };
    }

    // Check pantry item limit for free tier
    const pantryAccess = await canAddPantryItem(ctx, user._id);
    if (!pantryAccess.allowed) {
      throw new Error(pantryAccess.reason ?? "Pantry item limit reached");
    }

    // 1. Find or create pantry item (fuzzy dedup by name)
    const existingPantry = await findDuplicatePantryItem(ctx, user._id, name, args.size);

    let pantryItemId: Id<"pantryItems">;
    if (existingPantry) {
      pantryItemId = existingPantry._id;
    } else {
      const icon = getIconForItem(name, args.category);
      pantryItemId = await ctx.db.insert("pantryItems", {
        userId: user._id,
        name,
        category: args.category,
        icon,
        stockLevel: "low",
        status: "active" as const,
        nameSource: "system" as const,
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
    }

    // 2. Create list item linked to the pantry item
    const listItemId = await ctx.db.insert("listItems", {
      listId: args.listId,
      userId: user._id,
      pantryItemId,
      name,
      category: args.category,
      quantity,
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

    return { status: "added" as const, listItemId, pantryItemId };
  },
});

/**
 * Add multiple items from product scanning.
 * Creates list items + seeds pantry items (deduplicates by name).
 */
export const addBatchFromScan = mutation({
  args: {
    listId: v.id("shoppingLists"),
    items: v.array(
      v.object({
        name: v.string(),
        category: v.string(),
        size: v.optional(v.string()),
        unit: v.optional(v.string()),
        estimatedPrice: v.optional(v.number()),
        quantity: v.optional(v.number()),
        brand: v.optional(v.string()),
        confidence: v.optional(v.number()),
        imageStorageId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) throw new Error("You don't have permission to add items to this list");

    const now = Date.now();
    const itemIds: string[] = [];
    const skippedDuplicates: { name: string; existingName: string }[] = [];

    // Get existing pantry items for fuzzy dedup
    const existingPantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get existing list items for fuzzy dedup
    const existingListItems = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
    const knownListItems: { name: string; size?: string }[] = existingListItems.map((i) => ({ name: i.name, size: i.size }));
    const knownPantryNames: string[] = existingPantryItems.map((p) => p.name);

    for (const item of args.items) {
      const name = toGroceryTitleCase(item.name);

      // Fuzzy duplicate check — skip if already on this list (or matches a name we just added)
      const matchedListItem = knownListItems.find((known) => isDuplicateItem(name, item.size, known.name, known.size));
      if (matchedListItem) {
        skippedDuplicates.push({ name: item.name, existingName: matchedListItem.name });
        continue;
      }

      // Fuzzy find or create pantry item
      let pantryItemId: Id<"pantryItems"> | undefined;
      const existingPantryItem = existingPantryItems.find((p) =>
        isDuplicateItem(item.name, item.size, p.name, p.defaultSize)
      );

      if (existingPantryItem) {
        pantryItemId = existingPantryItem._id;
      } else {
        // Check pantry limit
        const access = await canAddPantryItem(ctx, user._id);
        if (access.allowed) {
          pantryItemId = await ctx.db.insert("pantryItems", {
            userId: user._id,
            name,
            category: item.category,
            icon: getIconForItem(item.name, item.category),
            stockLevel: "low",
            status: "active" as const,
            nameSource: "system" as const,
            autoAddToList: false,
            ...(item.size ? { defaultSize: item.size } : {}),
            ...(item.unit ? { defaultUnit: item.unit } : {}),
            ...(item.estimatedPrice != null ? { lastPrice: item.estimatedPrice, priceSource: "ai_estimate" as const } : {}),
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      // Price cascade: provided → currentPrices → undefined
      let estimatedPrice = item.estimatedPrice;
      if (estimatedPrice === undefined) {
        estimatedPrice = await getPriceFromCurrentPrices(ctx, item.name);
      }

      const listItemId = await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        ...(pantryItemId ? { pantryItemId } : {}),
        name,
        category: item.category,
        quantity: item.quantity ?? 1,
        size: item.size,
        unit: item.unit,
        estimatedPrice,
        priceSource: item.estimatedPrice != null ? "ai" : undefined,
        priority: "should-have",
        isChecked: false,
        autoAdded: false,
        createdAt: now,
        updatedAt: now,
      });

      itemIds.push(listItemId);
      knownListItems.push({ name: item.name, size: item.size });
      knownPantryNames.push(item.name);

      // Global DB enrichment — update itemVariants + currentPrices
      await enrichGlobalFromProductScan(ctx, item, user._id);
    }

    if (itemIds.length > 0) {
      await recalculateListTotal(ctx, args.listId);
    }

    return { count: itemIds.length, itemIds, skippedDuplicates };
  },
});


