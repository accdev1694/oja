import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  parseSize,
  normalizeSize,
  calculatePricePerUnit,
  getUnitLabel,
} from "./lib/sizeUtils";

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
 * Get variants for a base item with prices from the 3-layer cascade:
 * 1. Personal priceHistory (user's own receipts) — highest trust
 * 2. Crowdsourced currentPrices (all users' receipts) — good trust
 * 3. AI-estimated variant price — baseline fallback
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

    // Layer 1: Personal priceHistory (if userId provided)
    let personalHistory: Array<{
      normalizedName: string;
      size?: string;
      unit?: string;
      unitPrice: number;
      storeName: string;
      purchaseDate: number;
    }> = [];

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

        // Layer 1: Personal priceHistory — most recent matching entry
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

        // Layer 2: Crowdsourced currentPrices
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

          // If store specified, prefer that store's price
          if (args.storeName) {
            const storeMatch = variantPrices.find(
              (p) => p.storeName === args.storeName
            );
            if (storeMatch) {
              bestPrice = storeMatch.averagePrice ?? storeMatch.unitPrice;
              bestStore = storeMatch.storeName;
              reportCount = storeMatch.reportCount;
              priceSource = "crowdsourced";
            }
          }

          // Fallback to cheapest across any store
          if (bestPrice === null && variantPrices.length > 0) {
            const sorted = [...variantPrices].sort(
              (a, b) => (a.averagePrice ?? a.unitPrice) - (b.averagePrice ?? b.unitPrice)
            );
            bestPrice = sorted[0].averagePrice ?? sorted[0].unitPrice;
            bestStore = sorted[0].storeName;
            reportCount = sorted[0].reportCount;
            priceSource = "crowdsourced";
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
 * Get sizes for an item at a specific store, formatted for the SizePriceModal.
 *
 * Uses the 3-layer price cascade:
 * 1. Personal priceHistory (user's own receipts) — highest trust
 * 2. Crowdsourced currentPrices (all users' receipts) — good trust
 * 3. AI-estimated variant price — baseline fallback
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

    // Get personal price history if user exists
    let personalHistory: Array<{
      normalizedName: string;
      size?: string;
      unit?: string;
      unitPrice: number;
      storeName: string;
      purchaseDate: number;
    }> = [];

    if (user) {
      personalHistory = await ctx.db
        .query("priceHistory")
        .withIndex("by_user_item", (q) =>
          q.eq("userId", user!._id).eq("normalizedName", normalizedItem)
        )
        .collect();
    }

    // Find user's usual size (most frequently purchased at this store)
    const usualSizeAtStore = personalHistory
      .filter((h) => h.storeName.toLowerCase() === normalizedStore)
      .reduce((acc, h) => {
        const size = h.size ?? "";
        acc[size] = (acc[size] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const usualSize = Object.entries(usualSizeAtStore)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    // Process each variant with price cascade
    const sizes = await Promise.all(
      variants.map(async (variant) => {
        let price: number | null = null;
        let priceSource: "personal" | "crowdsourced" | "ai" = "ai";
        let confidence = 0.5;

        // Layer 1: Personal priceHistory at this store
        const personalMatch = personalHistory
          .filter(
            (h) =>
              h.storeName.toLowerCase() === normalizedStore &&
              (h.size === variant.size || h.unit === variant.unit)
          )
          .sort((a, b) => b.purchaseDate - a.purchaseDate)[0];

        if (personalMatch) {
          price = personalMatch.unitPrice;
          priceSource = "personal";
          confidence = 1.0;
        }

        // Layer 2: Crowdsourced currentPrices
        if (price === null) {
          const currentPrice = await ctx.db
            .query("currentPrices")
            .withIndex("by_item", (q) => q.eq("normalizedName", normalizedItem))
            .collect()
            .then((prices) =>
              prices.find(
                (p) =>
                  p.storeName?.toLowerCase() === normalizedStore &&
                  (p.size === variant.size || p.variantName === variant.variantName)
              )
            );

          if (currentPrice) {
            price = currentPrice.averagePrice ?? currentPrice.unitPrice;
            priceSource = "crowdsourced";
            confidence = Math.min(0.9, 0.6 + (currentPrice.reportCount * 0.05));
          }
        }

        // Layer 3: AI estimate from variant
        if (price === null && variant.estimatedPrice != null) {
          price = variant.estimatedPrice;
          priceSource = "ai";
          confidence = 0.5;
        }

        // Calculate price per unit
        const pricePerUnit = price !== null
          ? calculatePricePerUnit(price, variant.size)
          : null;

        const unitLabel = getUnitLabel(variant.size);

        return {
          size: variant.size,
          sizeNormalized: normalizeSize(variant.size),
          price,
          pricePerUnit,
          unitLabel,
          source: priceSource,
          confidence,
          isUsual: variant.size === usualSize,
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

    // Determine default size
    const defaultSize =
      usualSize ??
      sortedSizes.find((s) => s.price !== null)?.size ??
      sortedSizes[0]?.size ??
      null;

    return {
      itemName: args.itemName,
      store: args.store,
      sizes: sortedSizes,
      defaultSize,
    };
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
    estimatedPrice: v.optional(v.number()),
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
      // Update estimatedPrice if provided and not already set
      if (args.estimatedPrice != null && duplicate.estimatedPrice == null) {
        await ctx.db.patch(duplicate._id, {
          estimatedPrice: args.estimatedPrice,
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
      estimatedPrice: args.estimatedPrice,
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
        estimatedPrice: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const variant of args.variants) {
      const normalizedBase = variant.baseItem.toLowerCase().trim();

      const existing = await ctx.db
        .query("itemVariants")
        .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
        .collect();

      const duplicate = existing.find(
        (v) => v.variantName.toLowerCase() === variant.variantName.toLowerCase()
      );

      if (duplicate) {
        // Update estimatedPrice if provided and not already set
        if (variant.estimatedPrice != null && duplicate.estimatedPrice == null) {
          await ctx.db.patch(duplicate._id, {
            estimatedPrice: variant.estimatedPrice,
          });
          updated++;
        }
      } else {
        await ctx.db.insert("itemVariants", {
          baseItem: normalizedBase,
          variantName: variant.variantName,
          size: variant.size,
          unit: variant.unit,
          category: variant.category,
          source: variant.source,
          commonality: variant.commonality,
          estimatedPrice: variant.estimatedPrice,
        });
        inserted++;
      }
    }

    return { inserted, updated };
  },
});
