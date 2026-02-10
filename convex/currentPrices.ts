import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizeStoreName } from "./lib/storeNormalizer";

/** Confidence score: higher reportCount + more recent = higher confidence (0-1) */
function computeConfidence(reportCount: number, daysSinceLastSeen: number): number {
  // Base confidence from report count (max 0.5 from count alone)
  const countFactor = Math.min(reportCount / 10, 0.5);
  // Recency factor (max 0.5 from recency, decays over 30 days)
  const recencyFactor = Math.max(0, 0.5 * (1 - daysSinceLastSeen / 30));
  return Math.min(countFactor + recencyFactor, 1);
}

/**
 * Weighted 30-day average: newer prices weigh more.
 * weight = max(0, 1 - (daysSincePurchase / 30))
 * Prices older than 30 days get zero weight (the existing average represents them).
 */
function computeWeightedAverage(
  existingAverage: number,
  existingCount: number,
  newPrice: number,
  daysSincePurchase: number
): number {
  const newWeight = Math.max(0, 1 - daysSincePurchase / 30);
  // Existing average represents accumulated history; give it a base weight
  // that decays as the data ages, but at least 0.3 to prevent wild swings
  const existingWeight = Math.max(0.3, 1 - (existingCount > 1 ? 0.1 : 0));
  const totalWeight = existingWeight + newWeight;
  if (totalWeight === 0) return newPrice;
  return (existingAverage * existingWeight + newPrice * newWeight) / totalWeight;
}

/**
 * Upsert current prices from a confirmed receipt.
 * For each item, if a newer price exists we skip; otherwise we update.
 * Passes through size/unit from receipt items when available.
 * Computes confidence score based on report count and recency.
 */
