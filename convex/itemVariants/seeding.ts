import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

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

    // C5 fix: Use .take() to prevent full table scan (Convex 16k doc limit)
    const allVariants = await ctx.db
      .query("itemVariants")
      .withIndex("by_base_item")
      .take(5000);

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
      name: variant.productName ?? variant.variantName ?? variant.baseItem,
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
