import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { normalizeStoreName } from "./lib/storeNormalizer";

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
