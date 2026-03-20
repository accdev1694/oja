import { v } from "convex/values";
import { query } from "../_generated/server";
import {
  normalizeSize,
  calculatePricePerUnit,
  getUnitLabel,
} from "../lib/sizeUtils";
import { resolvePrice } from "../lib/priceResolver";

// Count-like suffixes that all represent the same "X units" concept
const COUNT_WORDS = new Set([
  "", "pk", "pack", "packs", "x",
  "eggs", "egg", "pieces", "pcs",
  "units", "items", "rolls", "roll",
  "sheets", "bags", "bag", "count",
]);

/**
 * Generate a deduplication key for variant sizes.
 * Normalizes count-like sizes (e.g., "12pk", "12 eggs", "12") to the same key
 * so they collapse into a single entry instead of showing as duplicates.
 */
function getSizeDeduplicationKey(
  /** @type {string} */ size: string,
  /** @type {string} */ sizeNormalized: string,
) {
  const numMatch = size.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!numMatch) return sizeNormalized || size;

  const num = numMatch[1];
  const rest = numMatch[2].toLowerCase().trim();

  if (COUNT_WORDS.has(rest)) return `count:${num}`;
  return sizeNormalized || size;
}

/**
 * Get all variants for a base item (e.g., "milk" -> [1pt, 2pt, 4pt]).
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
 * Get variants for a base item with prices from the 3-layer cascade:
 * 1. Personal priceHistory (user's own receipts) -- highest trust
 * 2. Crowdsourced currentPrices (all users' receipts) -- good trust
 * 3. AI-estimated variant price -- baseline fallback
 *
 * Returns each variant enriched with price, priceSource, reportCount, storeName.
 */
