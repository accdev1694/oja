import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

/**
 * Internal mutation: Compress price history older than 6 months
 * 1. Aggregates 6-12 month old data into monthly summaries
 * 2. Deletes raw entries older than 1 year
 * Called monthly via cron
 */
export const compressOldData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneYearAgo = now - ONE_YEAR_MS;
    const sixMonthsAgo = now - SIX_MONTHS_MS;

    // Process users in batches to avoid timeouts (paginated, max 50 per cron run)
    const users = await ctx.db.query("users").take(50);
    let processedCount = 0;
    let compressedCount = 0;
    let deletedCount = 0;

    for (const user of users) {
      // Find history entries between 6 and 12 months old for aggregation
      const oldHistory = await ctx.db
        .query("priceHistory")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) =>
          q.and(
            q.gte(q.field("purchaseDate"), oneYearAgo),
            q.lt(q.field("purchaseDate"), sixMonthsAgo)
          )
        )
        .collect();

      if (oldHistory.length > 0) {
        // Group by normalizedName + month + storeName
        const aggregates = new Map<string, {
          userId: Id<"users">;
          normalizedName: string;
          month: string;
          prices: number[];
          storeName: string;
          normalizedStoreId?: string;
        }>();

        for (const entry of oldHistory) {
          const date = new Date(entry.purchaseDate);
          const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
          const key = `${entry.normalizedName}|${month}|${entry.storeName}`;

          if (!aggregates.has(key)) {
            aggregates.set(key, {
              userId: user._id,
              normalizedName: entry.normalizedName,
              month,
              prices: [],
              storeName: entry.storeName,
              normalizedStoreId: entry.normalizedStoreId,
            });
          }
          aggregates.get(key)!.prices.push(entry.unitPrice);
        }

        // Upsert monthly aggregates
        for (const agg of aggregates.values()) {
          const existing = await ctx.db
            .query("priceHistoryMonthly")
            .withIndex("by_user_item_month", (q) =>
              q.eq("userId", agg.userId).eq("normalizedName", agg.normalizedName).eq("month", agg.month)
            )
            .unique();

          const avgPrice = agg.prices.reduce((a, b) => a + b, 0) / agg.prices.length;
          const minPrice = Math.min(...agg.prices);
          const maxPrice = Math.max(...agg.prices);

          if (existing) {
            // Merge with existing
            const totalEntries = existing.entryCount + agg.prices.length;
            const newAvg = (existing.avgPrice * existing.entryCount + avgPrice * agg.prices.length) / totalEntries;

            await ctx.db.patch(existing._id, {
              avgPrice: newAvg,
              minPrice: Math.min(existing.minPrice, minPrice),
              maxPrice: Math.max(existing.maxPrice, maxPrice),
              entryCount: totalEntries,
              updatedAt: now,
            });
          } else {
            await ctx.db.insert("priceHistoryMonthly", {
              userId: agg.userId,
              normalizedName: agg.normalizedName,
              month: agg.month,
              avgPrice,
              minPrice,
              maxPrice,
              entryCount: agg.prices.length,
              storeName: agg.storeName,
              normalizedStoreId: agg.normalizedStoreId,
              updatedAt: now,
            });
          }
          compressedCount++;
        }
      }

      // 2. Delete raw entries older than 1 year (already aggregated in previous runs)
      const toDelete = await ctx.db
        .query("priceHistory")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.lt(q.field("purchaseDate"), oneYearAgo))
        .collect();

      for (const entry of toDelete) {
        await ctx.db.delete(entry._id);
        deletedCount++;
      }

      processedCount++;
    }

    console.log(`[priceHistory] Compressed ${compressedCount} monthly buckets, deleted ${deletedCount} raw entries across ${processedCount} users`);
    return { compressed: compressedCount, deleted: deletedCount };
  },
});
