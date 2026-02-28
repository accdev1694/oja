/**
 * Price Resolver - Shared 3-layer price cascade logic
 *
 * Extracted from itemVariants.ts for reuse across:
 * - getSizesForStore query (size/price modal)
 * - addFromPantryBulk mutation (bulk list item creation)
 * - switchStore mutation (re-pricing on store change)
 * - Any future price resolution needs
 *
 * 3-Layer Cascade:
 * 1. Personal priceHistory (user's own receipts) -- highest trust
 * 2. Crowdsourced currentPrices (all users' receipts) -- good trust
 * 3. AI-estimated variant price -- baseline fallback
 */

import { Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type PriceSource = "personal" | "crowdsourced" | "ai";

export interface ResolvedPrice {
  /** The resolved price, or null if no price found at all */
  price: number | null;
  /** Where the price came from */
  priceSource: PriceSource;
  /** 0-1 confidence score */
  confidence: number;
  /** Store name the price is from (if personal or crowdsourced) */
  storeName: string | null;
  /** Number of receipt reports contributing to this price */
  reportCount: number;
}

export interface ResolvedVariantWithPrice {
  /** The variant document */
  variant: {
    _id: Id<"itemVariants">;
    baseItem: string;
    variantName: string;
    size: string;
    unit: string;
    category: string;
    source: string;
    commonality?: number;
    estimatedPrice?: number;
  };
  /** Resolved price info */
  price: number | null;
  priceSource: PriceSource;
  confidence: number;
}

/** Convex context that supports both queries and mutations (both have db + auth) */
type DbCtx = QueryCtx | MutationCtx;

// -----------------------------------------------------------------------------
// Core Price Cascade
// -----------------------------------------------------------------------------

/**
 * Resolves the best price for an item+size combination at a given store
 * using the 3-layer cascade:
 *   1. Personal priceHistory (user's own receipts)
 *   2. Crowdsourced currentPrices (all users' receipts)
 *   3. AI-estimated variant price
 *
 * @param ctx - Convex query or mutation context
 * @param normalizedItemName - Lowercase trimmed item base name (e.g. "milk")
 * @param variantSize - The size string to match (e.g. "2 pints")
 * @param variantUnit - The unit string to match (e.g. "pint")
 * @param variantName - Optional variant display name for crowdsourced matching
 * @param storeName - The store to look up prices for (lowercase)
 * @param userId - Optional user ID for personal history lookup
 * @param aiEstimatedPrice - Optional AI-generated price from the variant
 */
export async function resolvePrice(
  ctx: DbCtx,
  normalizedItemName: string,
  variantSize: string,
  variantUnit: string,
  variantName: string | undefined,
  storeName: string | undefined,
  userId: Id<"users"> | undefined,
  aiEstimatedPrice: number | undefined,
): Promise<ResolvedPrice> {
  const normalizedStore = storeName?.toLowerCase().trim();

  // Layer 1: Personal priceHistory (user's own receipts)
  if (userId) {
    const personalHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_user_item", (q) =>
        q.eq("userId", userId).eq("normalizedName", normalizedItemName)
      )
      .collect();

    if (personalHistory.length > 0) {
      // Filter to matching size/unit at this store (if store specified)
      let candidates = personalHistory.filter(
        (h) => h.size === variantSize || h.unit === variantUnit
      );

      if (normalizedStore) {
        const storeFiltered = candidates.filter(
          (h) => h.storeName.toLowerCase() === normalizedStore
        );
        if (storeFiltered.length > 0) {
          candidates = storeFiltered;
        }
      }

      if (candidates.length > 0) {
        // Use most recent entry
        const sorted = candidates.sort((a, b) => b.purchaseDate - a.purchaseDate);
        return {
          price: sorted[0].unitPrice,
          priceSource: "personal",
          confidence: 1.0,
          storeName: sorted[0].storeName,
          reportCount: candidates.length,
        };
      }
    }
  }

  // Layer 2: Crowdsourced currentPrices
  const currentPrices = await ctx.db
    .query("currentPrices")
    .withIndex("by_item", (q) => q.eq("normalizedName", normalizedItemName))
    .collect();

  if (currentPrices.length > 0) {
    const user = userId ? await ctx.db.get(userId) : null;
    const userRegion = user?.country || "UK"; // Fallback to country/UK for now
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Filter to matching variant
    const variantPrices = currentPrices.filter(
      (p) =>
        p.variantName === variantName ||
        p.size === variantSize
    );

    if (variantPrices.length > 0) {
      // Priority 1: Exact Store + Region Match
      if (normalizedStore) {
        const bestMatch = variantPrices.find(
          (p) => (p.storeName?.toLowerCase() === normalizedStore || p.normalizedStoreId === normalizedStore) && 
                 p.region === userRegion
        );
        if (bestMatch) {
          const age = now - bestMatch.lastSeenDate;
          const recencyMultiplier = Math.max(0.7, 1 - (age / (thirtyDaysMs * 3))); // Decay over 90 days
          return {
            price: bestMatch.averagePrice ?? bestMatch.unitPrice,
            priceSource: "crowdsourced",
            confidence: Math.min(0.95, (0.7 + (bestMatch.reportCount * 0.05)) * recencyMultiplier),
            storeName: bestMatch.storeName,
            reportCount: bestMatch.reportCount,
          };
        }
      }

      // Priority 2: Store Match (any region)
      if (normalizedStore) {
        const storeMatch = variantPrices.find(
          (p) => p.storeName?.toLowerCase() === normalizedStore ||
            p.normalizedStoreId === normalizedStore
        );
        if (storeMatch) {
          const age = now - storeMatch.lastSeenDate;
          const recencyMultiplier = Math.max(0.6, 1 - (age / (thirtyDaysMs * 3)));
          return {
            price: storeMatch.averagePrice ?? storeMatch.unitPrice,
            priceSource: "crowdsourced",
            confidence: Math.min(0.9, (0.6 + (storeMatch.reportCount * 0.05)) * recencyMultiplier),
            storeName: storeMatch.storeName,
            reportCount: storeMatch.reportCount,
          };
        }
      }

      // Priority 3: Region Match (any store) - e.g. "General price in London"
      const regionMatch = variantPrices.find(p => p.region === userRegion);
      if (regionMatch) {
        const age = now - regionMatch.lastSeenDate;
        const recencyMultiplier = Math.max(0.5, 1 - (age / (thirtyDaysMs * 3)));
        return {
          price: regionMatch.averagePrice ?? regionMatch.unitPrice,
          priceSource: "crowdsourced",
          confidence: Math.min(0.85, (0.5 + (regionMatch.reportCount * 0.05)) * recencyMultiplier),
          storeName: regionMatch.storeName,
          reportCount: regionMatch.reportCount,
        };
      }

      // Priority 4: Cheapest across any store/region
      const sorted = [...variantPrices].sort(
        (a, b) => (a.averagePrice ?? a.unitPrice) - (b.averagePrice ?? b.unitPrice)
      );
      const age = now - sorted[0].lastSeenDate;
      const recencyMultiplier = Math.max(0.4, 1 - (age / (thirtyDaysMs * 3)));
      return {
        price: sorted[0].averagePrice ?? sorted[0].unitPrice,
        priceSource: "crowdsourced",
        confidence: Math.min(0.8, (0.4 + (sorted[0].reportCount * 0.05)) * recencyMultiplier),
        storeName: sorted[0].storeName,
        reportCount: sorted[0].reportCount,
      };
    }
  }

  // Layer 3: AI-estimated price
  if (aiEstimatedPrice != null) {
    return {
      price: aiEstimatedPrice,
      priceSource: "ai",
      confidence: 0.5,
      storeName: null,
      reportCount: 0,
    };
  }

  // No price found at all
  return {
    price: null,
    priceSource: "ai",
    confidence: 0,
    storeName: null,
    reportCount: 0,
  };
}

