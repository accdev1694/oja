import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Upsert current prices from a confirmed receipt.
 * For each item, if a newer price exists we skip; otherwise we update.
 * This keeps a single "freshest price" row per item per store.
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

    for (const item of receipt.items) {
      const normalizedName = item.name.toLowerCase().trim();

      // Look up existing row for this item + store
      const existing = await ctx.db
        .query("currentPrices")
        .withIndex("by_item_store", (q) =>
          q.eq("normalizedName", normalizedName).eq("storeName", receipt.storeName)
        )
        .first();

      if (existing) {
        // Only update if receipt date is newer
        if (receipt.purchaseDate >= existing.lastSeenDate) {
          await ctx.db.patch(existing._id, {
            unitPrice: item.unitPrice,
            itemName: item.name,
            lastSeenDate: receipt.purchaseDate,
            reportCount: existing.reportCount + 1,
            lastReportedBy: user._id,
            updatedAt: now,
          });
          upsertCount++;
        }
      } else {
        // Insert new price record
        await ctx.db.insert("currentPrices", {
          normalizedName,
          itemName: item.name,
          storeName: receipt.storeName,
          unitPrice: item.unitPrice,
          lastSeenDate: receipt.purchaseDate,
          reportCount: 1,
          lastReportedBy: user._id,
          updatedAt: now,
        });
        upsertCount++;
      }
    }

    return { upsertCount };
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
      { cheapest: number; storeName: string; average: number } | null
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
      };
    }

    return results;
  },
});
