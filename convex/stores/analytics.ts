import { query } from "../_generated/server";
import { getStoreInfoSafe } from "../lib/storeNormalizer";

/**
 * Store Analytics
 *
 * Spending analysis, deal finding, and store recommendations.
 */

/**
 * Get receipt count grouped by normalized store ID.
 * Returns an object like: { tesco: 15, aldi: 8, lidl: 3 }
 */
export const getReceiptCountByStore = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {};
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return {};
    }

    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const counts: Record<string, number> = {};

    for (const receipt of receipts) {
      const storeId = receipt.normalizedStoreId;
      if (storeId) {
        counts[storeId] = (counts[storeId] ?? 0) + 1;
      }
    }

    return counts;
  },
});

/**
 * Get total spending grouped by normalized store ID.
 * Returns an object like: { tesco: 245.50, aldi: 123.75, lidl: 89.20 }
 */
export const getSpendingByStore = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {};
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return {};
    }

    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const spending: Record<string, number> = {};

    for (const receipt of receipts) {
      const storeId = receipt.normalizedStoreId;
      if (storeId && receipt.total > 0) {
        spending[storeId] = (spending[storeId] ?? 0) + receipt.total;
      }
    }

    // Round to 2 decimal places for currency
    for (const storeId in spending) {
      spending[storeId] = Math.round(spending[storeId] * 100) / 100;
    }

    return spending;
  },
});

/**
 * Get items where the user paid more than the cheapest available price.
 * Returns a list of potential savings opportunities based on price history.
 *
 * Format: [{ itemName, paidPrice, paidStore, cheapestPrice, cheapestStore, savings }]
 */
export const getBestDealsFound = query({
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

    // Get user's price history (last 90 days for relevance)
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const priceHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const recentPriceHistory = priceHistory.filter(
      (p) => p.purchaseDate >= ninetyDaysAgo
    );

    if (recentPriceHistory.length === 0) {
      return [];
    }

    // Group user's purchases by normalized item name
    const userPurchases = new Map<
      string,
      {
        itemName: string;
        price: number;
        storeName: string;
        normalizedStoreId?: string;
        purchaseDate: number;
      }[]
    >();

    for (const ph of recentPriceHistory) {
      const key = ph.normalizedName;
      if (!userPurchases.has(key)) {
        userPurchases.set(key, []);
      }
      userPurchases.get(key)!.push({
        itemName: ph.itemName,
        price: ph.unitPrice,
        storeName: ph.storeName,
        normalizedStoreId: ph.normalizedStoreId,
        purchaseDate: ph.purchaseDate,
      });
    }

    // C2 fix: Batch-fetch all currentPrices upfront to avoid N+1 queries
    const itemNames = Array.from(userPurchases.keys());
    const allCurrentPrices = await ctx.db
      .query("currentPrices")
      .collect();

    // Build a lookup map: normalizedName -> prices[]
    const pricesByItem = new Map<string, typeof allCurrentPrices>();
    for (const cp of allCurrentPrices) {
      if (itemNames.includes(cp.normalizedName)) {
        const existing = pricesByItem.get(cp.normalizedName) ?? [];
        existing.push(cp);
        pricesByItem.set(cp.normalizedName, existing);
      }
    }

    // For each item, find if there's a cheaper price in currentPrices
    const deals: {
      itemName: string;
      paidPrice: number;
      paidStore: string;
      paidStoreId: string | null;
      cheapestPrice: number;
      cheapestStore: string;
      cheapestStoreId: string | null;
      savings: number;
      savingsPercent: number;
    }[] = [];

    for (const [normalizedName, purchases] of userPurchases) {
      // Get the most recent purchase for this item
      const sortedPurchases = purchases.sort(
        (a, b) => b.purchaseDate - a.purchaseDate
      );
      const mostRecent = sortedPurchases[0];

      // Get all current prices for this item from batch-fetched data
      const currentPrices = pricesByItem.get(normalizedName) ?? [];

      if (currentPrices.length === 0) {
        continue;
      }

      // Find the cheapest price from a different store
      const cheapestFromOtherStore = currentPrices
        .filter((cp) => {
          // Exclude the store where user bought it
          if (cp.normalizedStoreId && mostRecent.normalizedStoreId) {
            return cp.normalizedStoreId !== mostRecent.normalizedStoreId;
          }
          // Fall back to string comparison
          return (
            cp.storeName.toLowerCase() !== mostRecent.storeName.toLowerCase()
          );
        })
        .sort((a, b) => a.unitPrice - b.unitPrice)[0];

      if (
        cheapestFromOtherStore &&
        cheapestFromOtherStore.unitPrice < mostRecent.price
      ) {
        const savings = mostRecent.price - cheapestFromOtherStore.unitPrice;
        const savingsPercent = (savings / mostRecent.price) * 100;

        // Only include significant savings (>5%)
        if (savingsPercent >= 5) {
          deals.push({
            itemName: mostRecent.itemName,
            paidPrice: Math.round(mostRecent.price * 100) / 100,
            paidStore: mostRecent.storeName,
            paidStoreId: mostRecent.normalizedStoreId ?? null,
            cheapestPrice:
              Math.round(cheapestFromOtherStore.unitPrice * 100) / 100,
            cheapestStore: cheapestFromOtherStore.storeName,
            cheapestStoreId: cheapestFromOtherStore.normalizedStoreId ?? null,
            savings: Math.round(savings * 100) / 100,
            savingsPercent: Math.round(savingsPercent * 10) / 10,
          });
        }
      }
    }

    // Sort by savings amount (highest first)
    return deals.sort((a, b) => b.savings - a.savings).slice(0, 20);
  },
});