// -----------------------------------------------------------------------------
// Variant Resolution
// -----------------------------------------------------------------------------

/**
 * Finds the best variant for an item at a given store and resolves its price.
 *
 * Selection priority:
 *   1. Highest commonality variant at this store that has a price
 *   2. Cheapest variant with a price
 *   3. Any variant (no price)
 *
 * @param ctx - Convex query or mutation context
 * @param itemName - Base item name (e.g. "milk") - will be normalized
 * @param normalizedStoreId - Store ID (e.g. "tesco") or undefined
 * @param userId - Optional user ID for personal history lookup
 */
export async function resolveVariantWithPrice(
  ctx: DbCtx,
  itemName: string,
  normalizedStoreId: string | undefined,
  userId: Id<"users"> | undefined,
): Promise<ResolvedVariantWithPrice | null> {
  const normalizedBase = itemName.toLowerCase().trim();

  // Get all variants for this item
  const variants = await ctx.db
    .query("itemVariants")
    .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
    .collect();

  if (variants.length === 0) {
    return null;
  }

  // Resolve prices for all variants
  const resolved = await Promise.all(
    variants.map(async (variant) => {
      const priceInfo = await resolvePrice(
        ctx,
        normalizedBase,
        variant.size,
        variant.unit,
        variant.variantName,
        normalizedStoreId,
        userId,
        variant.estimatedPrice,
      );
      return {
        variant,
        price: priceInfo.price,
        priceSource: priceInfo.priceSource,
        confidence: priceInfo.confidence,
      };
    })
  );

  // Sort by: commonality desc, then price asc (with priced items first)
  const sorted = resolved.sort((a, b) => {
    // Items with prices come first
    if (a.price !== null && b.price === null) return -1;
    if (a.price === null && b.price !== null) return 1;

    // Higher commonality first
    const commonA = a.variant.commonality ?? 0;
    const commonB = b.variant.commonality ?? 0;
    if (commonB !== commonA) return commonB - commonA;

    // Cheapest first
    if (a.price !== null && b.price !== null) return a.price - b.price;

    return 0;
  });

  return sorted[0];
}
