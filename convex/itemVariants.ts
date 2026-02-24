import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import {
  parseSize,
  normalizeSize,
  calculatePricePerUnit,
  getUnitLabel,
} from "./lib/sizeUtils";
import { resolvePrice } from "./lib/priceResolver";
import { normalizeItemName } from "./lib/fuzzyMatch";
import {
  isValidProductName,
  variantKey,
} from "./lib/communityHelpers";
import { toGroceryTitleCase } from "./lib/titleCase";

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
 * Get sizes for an item at a specific store.
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

    // Deduplicate by normalized size — keep the first (best) entry per size
    const seenSizes = new Set<string>();
    const dedupedSizes = sortedSizes.filter((s) => {
      const key = s.sizeNormalized || s.size;
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
      variantName: toGroceryTitleCase(args.variantName),
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
 * Enrich or create a variant from scan data.
 * If a variant with matching baseItem + size exists, enrich it with brand/productName.
 * Otherwise create a new variant. Increments scanCount each time.
 *
 * Community enrichment (updating userCount, lastSeenAt, imageStorageId) is gated on:
 * 1. AI confidence >= 70
 * 2. Valid product name (not garbage OCR)
 */
export const enrichFromScan = mutation({
  args: {
    baseItem: v.string(),
    size: v.string(),
    unit: v.string(),
    category: v.string(),
    brand: v.optional(v.string()),
    productName: v.optional(v.string()),
    displayLabel: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    confidence: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const normalizedBase = args.baseItem.toLowerCase().trim();
    const normalizedSize = args.size.toLowerCase().trim();

    // Determine if community enrichment is allowed
    const confidenceOk = (args.confidence ?? 0) >= 70;
    const nameValid = isValidProductName(args.productName ?? args.baseItem);
    const communityEnrich = confidenceOk && nameValid;

    // Try exact baseItem match first
    let existing = await ctx.db
      .query("itemVariants")
      .withIndex("by_base_item", (q) => q.eq("baseItem", normalizedBase))
      .collect();

    // Fuzzy fallback: if no match, check if any baseItem is a suffix of
    // the scanned name (e.g. scanned "free range eggs" -> DB has "eggs")
    if (existing.length === 0) {
      const words = normalizedBase.split(/\s+/);
      for (let i = 1; i < words.length; i++) {
        const suffix = words.slice(i).join(" ");
        const fallback = await ctx.db
          .query("itemVariants")
          .withIndex("by_base_item", (q) => q.eq("baseItem", suffix))
          .collect();
        if (fallback.length > 0) {
          existing = fallback;
          break;
        }
      }
    }

    // Compute variant key for community dedup
    const scanKey = variantKey(
      args.productName ?? args.baseItem,
      args.size
    );

    // Match by size (normalized) OR by variant key for community matching
    const match =
      existing.find((v) => v.size.toLowerCase().trim() === normalizedSize) ??
      (communityEnrich
        ? existing.find(
            (v) =>
              variantKey(v.productName ?? v.variantName, v.size) === scanKey
          )
        : undefined);

    if (match) {
      // Enrich existing variant with scan data -- newer scans overwrite
      const updates: Record<string, unknown> = {
        scanCount: (match.scanCount ?? 0) + 1,
      };
      if (args.brand) updates.brand = args.brand;
      if (args.productName) updates.productName = args.productName;
      if (args.displayLabel) updates.displayLabel = args.displayLabel;
      if (args.estimatedPrice != null) {
        updates.estimatedPrice = args.estimatedPrice;
      }
      if (match.source === "ai_seeded") updates.source = "scan_enriched";

      // Community enrichment: update shared fields when gating passes
      if (communityEnrich) {
        updates.lastSeenAt = Date.now();
        updates.userCount = (match.userCount ?? 0) + 1;
        // First image wins -- only set if not already present
        if (!match.imageStorageId && args.imageStorageId) {
          updates.imageStorageId = args.imageStorageId;
        }
      }

      await ctx.db.patch(match._id, updates);
      return match._id;
    }

    // Create new variant under the existing baseItem if we found one,
    // otherwise use the scanned name
    const targetBase = existing.length > 0 ? existing[0].baseItem : normalizedBase;
    const newVariantName = args.productName
      ? `${args.productName} ${args.size}`
      : `${args.baseItem} ${args.size}`;

    return await ctx.db.insert("itemVariants", {
      baseItem: targetBase,
      variantName: toGroceryTitleCase(newVariantName),
      size: args.size,
      unit: args.unit,
      category: args.category,
      source: "scan_enriched",
      brand: args.brand,
      productName: args.productName,
      displayLabel: args.displayLabel,
      estimatedPrice: args.estimatedPrice,
      scanCount: 1,
      // Community fields on new variants (if gating passes)
      ...(communityEnrich
        ? {
            userCount: 1,
            lastSeenAt: Date.now(),
            ...(args.imageStorageId
              ? { imageStorageId: args.imageStorageId }
              : {}),
          }
        : {}),
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
          variantName: toGroceryTitleCase(variant.variantName),
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

/**
 * Get popular scan-verified items for onboarding seeding.
 * Returns items grouped by category, sorted by scanCount/userCount.
 * Only returns items with source !== "ai_seeded" (i.e., verified by real scans).
 */
export const getPopularForSeeding = internalQuery({
  args: {
    categories: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;

    // Get all variants that have been scan-verified
    // We can't filter by source in the index, so we fetch and filter
    const allVariants = await ctx.db
      .query("itemVariants")
      .collect();

    // Filter to scan-verified items with meaningful data
    const verified = allVariants.filter((variant) => {
      if (variant.source === "ai_seeded") return false; // Skip pure AI seeds
      if ((variant.scanCount ?? 0) < 1) return false; // Must have been scanned at least once
      if (!variant.baseItem || !variant.size || !variant.unit) return false; // Must have complete data
      return true;
    });

    // If categories provided, filter to matching categories
    let filtered = verified;
    if (args.categories && args.categories.length > 0) {
      const catSet = new Set(args.categories.map((c) => c.toLowerCase()));
      filtered = verified.filter((variant) => catSet.has(variant.category.toLowerCase()));
    }

    // Sort by community engagement: userCount desc, then scanCount desc
    filtered.sort((a, b) => {
      const userDiff = (b.userCount ?? 0) - (a.userCount ?? 0);
      if (userDiff !== 0) return userDiff;
      return (b.scanCount ?? 0) - (a.scanCount ?? 0);
    });

    // Deduplicate by baseItem (keep the most popular variant per item)
    const seenBase = new Set<string>();
    const deduped = filtered.filter((variant) => {
      if (seenBase.has(variant.baseItem)) return false;
      seenBase.add(variant.baseItem);
      return true;
    });

    return deduped.slice(0, limit).map((variant) => ({
      name: variant.productName ?? variant.variantName,
      category: variant.category,
      size: variant.size,
      unit: variant.unit,
      brand: variant.brand,
      estimatedPrice: variant.estimatedPrice,
      source: variant.source,
      scanCount: variant.scanCount ?? 0,
      userCount: variant.userCount ?? 0,
    }));
  },
});
