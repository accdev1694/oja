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

    const storeName = list.storeName;
    const normalizedStoreId = list.normalizedStoreId;
    const userRegion = user.postcodePrefix || user.country || "UK";

    // Filter to items that need price refresh
    const refreshableItems = items.filter(item => !item.isChecked && !item.priceOverride);
    const emptyChanges: { name: string; oldPrice?: number; newPrice: number }[] = [];
    if (refreshableItems.length === 0) return { updated: 0, total: items.length, changes: emptyChanges };

    // Batch fetch: user's priceHistory for all item names (single query)
    const allPersonalHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Index personal history by normalized name for O(1) lookup
    const personalHistoryByName = new Map<string, typeof allPersonalHistory>();
    for (const ph of allPersonalHistory) {
      const existing = personalHistoryByName.get(ph.normalizedName) || [];
      existing.push(ph);
      personalHistoryByName.set(ph.normalizedName, existing);
    }

    // Batch fetch: currentPrices for this store (single query if store specified)
    const storePrices = storeName
      ? await ctx.db
          .query("currentPrices")
          .withIndex("by_store", (q) => q.eq("storeName", storeName))
          .collect()
      : [];

    // Index store prices by normalized name
    const storePricesByName = new Map<string, typeof storePrices>();
    for (const sp of storePrices) {
      const existing = storePricesByName.get(sp.normalizedName) || [];
      existing.push(sp);
      storePricesByName.set(sp.normalizedName, existing);
    }

    let updated = 0;
    const now = Date.now();
    const changes: { name: string; oldPrice?: number; newPrice: number }[] = [];

    for (const item of refreshableItems) {
      const normalizedItemName = item.name.toLowerCase().trim();
      let newPrice: number | undefined;
      let newSource: "personal" | "crowdsourced" | "ai" | "manual" | undefined;
      let newConfidence: number | undefined;

      // Layer 1: Personal history (in-memory lookup)
      const personalEntries = personalHistoryByName.get(normalizedItemName) || [];
      if (personalEntries.length > 0) {
        const sorted = [...personalEntries].sort((a, b) => b.purchaseDate - a.purchaseDate);
        newPrice = sorted[0].unitPrice;
        newSource = "personal";
        newConfidence = 0.9;
      }

      // Layer 2: Crowdsourced from store (in-memory lookup)
      if (newPrice === undefined && storeName) {
        const storeEntries = storePricesByName.get(normalizedItemName) || [];
        // Prefer region match, then any
        const regionMatch = storeEntries.find(sp => sp.region === userRegion);
        const storePrice = regionMatch || storeEntries[0];
        if (storePrice) {
          newPrice = storePrice.unitPrice;
          newSource = "crowdsourced";
          newConfidence = storePrice.confidence;
        }
      }

      // Layer 3: Emergency fallback - zero-blank-price policy
      // Apply if Layers 1+2 failed AND item has no price or stale AI price
      if (newPrice === undefined && (item.estimatedPrice === undefined || item.priceSource === "ai")) {
        const emergency = getEmergencyPriceEstimate(item.name, item.category);
        newPrice = emergency.price;
        newSource = "ai";
        newConfidence = 0.3;
      }

      if (newPrice !== undefined && newPrice !== item.estimatedPrice) {
        // Patch first — if this throws we do NOT want to report the item as
        // changed in the banner payload. Record the change only on success.
        await ctx.db.patch(item._id, {
          estimatedPrice: newPrice,
          priceSource: newSource,
          priceConfidence: newConfidence,
          updatedAt: now,
        });
        changes.push({
          name: item.name,
          oldPrice: item.estimatedPrice,
          newPrice,
        });
        updated++;
      }
    }

    if (updated > 0) await recalculateListTotal(ctx, args.listId);
    return { updated, total: items.length, changes };
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

    let category = args.suggestedCategory || variantResult?.variant.category || originalItem.category || "Other";
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

    await recalculateListTotal(ctx, args.listId);
    return newItemId;
  },
});
