import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all variants for a base item (e.g., "milk" → [1pt, 2pt, 4pt]).
 * Used by the variant picker in the list planning flow.
 */
export const getByBaseItem = query({
  args: {
    baseItem: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedBase = args.baseItem.toLowerCase().trim();

    return await ctx.db
      .query("itemVariants")
      .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
      .collect();
  },
});

/**
 * Get variants for a base item with prices attached from currentPrices.
 * Returns each variant enriched with its best known price across stores.
 */
export const getWithPrices = query({
  args: {
    baseItem: v.string(),
    storeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedBase = args.baseItem.toLowerCase().trim();

    const variants = await ctx.db
      .query("itemVariants")
      .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
      .collect();

    if (variants.length === 0) return [];

    // For each variant, look up the best price
    const results = await Promise.all(
      variants.map(async (variant) => {
        // Try store-specific price first if store provided
        let prices = await ctx.db
          .query("currentPrices")
          .withIndex("by_item", (q) => q.eq("normalizedName", normalizedBase))
          .collect();

        // Filter to matching variant name if available
        const variantPrices = prices.filter(
          (p) =>
            p.variantName === variant.variantName ||
            p.size === variant.size
        );

        // If store specified, prefer that store's price
        let bestPrice: number | null = null;
        let bestStore: string | null = null;

        if (args.storeName) {
          const storeMatch = variantPrices.find(
            (p) => p.storeName === args.storeName
          );
          if (storeMatch) {
            bestPrice = storeMatch.averagePrice ?? storeMatch.unitPrice;
            bestStore = storeMatch.storeName;
          }
        }

        // Fallback to cheapest across any store
        if (bestPrice === null && variantPrices.length > 0) {
          const sorted = [...variantPrices].sort(
            (a, b) => (a.averagePrice ?? a.unitPrice) - (b.averagePrice ?? b.unitPrice)
          );
          bestPrice = sorted[0].averagePrice ?? sorted[0].unitPrice;
          bestStore = sorted[0].storeName;
        }

        return {
          ...variant,
          price: bestPrice,
          storeName: bestStore,
        };
      })
    );

    // Sort by commonality (most common first), then by price
    return results.sort((a, b) => {
      const commonA = a.commonality ?? 0;
      const commonB = b.commonality ?? 0;
      if (commonB !== commonA) return commonB - commonA;
      if (a.price !== null && b.price !== null) return a.price - b.price;
      return 0;
    });
  },
});

/**
 * Insert a new variant (from AI seeding or receipt discovery).
 * Skips duplicates (same baseItem + variantName).
 */
export const upsert = mutation({
  args: {
    baseItem: v.string(),
    variantName: v.string(),
    size: v.string(),
    unit: v.string(),
    category: v.string(),
    source: v.string(),
    commonality: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const normalizedBase = args.baseItem.toLowerCase().trim();

    // Check for existing variant
    const existing = await ctx.db
      .query("itemVariants")
      .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
      .collect();

    const duplicate = existing.find(
      (v) => v.variantName.toLowerCase() === args.variantName.toLowerCase()
    );

    if (duplicate) {
      // Update commonality if receipt-discovered and existing was ai-seeded
      if (args.source === "receipt_discovered" && duplicate.source === "ai_seeded") {
        await ctx.db.patch(duplicate._id, {
          source: "receipt_discovered",
          commonality: args.commonality ?? (duplicate.commonality ?? 0) + 0.1,
        });
      }
      return duplicate._id;
    }

    return await ctx.db.insert("itemVariants", {
      baseItem: normalizedBase,
      variantName: args.variantName,
      size: args.size,
      unit: args.unit,
      category: args.category,
      source: args.source,
      commonality: args.commonality,
    });
  },
});

/**
 * Bulk insert variants (used by AI seeding after onboarding).
 */
export const bulkUpsert = mutation({
  args: {
    variants: v.array(
      v.object({
        baseItem: v.string(),
        variantName: v.string(),
        size: v.string(),
        unit: v.string(),
        category: v.string(),
        source: v.string(),
        commonality: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;

    for (const variant of args.variants) {
      const normalizedBase = variant.baseItem.toLowerCase().trim();

      const existing = await ctx.db
        .query("itemVariants")
        .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
        .collect();

      const duplicate = existing.find(
        (v) => v.variantName.toLowerCase() === variant.variantName.toLowerCase()
      );

      if (!duplicate) {
        await ctx.db.insert("itemVariants", {
          baseItem: normalizedBase,
          variantName: variant.variantName,
          size: variant.size,
          unit: variant.unit,
          category: variant.category,
          source: variant.source,
          commonality: variant.commonality,
        });
        inserted++;
      }
    }

    return { inserted };
  },
});
