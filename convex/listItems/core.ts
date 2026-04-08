import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  requireUser,
  optionalUser,
  recalculateListTotal,
  findDuplicateListItem,
  findDuplicatePantryItem
} from "./helpers";
import { getUserListPermissions } from "../partners";
import { toGroceryTitleCase } from "../lib/titleCase";
import { isValidSize as isSizeValid, cleanItemForStorage } from "../lib/itemNameParser";
import { getEmergencyPriceEstimate } from "../lib/priceValidator";
import { Id } from "../_generated/dataModel";
import { checkRateLimit as performRateLimitCheck } from "../lib/rateLimit";

export const getByList = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await optionalUser(ctx);
    if (!user) return [];
    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canView) return [];
    return await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();
  },
});

export const create = mutation({
  args: {
    listId: v.id("shoppingLists"),
    name: v.string(),
    category: v.optional(v.string()),
    quantity: v.number(),
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    priceSource: v.optional(v.union(v.literal("personal"), v.literal("crowdsourced"), v.literal("ai"), v.literal("manual"))),
    priceConfidence: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("must-have"), v.literal("should-have"), v.literal("nice-to-have"))),
    pantryItemId: v.optional(v.id("pantryItems")),
    autoAdded: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const rateLimit = await performRateLimitCheck(ctx, user._id, "list_items", 100);
    if (!rateLimit.allowed) throw new Error("Rate limit exceeded");

    // Early clean to get normalized name
    const earlyCleaned = cleanItemForStorage(toGroceryTitleCase(args.name), args.size, args.unit);
    const name = earlyCleaned.name;

    let size = args.size;
    let unit = args.unit;
    let estimatedPrice = args.estimatedPrice;
    let priceSource = args.priceSource;
    let priceConfidence = args.priceConfidence;
    let pantryItemId = args.pantryItemId;

    // Check pantry for size/price hints
    if (!pantryItemId) {
      const existingPantry = await findDuplicatePantryItem(ctx, user._id, name, size);
      if (existingPantry) {
        pantryItemId = existingPantry._id;
        if (!size && existingPantry.defaultSize) {
          size = existingPantry.defaultSize;
          unit = existingPantry.defaultUnit;
        }
        if (estimatedPrice === undefined && existingPantry.lastPrice != null) {
          estimatedPrice = existingPantry.lastPrice;
          priceSource = "personal";
          priceConfidence = 0.8;
        }
      }
    }

    // Apply emergency estimates if needed
    if (estimatedPrice === undefined || !isSizeValid(size, unit)) {
      const emergency = getEmergencyPriceEstimate(name, args.category);
      if (estimatedPrice === undefined) {
        estimatedPrice = emergency.price;
        priceSource = "ai";
        priceConfidence = 0.3;
      }
      if (!isSizeValid(size, unit)) {
        size = emergency.size;
        unit = emergency.unit;
      }
    }

    // Final clean with resolved size/unit
    const cleaned = cleanItemForStorage(name, size, unit);

    // Check for duplicates using final cleaned values
    const existingItem = await findDuplicateListItem(ctx, args.listId, cleaned.name, cleaned.size);

    if (existingItem) {
      if (!args.force) return {
        status: "duplicate",
        existingItemId: existingItem._id,
        existingName: existingItem.name,
        existingQuantity: existingItem.quantity,
        existingSize: existingItem.size,
        isChecked: existingItem.isChecked,
      };
      await ctx.db.patch(existingItem._id, { quantity: existingItem.quantity + args.quantity, updatedAt: Date.now() });
      await recalculateListTotal(ctx, args.listId);
      return { status: "bumped", itemId: existingItem._id };
    }

    const itemId = await ctx.db.insert("listItems", {
      listId: args.listId,
      userId: user._id,
      pantryItemId,
      name: cleaned.name,
      category: args.category,
      quantity: args.quantity,
      size: cleaned.size,
      unit: cleaned.unit,
      estimatedPrice,
      priceSource,
      priceConfidence,
      priority: args.priority ?? "should-have",
      isChecked: false,
      autoAdded: args.autoAdded ?? false,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await recalculateListTotal(ctx, args.listId);
    return { status: "added", itemId };
  },
});

