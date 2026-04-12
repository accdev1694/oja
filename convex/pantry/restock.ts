import { v } from "convex/values";
import { mutation } from "../_generated/server";
import {
  requireUser,
  findExistingPantryItem,
  enforceActiveCap,
  MutationCtx,
} from "./helpers";
import { getIconForItem } from "../iconMapping";
import { canAddPantryItem } from "../lib/featureGating";
import { calculateSimilarity } from "../lib/fuzzyMatch";
import { toGroceryTitleCase } from "../lib/titleCase";
import { cleanItemForStorage } from "../lib/itemNameParser";
import { normalizeCategory } from "../lib/categoryNormalizer";
import { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";

const FUZZY_MATCH_THRESHOLD = 80;

/** Update the "add_items" weekly challenge progress if one is active */
async function updateAddItemsChallenge(ctx: MutationCtx, userId: Id<"users">, count: number) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const challenges = await ctx.db
      .query("weeklyChallenges")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const active = challenges.find(
      (c) => c.type === "add_items" && c.endDate >= today && !c.completedAt
    );
    if (active) {
      await ctx.runMutation(api.insights.updateChallengeProgress, {
        challengeId: active._id,
        increment: count,
      });
    }
  } catch {
    // non-critical — don't block pantry operations
  }
}

export const autoRestockFromReceipt = mutation({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) throw new Error("Receipt not found");

    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const restockedItems: { pantryItemId: Id<"pantryItems">; name: string }[] = [];
    const fuzzyMatches: {
      receiptItemName: string;
      pantryItemName: string;
      pantryItemId: Id<"pantryItems">;
      similarity: number;
      price: number | undefined;
      size: string | undefined;
      unit: string | undefined;
    }[] = [];
    const itemsToAdd: {
      name: string;
      category: string | undefined;
      price: number | undefined;
      size: string | undefined;
      unit: string | undefined;
    }[] = [];
    const now = Date.now();

    if (!receipt.items || receipt.items.length === 0) {
      return { restockedItems, fuzzyMatches, itemsToAdd };
    }

    for (const receiptItem of receipt.items) {
      const receiptItemName = receiptItem.name.toLowerCase().trim();
      const exactMatch = pantryItems.find((p) => p.name.toLowerCase().trim() === receiptItemName);

      if (exactMatch) {
        const cleaned = cleanItemForStorage(exactMatch.name, receiptItem.size ?? exactMatch.defaultSize, receiptItem.unit ?? exactMatch.defaultUnit);
        await ctx.db.patch(exactMatch._id, {
          stockLevel: "stocked",
          lastPrice: receiptItem.unitPrice,
          priceSource: "receipt",
          lastStoreName: receipt.storeName,
          ...(cleaned.size ? { defaultSize: cleaned.size, defaultUnit: cleaned.unit } : {}),
          purchaseCount: (exactMatch.purchaseCount ?? 0) + 1,
          lastPurchasedAt: now,
          ...(exactMatch.status === "archived" && { status: "active", archivedAt: undefined }),
          updatedAt: now,
        });
        restockedItems.push({ pantryItemId: exactMatch._id, name: exactMatch.name });
        continue;
      }

      let bestMatch = null;
      for (const pantryItem of pantryItems) {
        const similarity = calculateSimilarity(receiptItem.name, pantryItem.name);
        if (similarity > FUZZY_MATCH_THRESHOLD && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = { item: pantryItem, similarity };
        }
      }

      if (bestMatch) {
        fuzzyMatches.push({
          receiptItemName: receiptItem.name,
          pantryItemName: bestMatch.item.name,
          pantryItemId: bestMatch.item._id,
          similarity: bestMatch.similarity,
          price: receiptItem.unitPrice,
          size: receiptItem.size,
          unit: receiptItem.unit,
        });
      } else {
        itemsToAdd.push({
          name: receiptItem.name,
          category: receiptItem.category,
          price: receiptItem.unitPrice,
          size: receiptItem.size,
          unit: receiptItem.unit,
        });
      }
    }

    return { restockedItems, fuzzyMatches, itemsToAdd };
  },
});

