import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { pushReceiptId } from "../lib/receiptHelpers";
import { matchReceiptItems } from "../lib/matching";
import { cleanItemForStorage } from "../lib/itemNameParser";
import { toGroceryTitleCase } from "../lib/titleCase";
import { recalculateListTotal } from "../listItems/helpers";

export const linkToList = mutation({
  args: {
    receiptId: v.id("receipts"),
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) throw new Error("Receipt not found");

    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("Shopping list not found");

    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user || receipt.userId !== user._id || list.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.receiptId, { listId: args.listId });

    const updatedReceiptIds = pushReceiptId(list, args.receiptId);
    await ctx.db.patch(args.listId, {
      actualTotal: receipt.total,
      receiptId: args.receiptId,
      receiptIds: updatedReceiptIds,
      updatedAt: Date.now(),
    });

    if (!receipt.items || receipt.items.length === 0) {
      return { success: true, matchedCount: 0, addedUnplannedCount: 0 };
    }

    const listItems = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    const storeId = receipt.normalizedStoreId || "unknown";
    const now = Date.now();

    // Multi-signal matching between receipt items and list items
    const receiptItemsForMatching = receipt.items.map((item) => ({
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      category: item.category,
    }));

    const candidates = listItems.map((item) => ({
      id: item._id,
      type: "list_item" as "list_item",
      name: item.name,
      category: item.category,
      estimatedPrice: item.estimatedPrice,
    }));

    const { matched, unmatched } = await matchReceiptItems(
      ctx,
      receiptItemsForMatching,
      candidates,
      storeId,
    );

    // Update matched items with receipt prices
    for (const matchResult of matched) {
      if (!matchResult.bestMatch) continue;
      const receiptItem = matchResult.receiptItem;

      await ctx.db.patch(matchResult.bestMatch.id as any, {
        estimatedPrice: receiptItem.unitPrice,
        actualPrice: receiptItem.unitPrice,
        priceSource: "personal" as "personal",
        priceConfidence: 0.9,
        isChecked: true,
        checkedAt: now,
        checkedByUserId: user._id,
        purchasedAtStoreId: receipt.normalizedStoreId ?? undefined,
        purchasedAtStoreName: receipt.storeName ?? undefined,
        updatedAt: now,
      });
    }

    // Build lookup for original receipt items (which have size/unit)
    const receiptItemsByName = new Map(
      receipt.items.map((item) => [item.name, item])
    );

    // Add unplanned items (on receipt but not on list)
    let addedCount = 0;
    for (const unmatchedResult of unmatched) {
      const ri = unmatchedResult.receiptItem;
      const original = receiptItemsByName.get(ri.name);
      const cleaned = cleanItemForStorage(
        toGroceryTitleCase(ri.name),
        original?.size,
        original?.unit,
      );

      await ctx.db.insert("listItems", {
        listId: args.listId,
        userId: user._id,
        name: cleaned.name,
        category: ri.category,
        quantity: ri.quantity,
        size: cleaned.size,
        unit: cleaned.unit,
        estimatedPrice: ri.unitPrice,
        actualPrice: ri.unitPrice,
        priceSource: "personal" as "personal",
        priceConfidence: 0.9,
        priority: "should-have" as "should-have",
        isChecked: true,
        checkedAt: now,
        checkedByUserId: user._id,
        purchasedAtStoreId: receipt.normalizedStoreId ?? undefined,
        purchasedAtStoreName: receipt.storeName ?? undefined,
        autoAdded: false,
        addedFromReceipt: true,
        createdAt: now,
        updatedAt: now,
      });
      addedCount++;
    }

    // Recalculate list total with newly added items
    await recalculateListTotal(ctx, args.listId);

    return { success: true, matchedCount: matched.length, addedUnplannedCount: addedCount };
  },
});

export const detectStoreMismatch = query({
  args: { receiptId: v.id("receipts"), listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) return null;

    const list = await ctx.db.get(args.listId);
    if (!list) return null;

    const receiptStore = receipt.normalizedStoreId ?? receipt.storeName?.toLowerCase() ?? "unknown";
    const listStore = list.normalizedStoreId ?? list.storeName?.toLowerCase() ?? "unknown";

    if (receiptStore === listStore) {
      return { isMismatch: false, receiptStore: receipt.storeName, listStore: list.storeName ?? "Unknown", isKnownSegment: false };
    }

    const segments = list.storeSegments ?? [];
    const isKnownSegment = segments.some((seg) => seg.storeId === receiptStore);
    return { isMismatch: !isKnownSegment, receiptStore: receipt.storeName, listStore: list.storeName ?? "Unknown", isKnownSegment };
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return await ctx.storage.generateUploadUrl();
});

export const getStorageUrls = query({
  args: { storageIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const result: Record<string, string | null> = {};
    await Promise.all(
      args.storageIds.map(async (id) => {
        try {
          result[id] = await ctx.storage.getUrl(id as never);
        } catch {
          result[id] = null;
        }
      })
    );
    return result;
  },
});
