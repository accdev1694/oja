import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { api } from "../_generated/api";
import {
  requireUser,
  recalculateListTotal,
  findDuplicateListItem,
} from "./helpers";
import { getUserListPermissions } from "../partners";
import { toGroceryTitleCase } from "../lib/titleCase";
import { cleanItemForStorage } from "../lib/itemNameParser";
import { getEmergencyPriceEstimate } from "../lib/priceValidator";
import { enrichGlobalFromProductScan } from "../lib/globalEnrichment";
import { Id } from "../_generated/dataModel";

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

        // Zero-blank-price: fallback to emergency estimate when scan has no price
        let finalPrice = item.estimatedPrice;
        let priceSource = "ai" as "personal" | "crowdsourced" | "ai" | "manual";
        let priceConfidence = 0.5;
        if (finalPrice === undefined) {
          const emergency = getEmergencyPriceEstimate(cleaned.name, item.category);
          finalPrice = emergency.price;
          priceSource = "ai";
          priceConfidence = 0.3;
        }

        await ctx.db.insert("listItems", {
          listId: args.listId,
          userId: user._id,
          name: cleaned.name,
          category: item.category,
          quantity: item.quantity || 1,
          size: cleaned.size,
          unit: cleaned.unit,
          estimatedPrice: finalPrice,
          priceSource,
          priceConfidence,
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

    // Zero-blank-price: ensure price is set even if actualPrice is undefined
    let finalPrice = args.actualPrice;
    let priceSource: "personal" | "crowdsourced" | "ai" | "manual" = "manual";
    let priceConfidence = 0.95;
    if (finalPrice === undefined) {
      const emergency = getEmergencyPriceEstimate(cleaned.name, undefined);
      finalPrice = emergency.price;
      priceSource = "ai";
      priceConfidence = 0.3;
    }

    const itemId = await ctx.db.insert("listItems", {
      listId: args.listId,
      userId: user._id,
      name: cleaned.name,
      size: cleaned.size,
      unit: cleaned.unit,
      quantity: args.quantity,
      actualPrice: args.actualPrice,
      estimatedPrice: finalPrice,
      priceSource,
      priceConfidence,
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

      // Zero-blank-price: fallback to emergency estimate when pantry has no price
      let estimatedPrice = pantryItem.lastPrice;
      let priceSource: "personal" | "crowdsourced" | "ai" | "manual" = "personal";
      let priceConfidence = 0.8;
      if (estimatedPrice === undefined) {
        const emergency = getEmergencyPriceEstimate(cleaned.name, pantryItem.category);
        estimatedPrice = emergency.price;
        priceSource = "ai";
        priceConfidence = 0.3;
      }

      await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        pantryItemId: pid,
        name: cleaned.name,
        category: pantryItem.category,
        quantity: 1,
        size: cleaned.size,
        unit: cleaned.unit,
        estimatedPrice,
        priceSource,
        priceConfidence,
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

    const pantryId: Id<"pantryItems"> = await ctx.runMutation(api.pantryItems.create, {
      name: args.name,
      category: args.category,
      stockLevel: "out" as const,
    });

    return await ctx.runMutation(api.listItems.create, {
      listId: args.listId,
      name: args.name,
      category: args.category,
      quantity: args.quantity,
      size: args.size,
      unit: args.unit,
      estimatedPrice: args.estimatedPrice,
      pantryItemId: pantryId,
      force: args.force ?? false,
    });
  },
});
