import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { requireUser, optionalUser } from "./helpers";

/**
 * Get or update user streak
 */
export const updateStreak = mutation({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const today = new Date(now).toISOString().split("T")[0];

    const existing = await ctx.db
      .query("streaks")
      .withIndex("by_user_type", (q: any) => q.eq("userId", user._id).eq("type", args.type))
      .unique();

    if (existing) {
      const lastDate = existing.lastActivityDate;
      const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      if (lastDate === today) return existing;

      let newCount = existing.currentCount;
      if (lastDate === yesterday) {
        newCount += 1;
      } else {
        newCount = 1;
      }

      const longestCount = Math.max(newCount, existing.longestCount);

      await ctx.db.patch(existing._id, {
        currentCount: newCount,
        longestCount,
        lastActivityDate: today,
        updatedAt: now,
      });

      if (newCount >= 7 || newCount >= 30 || newCount >= 100) {
        await checkStreakAchievement(ctx, user._id, args.type, newCount);
      }

      return { ...existing, currentCount: newCount, longestCount, lastActivityDate: today };
    } else {
      const id = await ctx.db.insert("streaks", {
        userId: user._id,
        type: args.type,
        currentCount: 1,
        longestCount: 1,
        lastActivityDate: today,
        startedAt: now,
        updatedAt: now,
      });
      return await ctx.db.get(id);
    }
  },
});

async function checkStreakAchievement(ctx: any, userId: any, type: string, count: number) {
  const milestones = [
    { count: 7, title: "Week Warrior", desc: "7-day streak", icon: "fire" },
    { count: 30, title: "Monthly Master", desc: "30-day streak", icon: "star" },
    { count: 100, title: "Century Shopper", desc: "100-day streak", icon: "trophy" },
  ];

  for (const m of milestones) {
    if (count >= m.count) {
      const achievementType = `streak_${type}_${m.count}`;
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q: any) => q.eq("userId", userId).eq("type", achievementType))
        .unique();

      if (!existing) {
        await ctx.db.insert("achievements", {
          userId,
          type: achievementType,
          title: m.title,
          description: m.desc,
          icon: m.icon,
          unlockedAt: Date.now(),
        });
        await ctx.db.insert("notifications", {
          userId,
          type: "achievement_unlocked",
          title: "Achievement Unlocked!",
          body: `${m.title}: ${m.desc}`,
          data: { achievementType },
          read: false,
          createdAt: Date.now(),
        });
      }
    }
  }
}

export const getStreaks = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("streaks")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
  },
});

export const getAchievements = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("achievements")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
  },
});

export const unlockAchievement = mutation({
  args: {
    type: v.string(),
    title: v.string(),
    description: v.string(),
    icon: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const existing = await ctx.db
      .query("achievements")
      .withIndex("by_user_type", (q: any) => q.eq("userId", user._id).eq("type", args.type))
      .unique();

    if (existing) return existing;

    const id = await ctx.db.insert("achievements", {
      userId: user._id,
      type: args.type,
      title: args.title,
      description: args.description,
      icon: args.icon,
      unlockedAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "achievement_unlocked",
      title: "Achievement Unlocked!",
      body: `${args.title}: ${args.description}`,
      data: { achievementType: args.type },
      read: false,
      createdAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const getSavingsJar = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return { totalSaved: 0, tripsCount: 0, averageSaved: 0, nextMilestone: 50, milestoneProgress: 0 };

    const completedLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const completed = completedLists.filter((l: any) => l.status === "completed" && l.budget);

    let totalSaved = 0;
    let tripsCount = 0;

    for (const list of completed) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q: any) => q.eq("listId", list._id))
        .collect();

      const spent = items.reduce(
        (sum: number, item: any) => sum + (item.actualPrice || item.estimatedPrice || 0) * item.quantity,
        0
      );

      const saved = (list.budget || 0) - spent;
      if (saved > 0) {
        totalSaved += saved;
        tripsCount++;
      }
    }

    const milestones = [50, 100, 200, 500, 1000];
    const nextMilestone = milestones.find((m) => m > totalSaved) || milestones[milestones.length - 1];
    const prevMilestone = milestones.filter((m) => m <= totalSaved).pop() || 0;
    const milestoneProgress = nextMilestone > prevMilestone
      ? Math.min(((totalSaved - prevMilestone) / (nextMilestone - prevMilestone)) * 100, 100)
      : 100;

    return {
      totalSaved: Math.round(totalSaved * 100) / 100,
      tripsCount,
      averageSaved: tripsCount > 0 ? Math.round((totalSaved / tripsCount) * 100) / 100 : 0,
      nextMilestone,
      milestoneProgress: Math.round(milestoneProgress),
    };
  },
});

