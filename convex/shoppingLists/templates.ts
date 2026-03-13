import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  requireUser,
  optionalUser,
  getNextListNumber
} from "./helpers";
import { canCreateList } from "../lib/featureGating";
import { normalizeStoreName } from "../lib/storeNormalizer";
import { toGroceryTitleCase } from "../lib/titleCase";
import { cleanItemForStorage } from "../lib/itemNameParser";
import { trackFunnelEvent, trackActivity } from "../lib/analytics";
import { resolveVariantWithPrice } from "../lib/priceResolver";

export const createFromReceipt = mutation({
  args: {
    receiptId: v.id("receipts"),
    name: v.optional(v.string()),
    budget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const access = await canCreateList(ctx, user._id);
    if (!access.allowed) {
      throw new Error(access.reason ?? "List limit reached");
    }

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) {
      throw new Error("Receipt not found or unauthorized");
    }
    if (receipt.processingStatus !== "completed") {
      throw new Error("Receipt is not fully processed yet");
    }
    if (!receipt.items || receipt.items.length === 0) {
      throw new Error("Receipt has no items");
    }

    const now = Date.now();
    const normalizedStoreId = normalizeStoreName(receipt.storeName);
    const listNumber = await getNextListNumber(ctx, user._id);

    const smartBudget = args.budget ?? Math.ceil(receipt.total / 5) * 5;
    const listName = toGroceryTitleCase(args.name?.trim() || `${receipt.storeName} Re-shop`);

    const listId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: listName,
      status: "active",
      budget: smartBudget,
      storeName: receipt.storeName,
      ...(normalizedStoreId && { normalizedStoreId }),
      sourceReceiptId: args.receiptId,
      listNumber,
      createdAt: now,
      updatedAt: now,
    });

    await trackFunnelEvent(ctx, user._id, "first_list");

    const seenNames = new Set<string>();
    for (const item of receipt.items) {
      const normalizedName = item.name.toLowerCase().trim();
      if (seenNames.has(normalizedName)) continue;
      seenNames.add(normalizedName);

      const size = (item).size as string | undefined;
      const unit = (item).unit as string | undefined;
      const cleaned = cleanItemForStorage(toGroceryTitleCase(item.name), size, unit);

      await ctx.db.insert("listItems", {
        listId,
        userId: user._id,
        name: cleaned.name,
        category: item.category,
        quantity: item.quantity,
        size: cleaned.size,
        unit: cleaned.unit,
        estimatedPrice: item.unitPrice,
        priceSource: "personal",
        priceConfidence: 1.0,
        priority: "should-have",
        isChecked: false,
        autoAdded: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(listId, { updatedAt: Date.now() });
    return listId;
  },
});

export const createFromTemplate = mutation({
  args: {
    sourceListId: v.id("shoppingLists"),
    newListName: v.string(),
    newBudget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const access = await canCreateList(ctx, user._id);
    if (!access.allowed) {
      throw new Error(access.reason ?? "List limit reached");
    }

    const sourceList = await ctx.db.get(args.sourceListId);
    if (!sourceList || sourceList.userId !== user._id) {
      throw new Error("List not found or unauthorized");
    }

    const sourceItems = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.sourceListId))
      .collect();

    const now = Date.now();
    const listNumber = await getNextListNumber(ctx, user._id);
    const newListId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: args.newListName,
      budget: args.newBudget ?? sourceList.budget ?? 50,
      status: "active",
      normalizedStoreId: sourceList.normalizedStoreId,
      storeName: sourceList.storeName,
      listNumber,
      createdAt: now,
      updatedAt: now,
    });

    await trackFunnelEvent(ctx, user._id, "first_list");
    await trackActivity(ctx, user._id, "create_list", { listId: newListId, name: args.newListName });

    for (const item of sourceItems) {
      let price = item.estimatedPrice;
      let source = item.priceSource;
      let confidence = item.priceConfidence;

      try {
        const storeId = sourceList.normalizedStoreId || sourceList.storeName || "";
        const variantResult = await resolveVariantWithPrice(ctx, item.name, storeId, user._id);
        if (variantResult) {
          price = variantResult.price ?? undefined;
          source = variantResult.priceSource;
          confidence = variantResult.confidence;
        }
      } catch (err) {
        console.warn(`[createFromTemplate] Could not refresh price for ${item.name}:`, err);
      }

      await ctx.db.insert("listItems", {
        listId: newListId,
        userId: user._id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        size: item.size,
        unit: item.unit,
        estimatedPrice: price,
        priceSource: source,
        priceConfidence: confidence,
        isChecked: false,
        priority: item.priority,
        autoAdded: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { listId: newListId, itemCount: sourceItems.length };
  },
});

export const getTemplatePreview = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) return null;

    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    const totalEstimated = items.reduce((sum, item) =>
      sum + (item.estimatedPrice || 0) * item.quantity, 0
    );

    const grouped = new Map<string, number>();
    for (const item of items) {
      const cat = item.category || "Uncategorized";
      grouped.set(cat, (grouped.get(cat) || 0) + 1);
    }
    const itemsByCategory = Array.from(grouped.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    return {
      list: {
        _id: list._id,
        name: list.name,
        budget: list.budget,
        storeName: list.storeName,
        completedAt: list.completedAt,
        createdAt: list.createdAt,
      },
      itemCount: items.length,
      totalEstimated,
      itemsByCategory,
    };
  },
});
