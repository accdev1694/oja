import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { 
  requireUser, 
  findExistingPantryItem,
  enforceActiveCap 
} from "./helpers";
import { getIconForItem } from "../iconMapping";
import { canAddPantryItem } from "../lib/featureGating";
import { calculateSimilarity } from "../lib/fuzzyMatch";
import { toGroceryTitleCase } from "../lib/titleCase";
import { Id } from "../_generated/dataModel";

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

    const restockedItems: any[] = [];
    const fuzzyMatches: any[] = [];
    const itemsToAdd: any[] = [];
    const now = Date.now();

    for (const receiptItem of receipt.items) {
      const receiptItemName = receiptItem.name.toLowerCase().trim();
      const exactMatch = pantryItems.find((p) => p.name.toLowerCase().trim() === receiptItemName);

      if (exactMatch) {
        await ctx.db.patch(exactMatch._id, {
          stockLevel: "stocked",
          lastPrice: receiptItem.unitPrice,
          priceSource: "receipt",
          lastStoreName: receipt.storeName,
          ...(receiptItem.size && { defaultSize: receiptItem.size }),
          ...(receiptItem.unit && { defaultUnit: receiptItem.unit }),
          purchaseCount: (exactMatch.purchaseCount ?? 0) + 1,
          lastPurchasedAt: now,
          ...(exactMatch.status === "archived" && { status: "active", archivedAt: undefined }),
          updatedAt: now,
        });
        restockedItems.push({ pantryItemId: exactMatch._id, name: exactMatch.name });
        continue;
      }

      let bestMatch: any = null;
      for (const pantryItem of pantryItems) {
        const similarity = calculateSimilarity(receiptItem.name, pantryItem.name);
        if (similarity > 80 && (!bestMatch || similarity > bestMatch.similarity)) {
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

    await ctx.db.patch(args.pantryItemId, {
      stockLevel: "stocked",
      ...(args.price !== undefined && { lastPrice: args.price, priceSource: "receipt" }),
      ...(args.storeName && { lastStoreName: args.storeName }),
      ...(args.size && { defaultSize: args.size }),
      ...(args.unit && { defaultUnit: args.unit }),
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
      await ctx.db.patch(existing._id, {
        stockLevel: "stocked",
        ...(args.price !== undefined && { lastPrice: args.price, priceSource: "receipt" }),
        ...(args.size && { defaultSize: args.size }),
        ...(args.unit && { defaultUnit: args.unit }),
        purchaseCount: (existing.purchaseCount ?? 0) + 1,
        lastPurchasedAt: now,
        ...(existing.status === "archived" && { status: "active", archivedAt: undefined }),
        updatedAt: now,
      });
      return existing._id;
    }

    await enforceActiveCap(ctx, user._id);

    return await ctx.db.insert("pantryItems", {
      userId: user._id,
      name: toGroceryTitleCase(args.name),
      category: args.category || "Pantry Staples",
      icon: getIconForItem(toGroceryTitleCase(args.name), args.category || "Pantry Staples"),
      stockLevel: "stocked",
      status: "active",
      nameSource: "system",
      purchaseCount: 1,
      lastPurchasedAt: now,
      ...(args.price !== undefined && { lastPrice: args.price, priceSource: "receipt" }),
      ...(args.size && { defaultSize: args.size }),
      ...(args.unit && { defaultUnit: args.unit }),
      autoAddToList: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});
