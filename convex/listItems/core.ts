import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import { 
  requireUser, 
  optionalUser, 
  recalculateListTotal, 
  findDuplicateListItem,
  findDuplicatePantryItem 
} from "./helpers";
import { getUserListPermissions } from "../partners";
import { getIconForItem } from "../iconMapping";
import { canAddPantryItem } from "../lib/featureGating";
import { toGroceryTitleCase } from "../lib/titleCase";
import { isValidSize as isSizeValid, cleanItemForStorage } from "../lib/itemNameParser";
import { getEmergencyPriceEstimate } from "../lib/priceValidator";
import { resolveVariantWithPrice } from "../lib/priceResolver";
import { enrichGlobalFromProductScan } from "../lib/globalEnrichment";
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

    const name = toGroceryTitleCase(args.name);
    const existingItem = await findDuplicateListItem(ctx, args.listId, name, args.size);
    
    if (existingItem) {
      if (!args.force) return { status: "duplicate", existingItemId: existingItem._id };
      await ctx.db.patch(existingItem._id, { quantity: existingItem.quantity + args.quantity, updatedAt: Date.now() });
      await recalculateListTotal(ctx, args.listId);
      return { status: "bumped", itemId: existingItem._id };
    }

    let size = args.size;
    let unit = args.unit;
    let estimatedPrice = args.estimatedPrice;
    let priceSource = args.priceSource;
    let priceConfidence = args.priceConfidence;
    let pantryItemId = args.pantryItemId;

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

    const cleaned = cleanItemForStorage(name, size, unit);
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
    if (args.name !== undefined) updates.name = toGroceryTitleCase(args.name);
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

    if (args.size !== undefined && args.size !== item.size) {
      if (!item.originalSize && item.size) updates.originalSize = item.size;
      updates.size = args.size;
      updates.sizeOverride = true;
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

    // Record which store the item was purchased at
    await ctx.db.patch(args.id, {
      isChecked: newChecked,
      checkedAt: newChecked ? Date.now() : undefined,
      checkedByUserId: newChecked ? user._id : undefined,
      purchasedAtStoreId: newChecked ? (list?.normalizedStoreId ?? undefined) : undefined,
      purchasedAtStoreName: newChecked ? (list?.storeName ?? undefined) : undefined,
      updatedAt: Date.now(),
    });
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
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const removeMultiple = mutation({
  args: { ids: v.array(v.id("listItems")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    let deleted = 0;
    for (const id of args.ids) {
      const item = await ctx.db.get(id);
      if (!item) continue;
      const perms = await getUserListPermissions(ctx, item.listId, user._id);
      if (perms.canEdit) {
        await ctx.db.delete(id);
        deleted++;
      }
    }
    return { success: true, deleted };
  },
});

export const addBatchFromScan = mutation({
  args: {
    listId: v.id("shoppingLists"),
    items: v.array(
      v.object({
        name: v.string(),
        category: v.string(),
        size: v.optional(v.string()),
        unit: v.optional(v.string()),
        quantity: v.optional(v.number()),
        estimatedPrice: v.optional(v.number()),
        brand: v.optional(v.string()),
        confidence: v.optional(v.number()),
        imageStorageId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const now = Date.now();
    let added = 0;
    let bumped = 0;

    for (const item of args.items) {
      const existing = await findDuplicateListItem(ctx, args.listId, item.name, item.size);
      if (existing) {
        await ctx.db.patch(existing._id, { quantity: existing.quantity + (item.quantity || 1), updatedAt: now });
        bumped++;
      } else {
        const cleaned = cleanItemForStorage(item.name, item.size, item.unit);
        await ctx.db.insert("listItems", {
          listId: args.listId,
          userId: user._id,
          name: cleaned.name,
          category: item.category,
          quantity: item.quantity || 1,
          size: cleaned.size,
          unit: cleaned.unit,
          estimatedPrice: item.estimatedPrice,
          priceSource: "ai",
          isChecked: false,
          autoAdded: false,
          priority: "should-have",
          createdAt: now,
          updatedAt: now,
        });
        added++;
      }
      await enrichGlobalFromProductScan(ctx, item, user._id);
    }

    await recalculateListTotal(ctx, args.listId);
    return { added, bumped };
  },
});

export const addItemMidShop = mutation({
  args: {
    listId: v.id("shoppingLists"),
    name: v.string(),
    quantity: v.number(),
    actualPrice: v.optional(v.number()),
    storeId: v.optional(v.string()),
    storeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const cleaned = cleanItemForStorage(toGroceryTitleCase(args.name), undefined, undefined);
    const itemId = await ctx.db.insert("listItems", {
      listId: args.listId,
      userId: user._id,
      name: cleaned.name,
      size: cleaned.size,
      unit: cleaned.unit,
      quantity: args.quantity,
      actualPrice: args.actualPrice,
      estimatedPrice: args.actualPrice,
      priceSource: "manual",
      isChecked: true,
      checkedAt: Date.now(),
      checkedByUserId: user._id,
      addedMidShop: true,
      purchasedAtStoreId: args.storeId,
      purchasedAtStoreName: args.storeName,
      autoAdded: false,
      priority: "should-have",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await recalculateListTotal(ctx, args.listId);
    return itemId;
  },
});

export const addFromPantryBulk = mutation({
  args: {
    listId: v.id("shoppingLists"),
    pantryItemIds: v.array(v.id("pantryItems")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    let added = 0;
    const now = Date.now();

    for (const pid of args.pantryItemIds) {
      const pantryItem = await ctx.db.get(pid);
      if (!pantryItem || pantryItem.userId !== user._id) continue;

      const existing = await findDuplicateListItem(ctx, args.listId, pantryItem.name, pantryItem.defaultSize);
      if (existing) continue;

      const cleaned = cleanItemForStorage(pantryItem.name, pantryItem.defaultSize, pantryItem.defaultUnit);
      await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        pantryItemId: pid,
        name: cleaned.name,
        category: pantryItem.category,
        quantity: 1,
        size: cleaned.size,
        unit: cleaned.unit,
        estimatedPrice: pantryItem.lastPrice,
        priceSource: "personal",
        isChecked: false,
        autoAdded: true,
        priority: "should-have",
        createdAt: now,
        updatedAt: now,
      });
      added++;
    }

    await recalculateListTotal(ctx, args.listId);
    return { added };
  },
});

export const addAndSeedPantry = mutation({
  args: {
    listId: v.id("shoppingLists"),
    name: v.string(),
    category: v.string(),
    quantity: v.number(),
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ status: string; itemId?: Id<"listItems">; existingItemId?: Id<"listItems">; [key: string]: unknown }> => {
    const user = await requireUser(ctx);

    // @ts-ignore
    const pantryId = await ctx.runMutation(api.pantryItems.create, {
      name: args.name,
      category: args.category,
      stockLevel: "out",
    }) as Id<"pantryItems">;

    return await ctx.runMutation(api.listItems.create, {
      listId: args.listId,
      name: args.name,
      category: args.category,
      quantity: args.quantity,
      size: args.size,
      unit: args.unit,
      estimatedPrice: args.estimatedPrice,
      pantryItemId: pantryId,
      force: args.force ?? true,
    });
  },
});
