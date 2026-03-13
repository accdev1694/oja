import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
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