const STORE_ACHIEVEMENTS = {
  store_explorer: {
    type: "store_explorer",
    title: "Store Explorer",
    description: "Shop at 5 different stores",
    icon: "map-marker-multiple",
    tier: "bronze",
    threshold: 5,
  },
  price_detective: {
    type: "price_detective",
    title: "Price Detective",
    description: "Find 10 items cheaper elsewhere",
    icon: "magnify",
    tier: "silver",
    threshold: 10,
  },
  loyal_shopper: {
    type: "loyal_shopper",
    title: "Loyal Shopper",
    description: "Make 10 trips to the same store",
    icon: "heart-circle",
    tier: "bronze",
    threshold: 10,
  },
  budget_champion: {
    type: "budget_champion",
    title: "Budget Champion",
    description: "Save £50 by switching stores",
    icon: "trophy-award",
    tier: "gold",
    threshold: 50,
  },
  pantry_pro: {
    type: "pantry_pro",
    title: "Pantry Pro",
    description: "Track 30 items in your pantry",
    icon: "fridge",
    tier: "bronze",
    threshold: 30,
  },
  rewards_pioneer: {
    type: "rewards_pioneer",
    title: "Rewards Pioneer",
    description: "Earned your first points",
    icon: "star-circle",
    tier: "bronze",
    threshold: 1,
  },
  top_tier: {
    type: "top_tier",
    title: "Top Tier",
    description: "Reached Platinum scan tier",
    icon: "crown",
    tier: "platinum",
    threshold: 1,
  },
} as const;

async function processUnlockAchievement(ctx: any, userId: any, achievement: any) {
  const existing = await ctx.db
    .query("achievements")
    .withIndex("by_user_type", (q: any) =>
      q.eq("userId", userId).eq("type", achievement.type)
    )
    .unique();

  if (!existing) {
    const now = Date.now();
    await ctx.db.insert("achievements", {
      userId,
      type: achievement.type,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      unlockedAt: now,
    });
    await ctx.db.insert("notifications", {
      userId,
      type: "achievement_unlocked",
      title: "Achievement Unlocked!",
      body: `${achievement.title}: ${achievement.description}`,
      data: { achievementType: achievement.type },
      read: false,
      createdAt: now,
    });
    return true;
  }
  return false;
}

export const checkPointsAchievements = internalMutation({
  args: {
    userId: v.id("users"),
    totalPoints: v.number(),
    currentTier: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const unlocked: string[] = [];

    if (args.totalPoints >= STORE_ACHIEVEMENTS.rewards_pioneer.threshold) {
      if (await processUnlockAchievement(ctx, args.userId, STORE_ACHIEVEMENTS.rewards_pioneer)) {
        unlocked.push(STORE_ACHIEVEMENTS.rewards_pioneer.type);
      }
    }

    if (args.currentTier === "platinum") {
      if (await processUnlockAchievement(ctx, args.userId, STORE_ACHIEVEMENTS.top_tier)) {
        unlocked.push(STORE_ACHIEVEMENTS.top_tier.type);
      }
    }

    return { unlocked };
  },
});

export const checkPantryAchievements = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx: any, args: any) => {
    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    if (items.length >= STORE_ACHIEVEMENTS.pantry_pro.threshold) {
      if (await processUnlockAchievement(ctx, args.userId, STORE_ACHIEVEMENTS.pantry_pro)) {
        return { unlocked: [STORE_ACHIEVEMENTS.pantry_pro.type] };
      }
    }
    return { unlocked: [] };
  },
});

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
