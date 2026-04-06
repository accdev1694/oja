import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { api } from "../_generated/api";
import {
  requireUser,
  recalculateListTotal,
  QueryCtx,
  MutationCtx,
} from "./helpers";
import { getUserListPermissions } from "../partners";
import { isDuplicateItemName } from "../lib/fuzzyMatch";
import { findLearnedMapping } from "../lib/itemMatcher";
import { resolveVariantWithPrice } from "../lib/priceResolver";
import { isValidSize as isSizeValid, cleanItemForStorage } from "../lib/itemNameParser";
import { getEmergencyPriceEstimate } from "../lib/priceValidator";
import { Id } from "../_generated/dataModel";

/**
 * Helper to get price estimate from currentPrices table
 */
export async function getPriceFromCurrentPrices(
  ctx: QueryCtx | MutationCtx,
  itemName: string
): Promise<number | undefined> {
  const normalizedName = itemName.toLowerCase().trim();
  const prices = await ctx.db
    .query("currentPrices")
    .withIndex("by_item", q => q.eq("normalizedName", normalizedName))
    .collect();

  if (prices.length === 0) return undefined;
  const sorted = [...prices].sort((a, b) => a.unitPrice - b.unitPrice);
  return sorted[0].unitPrice;
}

export const refreshListPrices = mutation({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("Not found");
    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    let updated = 0;
    const storeName = list.storeName;
    const normalizedStoreId = list.normalizedStoreId;
    const userRegion = user.postcodePrefix || user.country || "UK";

    for (const item of items) {
      if (item.isChecked || item.priceOverride) continue;

      let newPrice: number | undefined;
      let newSource: "personal" | "crowdsourced" | "ai" | "manual" | undefined;
      let newConfidence: number | undefined;

      if (normalizedStoreId) {
        const learnedMapping = await findLearnedMapping(ctx, normalizedStoreId, item.name);
        if (learnedMapping && learnedMapping.confidence >= 50) {
          const canonicalNormalized = learnedMapping.canonicalName.toLowerCase().trim();
          const canonicalPersonal = await ctx.db
            .query("priceHistory")
            .withIndex("by_user_item", q => q.eq("userId", user._id).eq("normalizedName", canonicalNormalized))
            .order("desc").first();

          if (canonicalPersonal) {
            newPrice = canonicalPersonal.unitPrice;
            newSource = "personal";
            newConfidence = 0.9;
          }
        }
      }

      if (newPrice === undefined) {
        const personal = await ctx.db
          .query("priceHistory")
          .withIndex("by_user_item", q => q.eq("userId", user._id).eq("normalizedName", item.name.toLowerCase().trim()))
          .order("desc").first();
        if (personal) {
          newPrice = personal.unitPrice;
          newSource = "personal";
          newConfidence = 0.9;
        }
      }

      if (newPrice === undefined && storeName) {
        const normalizedItemName = item.name.toLowerCase().trim();
        // Prefer region-specific price, fall back to any region at this store
        let storePrice = await ctx.db
          .query("currentPrices")
          .withIndex("by_item_store_region", q => q.eq("normalizedName", normalizedItemName).eq("storeName", storeName).eq("region", userRegion))
          .first();
        if (!storePrice) {
          storePrice = await ctx.db
            .query("currentPrices")
            .withIndex("by_item_store", q => q.eq("normalizedName", normalizedItemName).eq("storeName", storeName))
            .first();
        }
        if (storePrice) {
          newPrice = storePrice.unitPrice;
          newSource = "crowdsourced";
          newConfidence = storePrice.confidence;
        }
      }

      if (newPrice !== undefined && newPrice !== item.estimatedPrice) {
        await ctx.db.patch(item._id, {
          estimatedPrice: newPrice,
          priceSource: newSource,
          priceConfidence: newConfidence,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    if (updated > 0) await recalculateListTotal(ctx, args.listId);
    return { updated, total: items.length };
  },
});

export const applyHealthSwap = mutation({
  args: {
    listId: v.id("shoppingLists"),
    originalItemId: v.id("listItems"),
    suggestedName: v.string(),
    suggestedCategory: v.optional(v.string()),
    suggestedSize: v.optional(v.string()),
    suggestedUnit: v.optional(v.string()),
    scoreImpact: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const originalItem = await ctx.db.get(args.originalItemId);
    if (!originalItem || originalItem.listId !== args.listId) throw new Error("Not found");

    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");

    const variantResult = await resolveVariantWithPrice(ctx, args.suggestedName, list.normalizedStoreId, user._id);

    let category = args.suggestedCategory || variantResult?.variant.category || originalItem.category || "Pantry Staples";
    let size = variantResult?.variant.size || args.suggestedSize || "per item";
    let unit = variantResult?.variant.unit || args.suggestedUnit || "each";
    let estimatedPrice = variantResult?.price ?? undefined;
    let priceSource = variantResult?.priceSource ?? "ai";
    let priceConfidence = variantResult?.confidence ?? 0.5;

    if (estimatedPrice === undefined || !isSizeValid(size, unit)) {
      const emergency = getEmergencyPriceEstimate(args.suggestedName, category);
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

    await ctx.db.delete(args.originalItemId);
    const cleaned = cleanItemForStorage(args.suggestedName, size, unit);

    const newItemId = await ctx.db.insert("listItems", {
      listId: args.listId,
      userId: user._id,
      name: cleaned.name,
      category,
      quantity: originalItem.quantity,
      priority: originalItem.priority,
      size: cleaned.size,
      unit: cleaned.unit,
      estimatedPrice,
      priceSource,
      priceConfidence,
      brand: variantResult?.variant.brand,
      isChecked: false,
      autoAdded: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (list.healthAnalysis) {
      const updatedSwaps = list.healthAnalysis.swaps.filter(s => s.originalId !== args.originalItemId);
      const newScore = Math.min(100, list.healthAnalysis.score + (args.scoreImpact || 0));
      await ctx.db.patch(args.listId, {
        healthAnalysis: { ...list.healthAnalysis, score: newScore, swaps: updatedSwaps }
      });
    }

    return newItemId;
  },
});