export const update = mutation({
  args: {
    id: v.id("listItems"),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    estimatedPrice: v.optional(v.number()),
    actualPrice: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("must-have"), v.literal("should-have"), v.literal("nice-to-have"))),
    notes: v.optional(v.string()),
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
    priceOverride: v.optional(v.boolean()),
    sizeOverride: v.optional(v.boolean()),
    priceSource: v.optional(v.union(v.literal("personal"), v.literal("crowdsourced"), v.literal("ai"), v.literal("manual"))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Not found");
    const perms = await getUserListPermissions(ctx, item.listId, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const updates = {} as Record<string, unknown>;
    updates.updatedAt = Date.now();
    if (args.quantity !== undefined) updates.quantity = args.quantity;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.notes !== undefined) updates.notes = args.notes;

    if (args.estimatedPrice !== undefined) {
      updates.estimatedPrice = args.estimatedPrice;
      if (args.priceOverride === true || args.estimatedPrice !== item.estimatedPrice) {
        updates.priceOverride = true;
        updates.priceSource = "manual";
      }
    }

    // Clean name/size/unit through mandatory parser
    const newName = args.name !== undefined ? toGroceryTitleCase(args.name) : item.name;
    const newSize = args.size !== undefined ? args.size : item.size;
    const newUnit = args.unit !== undefined ? args.unit : item.unit;

    if (args.name !== undefined || args.size !== undefined || args.unit !== undefined) {
      const cleaned = cleanItemForStorage(newName, newSize, newUnit);
      if (args.name !== undefined) updates.name = cleaned.name;
      if (args.size !== undefined && args.size !== item.size) {
        if (!item.originalSize && item.size) updates.originalSize = item.size;
        updates.size = cleaned.size;
        updates.unit = cleaned.unit;
        updates.sizeOverride = true;
      }
    }

    await ctx.db.patch(args.id, updates);
    await recalculateListTotal(ctx, item.listId);
    return await ctx.db.get(args.id);
  },
});

export const toggleChecked = mutation({
  args: { id: v.id("listItems") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Not found");
    const perms = await getUserListPermissions(ctx, item.listId, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const newChecked = !item.isChecked;
    const list = await ctx.db.get(item.listId);

    if (newChecked && list && !list.shoppingStartedAt) {
      await ctx.db.patch(item.listId, {
        shoppingStartedAt: Date.now(),
        activeShopperId: user._id,
        updatedAt: Date.now(),
      });
    }

    // C3 fix: Re-read list to get freshest store info (minimizes stale-read window
    // in case another user switched stores via switchStoreMidShop)
    const freshList = await ctx.db.get(item.listId);

    // Record which store the item was purchased at
    await ctx.db.patch(args.id, {
      isChecked: newChecked,
      checkedAt: newChecked ? Date.now() : undefined,
      checkedByUserId: newChecked ? user._id : undefined,
      purchasedAtStoreId: newChecked ? (freshList?.normalizedStoreId ?? undefined) : undefined,
      purchasedAtStoreName: newChecked ? (freshList?.storeName ?? undefined) : undefined,
      updatedAt: Date.now(),
    });
    await recalculateListTotal(ctx, item.listId);
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("listItems") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) return { success: true };
    const perms = await getUserListPermissions(ctx, item.listId, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");
    const listId = item.listId;
    await ctx.db.delete(args.id);
    await recalculateListTotal(ctx, listId);
    return { success: true };
  },
});

export const removeMultiple = mutation({
  args: { ids: v.array(v.id("listItems")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    let deleted = 0;
    const affectedLists = new Set<Id<"shoppingLists">>();
    for (const id of args.ids) {
      const item = await ctx.db.get(id);
      if (!item) continue;
      const perms = await getUserListPermissions(ctx, item.listId, user._id);
      if (perms.canEdit) {
        affectedLists.add(item.listId);
        await ctx.db.delete(id);
        deleted++;
      }
    }
    for (const listId of affectedLists) {
      await recalculateListTotal(ctx, listId);
    }
    return { success: true, deleted };
  },
});

