import { mutation, query } from "../_generated/server";
import { requireUser, optionalUser } from "./helpers";
import { STORE_ACHIEVEMENTS, processUnlockAchievement } from "./achievements";

export const checkStoreAchievements = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const unlockedAchievements: string[] = [];

    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const storeTrips: Record<string, number> = {};
    for (const receipt of receipts) {
      const storeId = receipt.normalizedStoreId;
      if (storeId) {
        storeTrips[storeId] = (storeTrips[storeId] || 0) + 1;
      }
    }

    const uniqueStoreCount = Object.keys(storeTrips).length;
    const maxTripsAtSingleStore = Math.max(...Object.values(storeTrips), 0);

    if (uniqueStoreCount >= STORE_ACHIEVEMENTS.store_explorer.threshold) {
      if (await processUnlockAchievement(ctx, user._id, STORE_ACHIEVEMENTS.store_explorer)) {
        unlockedAchievements.push(STORE_ACHIEVEMENTS.store_explorer.type);
      }
    }

    if (maxTripsAtSingleStore >= STORE_ACHIEVEMENTS.loyal_shopper.threshold) {
      if (await processUnlockAchievement(ctx, user._id, STORE_ACHIEVEMENTS.loyal_shopper)) {
        unlockedAchievements.push(STORE_ACHIEVEMENTS.loyal_shopper.type);
      }
    }

    return { unlockedAchievements };
  },
});

export const checkDealAchievements = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const unlockedAchievements: string[] = [];

    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
    const priceHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const recentPriceHistory = priceHistory.filter(
      (p: any) => p.purchaseDate >= ninetyDaysAgo
    );

    if (recentPriceHistory.length === 0) {
      return { unlockedAchievements };
    }

    const userPurchases = new Map<
      string,
      {
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
        price: ph.unitPrice,
        storeName: ph.storeName,
        normalizedStoreId: ph.normalizedStoreId,
        purchaseDate: ph.purchaseDate,
      });
    }

    let itemsCheaperElsewhere = 0;
    let totalSavings = 0;

    for (const [normalizedName, purchases] of userPurchases) {
      const sortedPurchases = purchases.sort(
        (a, b) => b.purchaseDate - a.purchaseDate
      );
      const mostRecent = sortedPurchases[0];

      const currentPrices = await ctx.db
        .query("currentPrices")
        .withIndex("by_item", (q: any) => q.eq("normalizedName", normalizedName))
        .collect();

      if (currentPrices.length === 0) {
        continue;
      }

      const cheapestFromOtherStore = currentPrices
        .filter((cp: any) => {
          if (cp.normalizedStoreId && mostRecent.normalizedStoreId) {
            return cp.normalizedStoreId !== mostRecent.normalizedStoreId;
          }
          return cp.storeName.toLowerCase() !== mostRecent.storeName.toLowerCase();
        })
        .sort((a: any, b: any) => a.unitPrice - b.unitPrice)[0];

      if (cheapestFromOtherStore && cheapestFromOtherStore.unitPrice < mostRecent.price) {
        const savings = mostRecent.price - cheapestFromOtherStore.unitPrice;
        const savingsPercent = (savings / mostRecent.price) * 100;

        if (savingsPercent >= 5) {
          itemsCheaperElsewhere++;
          totalSavings += savings;
        }
      }
    }

    if (itemsCheaperElsewhere >= STORE_ACHIEVEMENTS.price_detective.threshold) {
      if (await processUnlockAchievement(ctx, user._id, STORE_ACHIEVEMENTS.price_detective)) {
        unlockedAchievements.push(STORE_ACHIEVEMENTS.price_detective.type);
      }
    }

    if (totalSavings >= STORE_ACHIEVEMENTS.budget_champion.threshold) {
      if (await processUnlockAchievement(ctx, user._id, STORE_ACHIEVEMENTS.budget_champion)) {
        unlockedAchievements.push(STORE_ACHIEVEMENTS.budget_champion.type);
      }
    }

    return { unlockedAchievements, itemsCheaperElsewhere, totalSavings: Math.round(totalSavings * 100) / 100 };
  },
});

export const getStoreAchievementProgress = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const storeTrips: Record<string, number> = {};
    for (const receipt of receipts) {
      const storeId = receipt.normalizedStoreId;
      if (storeId) {
        storeTrips[storeId] = (storeTrips[storeId] || 0) + 1;
      }
    }

    const uniqueStoreCount = Object.keys(storeTrips).length;
    const maxTripsAtSingleStore = Math.max(...Object.values(storeTrips), 0);

    const userAchievements = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const unlockedTypes = new Set(userAchievements.map((a: any) => a.type));

    return {
      storeExplorer: {
        ...STORE_ACHIEVEMENTS.store_explorer,
        progress: uniqueStoreCount,
        unlocked: unlockedTypes.has(STORE_ACHIEVEMENTS.store_explorer.type),
        progressPercent: Math.min(
          (uniqueStoreCount / STORE_ACHIEVEMENTS.store_explorer.threshold) * 100,
          100
        ),
      },
      loyalShopper: {
        ...STORE_ACHIEVEMENTS.loyal_shopper,
        progress: maxTripsAtSingleStore,
        unlocked: unlockedTypes.has(STORE_ACHIEVEMENTS.loyal_shopper.type),
        progressPercent: Math.min(
          (maxTripsAtSingleStore / STORE_ACHIEVEMENTS.loyal_shopper.threshold) * 100,
          100
        ),
      },
      priceDetective: {
        ...STORE_ACHIEVEMENTS.price_detective,
        progress: null,
        unlocked: unlockedTypes.has(STORE_ACHIEVEMENTS.price_detective.type),
        progressPercent: unlockedTypes.has(STORE_ACHIEVEMENTS.price_detective.type) ? 100 : null,
      },
      budgetChampion: {
        ...STORE_ACHIEVEMENTS.budget_champion,
        progress: null,
        unlocked: unlockedTypes.has(STORE_ACHIEVEMENTS.budget_champion.type),
        progressPercent: unlockedTypes.has(STORE_ACHIEVEMENTS.budget_champion.type) ? 100 : null,
      },
    };
  },
});