export const restockFromCheckedItems = mutation({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) throw new Error("Unauthorized");

    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    const pantryUpdates = new Map<Id<"pantryItems">, { price: number | undefined }>();
    for (const item of items) {
      if (!item.isChecked || !item.pantryItemId) continue;
      const price = item.actualPrice || item.estimatedPrice;
      const existing = pantryUpdates.get(item.pantryItemId);
      if (!existing || (price !== undefined && (existing.price === undefined || price > existing.price))) {
        pantryUpdates.set(item.pantryItemId, { price });
      }
    }

    const now = Date.now();
    let count = 0;
    for (const [pantryItemId, { price }] of pantryUpdates) {
      const pantryItem = await ctx.db.get(pantryItemId);
      if (!pantryItem || pantryItem.userId !== user._id) continue;

      await ctx.db.patch(pantryItemId, {
        stockLevel: "stocked",
        purchaseCount: (pantryItem.purchaseCount ?? 0) + 1,
        lastPurchasedAt: now,
        ...(pantryItem.status === "archived" && { status: "active", archivedAt: undefined }),
        updatedAt: now,
        ...(price !== undefined && { lastPrice: price, priceSource: "shopping_list" }),
      });
      count++;
    }
    return { restockedCount: count };
  },
});

export const bulkRestockFromTrip = mutation({
  args: {
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) throw new Error("Unauthorized");

    const checkedItems = await ctx.db
      .query("listItems")
      .withIndex("by_list_checked", (q) =>
        q.eq("listId", args.listId).eq("isChecked", true)
      )
      .collect();

    const now = Date.now();
    let restockedCount = 0;

    for (const item of checkedItems) {
      if (!item.pantryItemId) continue;

      const pantryItem = await ctx.db.get(item.pantryItemId);
      if (!pantryItem || pantryItem.userId !== user._id) continue;
      if (pantryItem.stockLevel === "stocked") continue;

      await ctx.db.patch(item.pantryItemId, {
        stockLevel: "stocked",
        purchaseCount: (pantryItem.purchaseCount ?? 0) + 1,
        lastPurchasedAt: now,
        ...(pantryItem.status === "archived" && {
          status: "active",
          archivedAt: undefined,
        }),
        updatedAt: now,
      });
      restockedCount++;
    }

    return { restockedCount };
  },
});

export const confirmFuzzyRestock = mutation({
  args: {
    pantryItemId: v.id("pantryItems"),
    price: v.optional(v.number()),
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
    storeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.pantryItemId);
    if (!item || item.userId !== user._id) throw new Error("Unauthorized");

    const cleaned = cleanItemForStorage(item.name, args.size ?? item.defaultSize, args.unit ?? item.defaultUnit);
    await ctx.db.patch(args.pantryItemId, {
      stockLevel: "stocked",
      ...(args.price !== undefined && { lastPrice: args.price, priceSource: "receipt" }),
      ...(args.storeName && { lastStoreName: args.storeName }),
      ...(cleaned.size ? { defaultSize: cleaned.size, defaultUnit: cleaned.unit } : {}),
      purchaseCount: (item.purchaseCount ?? 0) + 1,
      lastPurchasedAt: Date.now(),
      ...(item.status === "archived" && { status: "active", archivedAt: undefined }),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const addFromReceipt = mutation({
  args: {
    name: v.string(),
    category: v.optional(v.string()),
    price: v.optional(v.number()),
    storeName: v.optional(v.string()),
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const existing = await findExistingPantryItem(ctx, user._id, args.name, args.size);
    if (existing) {
      const cleaned = cleanItemForStorage(existing.name, args.size ?? existing.defaultSize, args.unit ?? existing.defaultUnit);
      await ctx.db.patch(existing._id, {
        stockLevel: "stocked",
        ...(args.price !== undefined && { lastPrice: args.price, priceSource: "receipt" }),
        ...(cleaned.size ? { defaultSize: cleaned.size, defaultUnit: cleaned.unit } : {}),
        purchaseCount: (existing.purchaseCount ?? 0) + 1,
        lastPurchasedAt: now,
        ...(existing.status === "archived" && { status: "active", archivedAt: undefined }),
        updatedAt: now,
      });
      return existing._id;
    }

    const access = await canAddPantryItem(ctx, user._id);
    if (!access.allowed) throw new Error(access.reason ?? "Pantry item limit reached");

    await enforceActiveCap(ctx, user._id);

    const cleaned = cleanItemForStorage(toGroceryTitleCase(args.name), args.size, args.unit);
    const normCat = normalizeCategory(args.category || "Other");
    const itemId = await ctx.db.insert("pantryItems", {
      userId: user._id,
      name: cleaned.name,
      category: normCat,
      icon: getIconForItem(cleaned.name, normCat),
      stockLevel: "stocked",
      status: "active",
      nameSource: "system",
      purchaseCount: 1,
      lastPurchasedAt: now,
      ...(args.price !== undefined && { lastPrice: args.price, priceSource: "receipt" }),
      ...(cleaned.size ? { defaultSize: cleaned.size } : {}),
      ...(cleaned.unit ? { defaultUnit: cleaned.unit } : {}),
      autoAddToList: false,
      createdAt: now,
      updatedAt: now,
    });

    await updateAddItemsChallenge(ctx, user._id, 1);
    return itemId;
  },
});