/**
 * Analyze user's shopping patterns and suggest store switches to save money.
 * Returns a recommendation like: "Shop at Aldi to save £12.50/month"
 *
 * Algorithm:
 * 1. Get user's most frequently purchased items (from price history)
 * 2. For each item, find the cheapest available store
 * 3. Aggregate potential savings by store
 * 4. Return the store with highest potential savings
 */
export const getStoreRecommendation = query({
  args: {},
  handler: async (ctx) => {
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

    // Get user's price history (last 30 days for monthly projection)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const priceHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const recentPriceHistory = priceHistory.filter(
      (p) => p.purchaseDate >= thirtyDaysAgo
    );

    if (recentPriceHistory.length === 0) {
      return null;
    }

    // Calculate what user spent per item
    const itemSpending = new Map<
      string,
      {
        normalizedName: string;
        displayName: string;
        totalSpent: number;
        quantity: number;
        avgUnitPrice: number;
        purchaseCount: number;
      }
    >();

    for (const ph of recentPriceHistory) {
      const key = ph.normalizedName;
      const existing = itemSpending.get(key);
      if (existing) {
        existing.totalSpent += ph.price;
        existing.quantity += ph.quantity;
        existing.purchaseCount += 1;
        existing.avgUnitPrice =
          existing.totalSpent / existing.quantity;
      } else {
        itemSpending.set(key, {
          normalizedName: ph.normalizedName,
          displayName: ph.itemName,
          totalSpent: ph.price,
          quantity: ph.quantity,
          avgUnitPrice: ph.unitPrice,
          purchaseCount: 1,
        });
      }
    }

    // C1 fix: Batch-fetch all currentPrices upfront to avoid N+1 queries
    const spendingItemNames = Array.from(itemSpending.keys());
    const allPricesForRecommendation = await ctx.db
      .query("currentPrices")
      .collect();

    // Build a lookup map: normalizedName -> prices[]
    const pricesByItemForRec = new Map<string, typeof allPricesForRecommendation>();
    for (const cp of allPricesForRecommendation) {
      if (spendingItemNames.includes(cp.normalizedName)) {
        const existing = pricesByItemForRec.get(cp.normalizedName) ?? [];
        existing.push(cp);
        pricesByItemForRec.set(cp.normalizedName, existing);
      }
    }

    // For each item, find cheapest store and calculate potential savings
    const savingsByStore = new Map<
      string,
      {
        storeId: string;
        storeName: string;
        potentialSavings: number;
        itemCount: number;
      }
    >();

    for (const [normalizedName, spending] of itemSpending) {
      // Get all current prices for this item from batch-fetched data
      const currentPrices = pricesByItemForRec.get(normalizedName) ?? [];

      if (currentPrices.length === 0) {
        continue;
      }

      // Find the cheapest price
      const cheapest = [...currentPrices].sort((a, b) => a.unitPrice - b.unitPrice)[0];

      // Calculate savings if user switched to cheapest store
      const savingsPerUnit = spending.avgUnitPrice - cheapest.unitPrice;
      if (savingsPerUnit > 0) {
        const totalSavings = savingsPerUnit * spending.quantity;
        const storeKey = cheapest.normalizedStoreId || cheapest.storeName.toLowerCase();

        const existing = savingsByStore.get(storeKey);
        if (existing) {
          existing.potentialSavings += totalSavings;
          existing.itemCount += 1;
        } else {
          savingsByStore.set(storeKey, {
            storeId: storeKey,
            storeName: cheapest.storeName,
            potentialSavings: totalSavings,
            itemCount: 1,
          });
        }
      }
    }

    if (savingsByStore.size === 0) {
      return null;
    }

    // Find the store with highest potential savings
    const storeRankings = Array.from(savingsByStore.values())
      .sort((a, b) => b.potentialSavings - a.potentialSavings);

    const bestStore = storeRankings[0];

    // Try to get display name from store normalizer
    let displayName = bestStore.storeName;
    const storeInfo = getStoreInfoSafe(bestStore.storeId);
    if (storeInfo) {
      displayName = storeInfo.displayName;
    }

    return {
      recommendedStore: bestStore.storeId,
      storeName: displayName,
      storeColor: storeInfo?.color ?? "#6B7280",
      potentialMonthlySavings:
        Math.round(bestStore.potentialSavings * 100) / 100,
      itemCount: bestStore.itemCount,
      message: `Shop at ${displayName} to save £${(
        Math.round(bestStore.potentialSavings * 100) / 100
      ).toFixed(2)}/month`,
      alternativeStores: storeRankings.slice(1, 4).map((s) => {
        const info = getStoreInfoSafe(s.storeId);
        return {
          storeId: s.storeId,
          storeName: info?.displayName ?? s.storeName,
          storeColor: info?.color ?? "#6B7280",
          potentialSavings: Math.round(s.potentialSavings * 100) / 100,
          itemCount: s.itemCount,
        };
      }),
    };
  },
});
