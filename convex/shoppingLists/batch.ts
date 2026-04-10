import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireUser, getNextListNumber } from "./helpers";
import { canCreateList } from "../lib/featureGating";
import { trackActivity } from "../lib/analytics";
import { resolveVariantWithPrice, PriceSource } from "../lib/priceResolver";
import { deduplicateItems, ListItemInput } from "../lib/itemDeduplicator";
import { cleanItemForStorage } from "../lib/itemNameParser";

export const createFromMultipleLists = mutation({
  args: {
    sourceListIds: v.array(v.id("shoppingLists")),
    newListName: v.string(),
    newBudget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (args.sourceListIds.length === 0) throw new Error("Must provide at least one list");

    const access = await canCreateList(ctx, user._id);
    if (!access.allowed) throw new Error(access.reason ?? "List limit reached");

    const itemsByList = new Map<string, { listName: string; items: ListItemInput[] }>();
    let primaryStoreId: string | undefined;
    let primaryStoreName: string | undefined;

    for (const listId of args.sourceListIds) {
      const list = await ctx.db.get(listId);
      if (!list || list.userId !== user._id) throw new Error(`List ${listId} not found or unauthorized`);

      if (!primaryStoreId && list.normalizedStoreId) {
        primaryStoreId = list.normalizedStoreId;
        primaryStoreName = list.storeName;
      }

      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q) => q.eq("listId", listId))
        .collect();

      itemsByList.set(listId, {
        listName: list.name,
        items: items.map(i => ({
          name: i.name,
          category: i.category,
          quantity: i.quantity,
          size: i.size,
          unit: i.unit,
          estimatedPrice: i.estimatedPrice,
        })),
      });
    }

    const result = deduplicateItems(itemsByList);

    const now = Date.now();
    const listNumber = await getNextListNumber(ctx, user._id);
    const newListId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: args.newListName,
      budget: args.newBudget ?? 50,
      status: "active",
      normalizedStoreId: primaryStoreId,
      storeName: primaryStoreName,
      listNumber,
      createdAt: now,
      updatedAt: now,
    });

    await trackActivity(ctx, user._id, "create_list", { listId: newListId, name: args.newListName });

    for (const item of result.items) {
      let price = item.estimatedPrice;
      let source: PriceSource | "manual" | undefined = "personal";
      let confidence = 1.0;

      try {
        const variantResult = await resolveVariantWithPrice(ctx, item.name, primaryStoreId || "", user._id);
        if (variantResult) {
          price = variantResult.price ?? undefined;
          source = variantResult.priceSource;
          confidence = variantResult.confidence;
        }
      } catch (err) {
        console.warn(`[createFromMultipleLists] Could not refresh price for ${item.name}:`, err);
      }

      // Re-clean on batch copy — source lists may contain rows with
      // bare-number sizes ("250" + "g") from before canonicalisation. Rule #13.
      const cleanedBatchItem = cleanItemForStorage(item.name, item.size, item.unit);
      await ctx.db.insert("listItems", {
        listId: newListId,
        userId: user._id,
        name: cleanedBatchItem.name,
        category: item.category,
        quantity: item.quantity,
        size: cleanedBatchItem.size,
        unit: cleanedBatchItem.unit,
        estimatedPrice: price,
        priceSource: source,
        priceConfidence: confidence,
        isChecked: false,
        priority: "should-have",
        autoAdded: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      listId: newListId,
      itemCount: result.items.length,
      duplicatesMerged: result.duplicates.length,
    };
  },
});
