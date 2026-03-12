import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";

export const getEstimate = query({
  args: { itemName: v.string() },
  handler: async (ctx, args) => {
    const normalizedName = args.itemName.toLowerCase().trim();
    const prices = await ctx.db.query("currentPrices").withIndex("by_item", (q) => q.eq("normalizedName", normalizedName)).collect();
    if (prices.length === 0) return null;

    const sorted = [...prices].sort((a, b) => a.unitPrice - b.unitPrice);
    const avg = prices.reduce((sum, p) => sum + p.unitPrice, 0) / prices.length;

    return {
      cheapest: {
        price: sorted[0].unitPrice,
        storeName: sorted[0].storeName,
        lastSeen: sorted[0].lastSeenDate,
        confidence: sorted[0].confidence,
      },
      average: avg,
      storeCount: prices.length,
    };
  },
});

export const batchGetEstimates = query({
  args: { itemNames: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results: Record<string, { cheapest: number; storeName: string; average: number; confidence?: number } | null> = {};
    for (const name of args.itemNames) {
      const normalizedName = name.toLowerCase().trim();
      const prices = await ctx.db.query("currentPrices").withIndex("by_item", (q) => q.eq("normalizedName", normalizedName)).collect();
      if (prices.length === 0) {
        results[name] = null;
        continue;
      }
      const sorted = [...prices].sort((a, b) => a.unitPrice - b.unitPrice);
      const avg = prices.reduce((sum, p) => sum + p.unitPrice, 0) / prices.length;
      results[name] = {
        cheapest: sorted[0].unitPrice,
        storeName: sorted[0].storeName,
        average: avg,
        confidence: sorted[0].confidence,
      };
    }
    return results;
  },
});

export const getComparisonByStores = query({
  args: { itemName: v.string(), size: v.optional(v.string()), storeIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const normalizedName = args.itemName.toLowerCase().trim();
    const allPrices = await ctx.db.query("currentPrices").withIndex("by_item", (q) => q.eq("normalizedName", normalizedName)).collect();
    const sizeFilteredPrices = args.size ? allPrices.filter((p) => p.size === args.size) : allPrices;

    const result: Record<string, { price: number; confidence: number; lastSeen: number; size?: string; unit?: string } | null> = {};
    for (const storeId of args.storeIds) {
      const storePrice = sizeFilteredPrices.find((p) => p.normalizedStoreId === storeId || p.storeName.toLowerCase().includes(storeId.toLowerCase()));
      if (storePrice) {
        result[storeId] = {
          price: storePrice.unitPrice,
          confidence: storePrice.confidence ?? 0,
          lastSeen: storePrice.lastSeenDate,
          size: storePrice.size,
          unit: storePrice.unit,
        };
      } else {
        result[storeId] = null;
      }
    }

    const availablePrices = Object.entries(result).filter(([, data]) => data !== null).map(([storeId, data]) => ({ storeId, ...data! }));
    const cheapestStore = availablePrices.length > 0 ? availablePrices.reduce((min, curr) => curr.price < min.price ? curr : min) : null;
    const averagePrice = availablePrices.length > 0 ? availablePrices.reduce((sum, p) => sum + p.price, 0) / availablePrices.length : null;

    return {
      byStore: result,
      cheapestStore: cheapestStore?.storeId ?? null,
      cheapestPrice: cheapestStore?.price ?? null,
      averagePrice,
      storesWithData: availablePrices.length,
    };
  },
});

export const getBatchPrices = internalQuery({
  args: { normalizedNames: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results: Record<string, { price: number; storeName: string; confidence: number }> = {};
    for (const name of args.normalizedNames) {
      const prices = await ctx.db.query("currentPrices").withIndex("by_item", (q) => q.eq("normalizedName", name)).collect();
      const verified = prices.filter((p) => (p.reportCount ?? 0) > 0);
      if (verified.length === 0) continue;
      verified.sort((a, b) => a.unitPrice - b.unitPrice);
      const best = verified[0];
      results[name] = { price: best.unitPrice, storeName: best.storeName, confidence: best.confidence ?? 0 };
    }
    return results;
  },
});
