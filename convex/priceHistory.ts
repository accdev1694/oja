import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { normalizeStoreName } from "./lib/storeNormalizer";

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

    // 1. Process users in batches to avoid timeouts
    const users = await ctx.db.query("users").collect();
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

/**
 * Save price history from receipt items
 * Called when user confirms a receipt
 */
export const savePriceHistoryFromReceipt = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the receipt
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) {
      throw new Error("Receipt not found or unauthorized");
    }

    // Save price history for each item
    const now = Date.now();
    const priceHistoryIds: Id<"priceHistory">[] = [];

    // Normalize store name once for all items
    const normalizedStoreId = normalizeStoreName(receipt.storeName);

    for (const item of receipt.items) {
      const priceHistoryId = await ctx.db.insert("priceHistory", {
        userId: user._id,
        receiptId: args.receiptId,
        itemName: item.name,
        normalizedName: item.name.toLowerCase().trim(),
        // Pass through size/unit from receipt when available
        ...(item.size && { size: item.size }),
        ...(item.unit && { unit: item.unit }),
        price: item.totalPrice,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        storeName: receipt.storeName,
        storeAddress: receipt.storeAddress,
        // Include normalized store ID if available
        ...(normalizedStoreId && { normalizedStoreId }),
        purchaseDate: receipt.purchaseDate,
        createdAt: now,
      });

      priceHistoryIds.push(priceHistoryId);
    }

    return { count: priceHistoryIds.length };
  },
});

/**
 * Get price history for a specific item
 */
export const getByItemName = query({
  args: {
    itemName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const normalizedName = args.itemName.toLowerCase().trim();

    return await ctx.db
      .query("priceHistory")
      .withIndex("by_user_item", (q) =>
        q.eq("userId", user._id).eq("normalizedName", normalizedName)
      )
      .order("desc")
      .collect();
  },
});

/**
 * Get price stats for an item
 * Returns average, min, max prices
 */
export const getPriceStats = query({
  args: {
    itemName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    const normalizedName = args.itemName.toLowerCase().trim();

    // Get price history from last 3 months
    const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    const priceHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_user_item", (q) =>
        q.eq("userId", user._id).eq("normalizedName", normalizedName)
      )
      .filter((q) => q.gte(q.field("purchaseDate"), threeMonthsAgo))
      .collect();

    if (priceHistory.length === 0) {
      return null;
    }

    const unitPrices = priceHistory.map((p) => p.unitPrice);

    const average = unitPrices.reduce((sum, price) => sum + price, 0) / unitPrices.length;
    const min = Math.min(...unitPrices);
    const max = Math.max(...unitPrices);

    // Get the store with lowest price
    const lowestPriceEntry = priceHistory.find((p) => p.unitPrice === min);

    return {
      average,
      min,
      max,
      lowestStore: lowestPriceEntry?.storeName,
      dataPoints: priceHistory.length,
    };
  },
});

/**
 * Calculate price trend for an item
 * Returns: "increasing", "decreasing", or "stable"
 */
export const getPriceTrend = query({
  args: {
    itemName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return "stable";
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return "stable";
    }

    const normalizedName = args.itemName.toLowerCase().trim();

    // Get last 5 purchases
    const recentPrices = await ctx.db
      .query("priceHistory")
      .withIndex("by_user_item", (q) =>
        q.eq("userId", user._id).eq("normalizedName", normalizedName)
      )
      .order("desc")
      .take(5);

    if (recentPrices.length < 2) {
      return "stable";
    }

    // Compare most recent vs older average
    const mostRecent = recentPrices[0].unitPrice;
    const olderAverage =
      recentPrices
        .slice(1)
        .reduce((sum, p) => sum + p.unitPrice, 0) / (recentPrices.length - 1);

    const percentChange = ((mostRecent - olderAverage) / olderAverage) * 100;

    // Threshold: >10% change
    if (percentChange > 10) return "increasing";
    if (percentChange < -10) return "decreasing";
    return "stable";
  },
});

/**
 * Check for price alerts when saving a new receipt
 * Returns alerts for items with significant price changes
 */
export const checkPriceAlerts = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) {
      return [];
    }

    const alerts: {
      itemName: string;
      type: "increase" | "decrease";
      percentChange: number;
      oldPrice: number;
      newPrice: number;
    }[] = [];

    for (const item of receipt.items) {
      const normalizedName = item.name.toLowerCase().trim();

      // Get previous prices (excluding this receipt)
      const previousPrices = await ctx.db
        .query("priceHistory")
        .withIndex("by_user_item", (q) =>
          q.eq("userId", user._id).eq("normalizedName", normalizedName)
        )
        .filter((q) => q.neq(q.field("receiptId"), args.receiptId))
        .order("desc")
        .take(5);

      if (previousPrices.length === 0) {
        continue;
      }

      // Calculate average of previous prices
      const avgPreviousPrice =
        previousPrices.reduce((sum, p) => sum + p.unitPrice, 0) / previousPrices.length;

      const percentChange = ((item.unitPrice - avgPreviousPrice) / avgPreviousPrice) * 100;

      // Alert threshold: >15% change
      if (Math.abs(percentChange) > 15) {
        alerts.push({
          itemName: item.name,
          type: percentChange > 0 ? "increase" : "decrease",
          percentChange: Math.abs(percentChange),
          oldPrice: avgPreviousPrice,
          newPrice: item.unitPrice,
        });
      }
    }

    return alerts;
  },
});

/**
 * Get all unique items a user has price history for
 */
export const getUniqueItems = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const allPrices = await ctx.db
      .query("priceHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Group by normalized name and get unique items
    const uniqueItems = new Map<string, { name: string; lastPrice: number; lastDate: number }>();

    for (const price of allPrices) {
      const existing = uniqueItems.get(price.normalizedName);

      if (!existing || price.purchaseDate > existing.lastDate) {
        uniqueItems.set(price.normalizedName, {
          name: price.itemName,
          lastPrice: price.unitPrice,
          lastDate: price.purchaseDate,
        });
      }
    }

    return Array.from(uniqueItems.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  },
});