export const getWithPrices = query({
  args: {
    baseItem: v.string(),
    storeName: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const normalizedBase = args.baseItem.toLowerCase().trim();

    const variants = await ctx.db
      .query("itemVariants")
      .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
      .collect();

    if (variants.length === 0) return [];

    // Resolve user region for crowdsourced price filtering
    let userRegion = "UK";
    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (user) {
        userRegion = user.postcodePrefix || user.country || "UK";
      }
    }

    // Layer 1: Personal priceHistory (if userId provided)
    let personalHistory: {
      normalizedName: string;
      size?: string;
      unit?: string;
      unitPrice: number;
      storeName: string;
      purchaseDate: number;
    }[] = [];

    if (args.userId) {
      personalHistory = await ctx.db
        .query("priceHistory")
        .withIndex("by_user_item", (q) =>
          q.eq("userId", args.userId!).eq("normalizedName", normalizedBase)
        )
        .collect();
    }

    // For each variant, look up the best price via cascade
    const results = await Promise.all(
      variants.map(async (variant) => {
        let bestPrice: number | null = null;
        let bestStore: string | null = null;
        let reportCount = 0;
        let priceSource: "personal" | "crowdsourced" | "ai_estimate" = "ai_estimate";

        // Layer 1: Personal priceHistory -- most recent matching entry
        if (personalHistory.length > 0) {
          const matching = personalHistory
            .filter((h) => h.size === variant.size || h.unit === variant.unit)
            .sort((a, b) => b.purchaseDate - a.purchaseDate);

          if (matching.length > 0) {
            bestPrice = matching[0].unitPrice;
            bestStore = matching[0].storeName;
            reportCount = matching.length;
            priceSource = "personal";
          }
        }

        // Layer 2: Crowdsourced currentPrices (region-aware 4-tier priority)
        if (bestPrice === null) {
          const prices = await ctx.db
            .query("currentPrices")
            .withIndex("by_item", (q) => q.eq("normalizedName", normalizedBase))
            .collect();

          const variantPrices = prices.filter(
            (p) =>
              p.variantName === variant.variantName ||
              p.size === variant.size
          );

          if (variantPrices.length > 0) {
            const normalizedStore = args.storeName?.toLowerCase().trim();
            let crowdMatch;

            // Priority 1: Store + Region
            if (normalizedStore && userRegion) {
              crowdMatch = variantPrices.find(
                (p) =>
                  (p.storeName?.toLowerCase() === normalizedStore ||
                    p.normalizedStoreId === normalizedStore) &&
                  p.region === userRegion
              );
            }

            // Priority 2: Store (any region) — pick highest reportCount
            if (!crowdMatch && normalizedStore) {
              const storeMatches = variantPrices.filter(
                (p) =>
                  p.storeName?.toLowerCase() === normalizedStore ||
                  p.normalizedStoreId === normalizedStore
              );
              if (storeMatches.length > 0) {
                crowdMatch = storeMatches.sort(
                  (a, b) => b.reportCount - a.reportCount
                )[0];
              }
            }

            // Priority 3: Region (any store)
            if (!crowdMatch && userRegion) {
              crowdMatch = variantPrices.find(
                (p) => p.region === userRegion
              );
            }

            // Priority 4: Most-reported entry (most representative)
            if (!crowdMatch) {
              crowdMatch = [...variantPrices].sort(
                (a, b) => b.reportCount - a.reportCount
              )[0];
            }

            if (crowdMatch) {
              bestPrice = crowdMatch.averagePrice ?? crowdMatch.unitPrice;
              bestStore = crowdMatch.storeName;
              reportCount = crowdMatch.reportCount;
              priceSource = "crowdsourced";
            }
          }
        }

        // Layer 3: AI-estimated price from the variant itself
        if (bestPrice === null && variant.estimatedPrice != null) {
          bestPrice = variant.estimatedPrice;
          priceSource = "ai_estimate";
          reportCount = 0;
        }

        return {
          ...variant,
          price: bestPrice,
          storeName: bestStore,
          reportCount,
          priceSource,
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
 * Get sizes for an item at a specific store.
 *
 * Uses the 3-layer price cascade:
 * 1. Personal priceHistory (user's own receipts) -- highest trust
 * 2. Crowdsourced currentPrices (all users' receipts) -- good trust
 * 3. AI-estimated variant price -- baseline fallback
 *
 * Returns sizes with pricePerUnit, confidence, isUsual indicator, and defaultSize.
 */
export const getSizesForStore = query({
  args: {
    itemName: v.string(),
    store: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const normalizedItem = args.itemName.toLowerCase().trim();
    const normalizedStore = args.store.toLowerCase().trim();

    // Get user if authenticated
    let user = null;
    if (identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();
    }

    // Get all variants for this item
    const variants = await ctx.db
      .query("itemVariants")
      .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedItem))
      .collect();

    if (variants.length === 0) {
      return {
        itemName: args.itemName,
        store: args.store,
        sizes: [],
        defaultSize: null,
      };
    }

    // Find user's usual size (most frequently purchased at this store)
    let usualSize: string | undefined;
    if (user) {
      const personalHistory = await ctx.db
        .query("priceHistory")
        .withIndex("by_user_item", (q) =>
          q.eq("userId", user!._id).eq("normalizedName", normalizedItem)
        )
        .collect();

      const usualSizeAtStore = personalHistory
        .filter((h) => h.storeName.toLowerCase() === normalizedStore)
        .reduce((acc, h) => {
          const size = h.size ?? "";
          acc[size] = (acc[size] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      usualSize = Object.entries(usualSizeAtStore)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
    }

    // Process each variant with shared price cascade
    const sizes = await Promise.all(
      variants.map(async (variant) => {
        const resolved = await resolvePrice(
          ctx,
          normalizedItem,
          variant.size,
          variant.unit,
          variant.variantName,
          normalizedStore,
          user?._id,
          variant.estimatedPrice,
        );

        // Calculate price per unit
        const pricePerUnit = resolved.price !== null
          ? calculatePricePerUnit(resolved.price, variant.size)
          : null;

        const unitLabel = getUnitLabel(variant.size);

        return {
          size: variant.size,
          sizeNormalized: normalizeSize(variant.size),
          unit: variant.unit,
          price: resolved.price,
          pricePerUnit,
          unitLabel,
          source: resolved.priceSource,
          confidence: resolved.confidence,
          isUsual: variant.size === usualSize,
          brand: variant.brand,
          productName: variant.productName,
          displayLabel: variant.displayLabel,
        };
      })
    );

    // Sort by commonality (from variant), then by price
    const sortedSizes = sizes.sort((a, b) => {
      // Usual size first
      if (a.isUsual && !b.isUsual) return -1;
      if (!a.isUsual && b.isUsual) return 1;
      // Then by price (cheapest first)
      if (a.price !== null && b.price !== null) return a.price - b.price;
      if (a.price !== null) return -1;
      if (b.price !== null) return 1;
      return 0;
    });

    // Deduplicate by normalized size -- keep the first (best) entry per size
    // Uses count-aware keys so "12pk", "12 eggs", "12" all collapse to one entry
    const seenSizes = new Set();
    const dedupedSizes = sortedSizes.filter((s) => {
      const key = getSizeDeduplicationKey(s.size, s.sizeNormalized);
      if (seenSizes.has(key)) return false;
      seenSizes.add(key);
      return true;
    });

    // Determine default size
    const defaultSize =
      usualSize ??
      dedupedSizes.find((s) => s.price !== null)?.size ??
      dedupedSizes[0]?.size ??
      null;

    return {
      itemName: args.itemName,
      store: args.store,
      sizes: dedupedSizes,
      defaultSize,
    };
  },
});