export const upsertFromReceipt = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) {
      throw new Error("Receipt not found or unauthorized");
    }

    const now = Date.now();
    let upsertCount = 0;
    let variantsDiscovered = 0;

    // Normalize store name once for all items
    const normalizedStoreId = normalizeStoreName(receipt.storeName);

    for (const item of receipt.items) {
      const normalizedName = item.name.toLowerCase().trim();

      // Look up existing row for this item + store
      const existing = await ctx.db
        .query("currentPrices")
        .withIndex("by_item_store", (q) =>
          q.eq("normalizedName", normalizedName).eq("storeName", receipt.storeName)
        )
        .first();

      const daysSinceReceipt = Math.max(0, (now - receipt.purchaseDate) / (1000 * 60 * 60 * 24));

      if (existing) {
        // Only update if receipt date is newer
        if (receipt.purchaseDate >= existing.lastSeenDate) {
          const newReportCount = existing.reportCount + 1;
          const confidence = computeConfidence(newReportCount, daysSinceReceipt);

          await ctx.db.patch(existing._id, {
            unitPrice: item.unitPrice,
            itemName: item.name,
            // Pass through size/unit from receipt when available
            ...(item.size && { size: item.size }),
            ...(item.unit && { unit: item.unit }),
            // Update normalized store ID if available
            ...(normalizedStoreId && { normalizedStoreId }),
            // Update aggregated price data
            minPrice: existing.minPrice !== undefined
              ? Math.min(existing.minPrice, item.unitPrice)
              : item.unitPrice,
            maxPrice: existing.maxPrice !== undefined
              ? Math.max(existing.maxPrice, item.unitPrice)
              : item.unitPrice,
            averagePrice: existing.averagePrice !== undefined
              ? computeWeightedAverage(existing.averagePrice, existing.reportCount, item.unitPrice, daysSinceReceipt)
              : item.unitPrice,
            confidence,
            lastSeenDate: receipt.purchaseDate,
            reportCount: newReportCount,
            lastReportedBy: user._id,
            updatedAt: now,
          });
          upsertCount++;
        }
      } else {
        // Insert new price record
        const confidence = computeConfidence(1, daysSinceReceipt);

        await ctx.db.insert("currentPrices", {
          normalizedName,
          itemName: item.name,
          storeName: receipt.storeName,
          // Include normalized store ID if available
          ...(normalizedStoreId && { normalizedStoreId }),
          // Pass through size/unit from receipt when available
          ...(item.size && { size: item.size }),
          ...(item.unit && { unit: item.unit }),
          unitPrice: item.unitPrice,
          averagePrice: item.unitPrice,
          minPrice: item.unitPrice,
          maxPrice: item.unitPrice,
          confidence,
          lastSeenDate: receipt.purchaseDate,
          reportCount: 1,
          lastReportedBy: user._id,
          updatedAt: now,
        });
        upsertCount++;
      }

      // Price-bracket matcher: when receipt item lacks size/unit, infer variant from price
      if (!item.size && !item.unit) {
        const baseItem = normalizedName
          .replace(/\d+\s*(ml|l|g|kg|pt|pint|pints|pack|oz|lb)\b/gi, "")
          .replace(/\s+/g, " ")
          .trim();

        // Check if user has a preferredVariant on their pantry item — always prefer that
        const pantryItem = await ctx.db
          .query("pantryItems")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .filter((q) => q.eq(q.field("name"), item.name))
          .first();

        if (pantryItem?.preferredVariant) {
          // User has explicitly chosen a variant — associate price with it
          const preferredVariants = await ctx.db
            .query("itemVariants")
            .withIndex("by_base_item", (q) => q.eq("baseItem", baseItem || normalizedName))
            .collect();

          const preferred = preferredVariants.find(
            (v) => v.variantName.toLowerCase() === pantryItem.preferredVariant!.toLowerCase()
          );

          if (preferred) {
            // Update the currentPrices entry with the variant's size/unit
            const priceRow = existing ?? await ctx.db
              .query("currentPrices")
              .withIndex("by_item_store", (q) =>
                q.eq("normalizedName", normalizedName).eq("storeName", receipt.storeName)
              )
              .first();

            if (priceRow) {
              await ctx.db.patch(priceRow._id, {
                variantName: preferred.variantName,
                size: preferred.size,
                unit: preferred.unit,
              });
            }
          }
        } else {
          // No preferredVariant — try bracket matching against known variant prices
          const variants = await ctx.db
            .query("itemVariants")
            .withIndex("by_base_item", (q) => q.eq("baseItem", baseItem || normalizedName))
            .collect();

          if (variants.length > 0) {
            const TOLERANCE = 0.20; // 20% price tolerance
            const matches = variants.filter((v) => {
              if (v.estimatedPrice == null) return false;
              const diff = Math.abs(item.unitPrice - v.estimatedPrice) / v.estimatedPrice;
              return diff <= TOLERANCE;
            });

            // Only associate if exactly one match (unambiguous)
            if (matches.length === 1) {
              const match = matches[0];
              const priceRow = existing ?? await ctx.db
                .query("currentPrices")
                .withIndex("by_item_store", (q) =>
                  q.eq("normalizedName", normalizedName).eq("storeName", receipt.storeName)
                )
                .first();

              if (priceRow) {
                await ctx.db.patch(priceRow._id, {
                  variantName: match.variantName,
                  size: match.size,
                  unit: match.unit,
                });
              }
            }
          }
        }
      }

      // Variant discovery: if receipt has size/unit, auto-insert into itemVariants
      if (item.size && item.unit) {
        // Extract base item name (strip size info from name for baseItem key)
        const baseItem = normalizedName
          .replace(/\d+\s*(ml|l|g|kg|pt|pint|pints|pack|oz|lb)\b/gi, "")
          .replace(/\s+/g, " ")
          .trim();

        const existingVariants = await ctx.db
          .query("itemVariants")
          .withIndex("by_base_item", (q) => q.eq("baseItem", baseItem || normalizedName))
          .collect();

        const isDuplicate = existingVariants.some(
          (v) => v.variantName.toLowerCase() === item.name.toLowerCase()
        );

        if (!isDuplicate) {
          await ctx.db.insert("itemVariants", {
            baseItem: baseItem || normalizedName,
            variantName: item.name,
            size: item.size,
            unit: item.unit,
            category: item.category || "Other",
            source: "receipt_discovered",
          });
          variantsDiscovered++;
        }
      }
    }

    return { upsertCount, variantsDiscovered };
  },
});

/**
 * Insert an AI-estimated price into currentPrices.
 * Used by the estimateItemPrice action when no price data exists.
 * Sets reportCount: 0 and confidence: 0.05 to distinguish from receipt-verified prices.
 */
