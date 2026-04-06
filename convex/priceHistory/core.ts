import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { normalizeStoreName } from "../lib/storeNormalizer";

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
    const region = user.postcodePrefix || user.country || "UK";

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
        region,
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
