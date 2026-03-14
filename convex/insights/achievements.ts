import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { GenericMutationCtx } from "convex/server";
import { DataModel, Id } from "../_generated/dataModel";
import { requireUser, optionalUser } from "./helpers";

export const STORE_ACHIEVEMENTS = {
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

export async function processUnlockAchievement(ctx: GenericMutationCtx<DataModel>, userId: Id<"users">, achievement: { type: string; title: string; description: string; icon: string }) {
  const existing = await ctx.db
    .query("achievements")
    .withIndex("by_user_type", q =>
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

export const getAchievements = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("achievements")
      .withIndex("by_user", q => q.eq("userId", user._id))
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
      .withIndex("by_user_type", q => q.eq("userId", user._id).eq("type", args.type))
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

export const checkPointsAchievements = internalMutation({
  args: {
    userId: v.id("users"),
    totalPoints: v.number(),
    currentTier: v.string(),
  },
  handler: async (ctx, args) => {
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
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .collect();

    if (items.length >= STORE_ACHIEVEMENTS.pantry_pro.threshold) {
      if (await processUnlockAchievement(ctx, args.userId, STORE_ACHIEVEMENTS.pantry_pro)) {
        return { unlocked: [STORE_ACHIEVEMENTS.pantry_pro.type] };
      }
    }
    return { unlocked: [] };
  },
});
