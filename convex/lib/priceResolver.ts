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
    brand?: string;
    productName?: string;
    displayLabel?: string;
    imageStorageId?: Id<"_storage">;
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
  userRegion?: string,
): Promise<ResolvedPrice> {
  const normalizedStore = storeName?.toLowerCase().trim();

  // Layer 1: Personal priceHistory (user's own receipts)
  let bestPersonal: { unitPrice: number; purchaseDate: number; storeName: string } | null = null;
  if (userId) {
    const personalHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_user_item", (q) =>
        q.eq("userId", userId).eq("normalizedName", normalizedItemName)
      )
      .collect();

    if (personalHistory.length > 0) {
      // Filter to matching size AND unit at this store (if store specified)
      let candidates = personalHistory.filter(
        (h) => h.size === variantSize && h.unit === variantUnit
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
        bestPersonal = sorted[0];

        // 3-Day Trust Window: If personal price is < 3 days old, it's the gold standard.
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        if (Date.now() - bestPersonal.purchaseDate < threeDaysMs) {
          return {
            price: bestPersonal.unitPrice,
            priceSource: "personal",
            confidence: 1.0,
            storeName: bestPersonal.storeName,
            reportCount: candidates.length,
          };
        }
        // If older than 3 days, we continue to Layer 2 to see if there's fresher data.
      }
    }
  }

  // Layer 2: Crowdsourced currentPrices
  const currentPrices = await ctx.db
    .query("currentPrices")
    .withIndex("by_item", (q) => q.eq("normalizedName", normalizedItemName))
    .collect();

  if (currentPrices.length > 0) {
    // Use passed userRegion, or fetch from user only if needed
    let resolvedRegion = userRegion;
    if (!resolvedRegion && userId) {
      const user = await ctx.db.get(userId);
      resolvedRegion = user?.postcodePrefix || user?.country || "UK";
    }
    if (!resolvedRegion) resolvedRegion = "UK";
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Filter to matching variant (must match both name+size or just size+unit)
    const variantPrices = currentPrices.filter(
      (p) =>
        p.variantName === variantName ||
        (p.size === variantSize && p.unit === variantUnit)
    );

    if (variantPrices.length > 0) {
      // Find the best crowdsourced match
      let bestCrowdMatch: typeof variantPrices[number] | undefined = undefined;
      let crowdType: "store_region" | "store" | "region" | "global" = "global";

      // Priority 1: Exact Store + Region Match
      if (normalizedStore) {
        bestCrowdMatch = variantPrices.find(
          (p) => (p.storeName?.toLowerCase() === normalizedStore || p.normalizedStoreId === normalizedStore) &&
                 p.region === resolvedRegion
        );
        if (bestCrowdMatch !== undefined) crowdType = "store_region";
      }

      // Priority 2: Store Match (any region) — weighted national average
      if (bestCrowdMatch === undefined && normalizedStore) {
        const storeMatches = variantPrices.filter(
          (p) => p.storeName?.toLowerCase() === normalizedStore ||
            p.normalizedStoreId === normalizedStore
        );
        if (storeMatches.length > 0) {
          // Compute weighted average across all regions for this store
          const totalReports = storeMatches.reduce((sum, p) => sum + p.reportCount, 0);
          const weightedPrice = totalReports > 0
            ? storeMatches.reduce(
                (sum, p) => sum + (p.averagePrice ?? p.unitPrice) * p.reportCount,
                0
              ) / totalReports
            : storeMatches[0].averagePrice ?? storeMatches[0].unitPrice;

          // Use the highest-reportCount entry as the "carrier" for metadata,
          // but override its price with the weighted national average
          const carrier = storeMatches.sort((a, b) => b.reportCount - a.reportCount)[0];
          bestCrowdMatch = { ...carrier, averagePrice: weightedPrice, reportCount: totalReports };
          crowdType = "store";
        }
      }

      // Priority 3: Region Match (any store)
      if (bestCrowdMatch === undefined) {
        bestCrowdMatch = variantPrices.find(p => p.region === resolvedRegion);
        if (bestCrowdMatch !== undefined) crowdType = "region";
      }

      // Priority 4: Global Match — most-reported entry (most representative)
      if (bestCrowdMatch === undefined) {
        bestCrowdMatch = [...variantPrices].sort(
          (a, b) => b.reportCount - a.reportCount
        )[0];
        crowdType = "global";
      }

      if (bestCrowdMatch !== undefined) {
        const age = now - bestCrowdMatch.lastSeenDate;
        const recencyMultiplier = Math.max(0.4, 1 - (age / (thirtyDaysMs * 3)));
        
        let baseConfidence = 0.4;
        if (crowdType === "store_region") baseConfidence = 0.7;
        else if (crowdType === "store") baseConfidence = 0.6;
        else if (crowdType === "region") baseConfidence = 0.5;

        const resolvedCrowd = {
          price: bestCrowdMatch.averagePrice ?? bestCrowdMatch.unitPrice,
          priceSource: "crowdsourced" as const,
          confidence: Math.min(0.95, (baseConfidence + (bestCrowdMatch.reportCount * 0.05)) * recencyMultiplier),
          storeName: bestCrowdMatch.storeName,
          reportCount: bestCrowdMatch.reportCount,
          lastSeenDate: bestCrowdMatch.lastSeenDate
        };

        // Comparison Logic: Pick Crowdsourced if it's fresher than your stale personal price
        if (bestPersonal) {
          const personalAge = now - bestPersonal.purchaseDate;
          const crowdAge = now - resolvedCrowd.lastSeenDate;

          // If crowdsourced data is more recent AND at least moderately confident, use it.
          // OR if crowdsourced is from the same store and has many reports.
          if (crowdAge < personalAge && resolvedCrowd.confidence > 0.6) {
            return resolvedCrowd;
          }

          // Otherwise, fall back to the stale personal price (it's still your data)
          return {
            price: bestPersonal.unitPrice,
            priceSource: "personal",
            confidence: 0.9, // Reduced confidence because it's stale (> 3 days)
            storeName: bestPersonal.storeName,
            reportCount: 1,
          };
        }

        return resolvedCrowd;
      }
    }
  }

  // If no crowdsourced data but we have a stale personal price, use it
  if (bestPersonal) {
    return {
      price: bestPersonal.unitPrice,
      priceSource: "personal",
      confidence: 0.9,
      storeName: bestPersonal.storeName,
      reportCount: 1,
    };
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
  userRegion?: string,
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

  // Fetch user region once for all variants (avoid N user lookups)
  let resolvedUserRegion = userRegion;
  if (!resolvedUserRegion && userId) {
    const user = await ctx.db.get(userId);
    resolvedUserRegion = user?.postcodePrefix || user?.country || "UK";
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
        resolvedUserRegion,
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