export const upsertAIEstimate = mutation({
  args: {
    normalizedName: v.string(),
    itemName: v.string(),
    unitPrice: v.number(),
    userId: v.id("users"),
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
    variantName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const storeName = "AI Estimate";

    // Check if AI estimate already exists for this item
    const existing = await ctx.db
      .query("currentPrices")
      .withIndex("by_item_store", (q) =>
        q.eq("normalizedName", args.normalizedName).eq("storeName", storeName)
      )
      .first();

    if (existing) {
      // Update if existing is also an AI estimate
      await ctx.db.patch(existing._id, {
        unitPrice: args.unitPrice,
        averagePrice: args.unitPrice,
        confidence: 0.05,
        updatedAt: now,
        ...(args.size && { size: args.size }),
        ...(args.unit && { unit: args.unit }),
        ...(args.variantName && { variantName: args.variantName }),
      });
      return existing._id;
    }

    return await ctx.db.insert("currentPrices", {
      normalizedName: args.normalizedName,
      itemName: args.itemName,
      storeName,
      unitPrice: args.unitPrice,
      averagePrice: args.unitPrice,
      reportCount: 0,
      confidence: 0.05,
      lastSeenDate: now,
      lastReportedBy: args.userId,
      updatedAt: now,
      ...(args.size && { size: args.size }),
      ...(args.unit && { unit: args.unit }),
      ...(args.variantName && { variantName: args.variantName }),
    });
  },
});

/**
 * Get the best (cheapest) current price for an item across all stores.
 */
export const getEstimate = query({
  args: {
    itemName: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedName = args.itemName.toLowerCase().trim();

    const prices = await ctx.db
      .query("currentPrices")
      .withIndex("by_item", (q) => q.eq("normalizedName", normalizedName))
      .collect();

    if (prices.length === 0) return null;

    // Return cheapest price + store, and average across stores
    const sorted = [...prices].sort((a, b) => a.unitPrice - b.unitPrice);
    const avg =
      prices.reduce((sum, p) => sum + p.unitPrice, 0) / prices.length;

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

/**
 * Batch get estimates for multiple items at once (avoids N+1 on list page).
 */
export const batchGetEstimates = query({
  args: {
    itemNames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Record<
      string,
      { cheapest: number; storeName: string; average: number; confidence?: number } | null
    > = {};

    for (const name of args.itemNames) {
      const normalizedName = name.toLowerCase().trim();

      const prices = await ctx.db
        .query("currentPrices")
        .withIndex("by_item", (q) => q.eq("normalizedName", normalizedName))
        .collect();

      if (prices.length === 0) {
        results[name] = null;
        continue;
      }

      const sorted = [...prices].sort((a, b) => a.unitPrice - b.unitPrice);
      const avg =
        prices.reduce((sum, p) => sum + p.unitPrice, 0) / prices.length;

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

/**
 * Compare prices for an item across specific stores.
 * Returns price data for each requested store, useful for store comparison UI.
 */
export const getComparisonByStores = query({
  args: {
    itemName: v.string(),
    size: v.optional(v.string()),
    storeIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedName = args.itemName.toLowerCase().trim();

    // Get all prices for this item
    const allPrices = await ctx.db
      .query("currentPrices")
      .withIndex("by_item", (q) => q.eq("normalizedName", normalizedName))
      .collect();

    // Filter by size if provided
    const sizeFilteredPrices = args.size
      ? allPrices.filter((p) => p.size === args.size)
      : allPrices;

    // Build result map for requested stores
    const result: Record<
      string,
      {
        price: number;
        confidence: number;
        lastSeen: number;
        size?: string;
        unit?: string;
      } | null
    > = {};

    for (const storeId of args.storeIds) {
      // Find price for this store (by normalizedStoreId or storeName fallback)
      const storePrice = sizeFilteredPrices.find(
        (p) =>
          p.normalizedStoreId === storeId ||
          p.storeName.toLowerCase().includes(storeId.toLowerCase())
      );

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

    // Add metadata: cheapest store and average
    const availablePrices = Object.entries(result)
      .filter(([, data]) => data !== null)
      .map(([storeId, data]) => ({ storeId, ...data! }));

    const cheapestStore =
      availablePrices.length > 0
        ? availablePrices.reduce((min, curr) =>
            curr.price < min.price ? curr : min
          )
        : null;

    const averagePrice =
      availablePrices.length > 0
        ? availablePrices.reduce((sum, p) => sum + p.price, 0) /
          availablePrices.length
        : null;

    return {
      byStore: result,
      cheapestStore: cheapestStore?.storeId ?? null,
      cheapestPrice: cheapestStore?.price ?? null,
      averagePrice,
      storesWithData: availablePrices.length,
    };
  },
});
