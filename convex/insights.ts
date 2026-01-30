import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}

/**
 * Get weekly spending digest
 */
export const getWeeklyDigest = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    // Get this week's receipts
    const thisWeekReceipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const thisWeek = thisWeekReceipts.filter((r: any) => r.purchaseDate >= weekAgo);
    const lastWeek = thisWeekReceipts.filter(
      (r: any) => r.purchaseDate >= twoWeeksAgo && r.purchaseDate < weekAgo
    );

    const thisWeekTotal = thisWeek.reduce((sum: number, r: any) => sum + r.total, 0);
    const lastWeekTotal = lastWeek.reduce((sum: number, r: any) => sum + r.total, 0);
    const percentChange = lastWeekTotal > 0
      ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
      : 0;

    // Get completed lists this week
    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const completedThisWeek = lists.filter(
      (l: any) => l.status === "completed" && l.completedAt && l.completedAt >= weekAgo
    );

    let totalBudget = 0;
    let totalSpent = 0;
    for (const list of completedThisWeek) {
      if (list.budget) totalBudget += list.budget;
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q: any) => q.eq("listId", list._id))
        .collect();
      totalSpent += items.reduce(
        (sum: number, item: any) => sum + (item.actualPrice || item.estimatedPrice || 0) * item.quantity,
        0
      );
    }

    const budgetSaved = totalBudget - totalSpent;

    return {
      thisWeekTotal,
      lastWeekTotal,
      percentChange,
      tripsCount: thisWeek.length,
      completedLists: completedThisWeek.length,
      budgetSaved: budgetSaved > 0 ? budgetSaved : 0,
      topCategories: getTopCategories(thisWeek),
    };
  },
});

function getTopCategories(receipts: any[]) {
  const categoryTotals: Record<string, number> = {};
  for (const receipt of receipts) {
    for (const item of receipt.items || []) {
      const cat = item.category || "Uncategorized";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + item.totalPrice;
    }
  }
  return Object.entries(categoryTotals)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([category, total]) => ({ category, total }));
}

/**
 * Get monthly spending trends (last 6 months)
 */
export const getMonthlyTrends = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const recentReceipts = receipts.filter((r: any) => r.purchaseDate >= sixMonthsAgo);

    const monthlyData: Record<string, { total: number; count: number }> = {};
    for (const r of recentReceipts) {
      const date = new Date(r.purchaseDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[key]) monthlyData[key] = { total: 0, count: 0 };
      monthlyData[key].total += r.total;
      monthlyData[key].count++;
    }

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        total: Math.round(data.total * 100) / 100,
        trips: data.count,
      }));
  },
});

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

      if (lastDate === today) {
        return existing; // Already updated today
      }

      let newCount = existing.currentCount;
      if (lastDate === yesterday) {
        newCount += 1; // Continue streak
      } else {
        newCount = 1; // Reset streak
      }

      const longestCount = Math.max(newCount, existing.longestCount);

      await ctx.db.patch(existing._id, {
        currentCount: newCount,
        longestCount,
        lastActivityDate: today,
        updatedAt: now,
      });

      // Check for streak achievements
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
      }
    }
  }
}

/**
 * Get user streaks
 */
export const getStreaks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("streaks")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
  },
});

/**
 * Get user achievements
 */
export const getAchievements = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("achievements")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
  },
});

/**
 * Get savings jar (total saved across all trips)
 */
export const getSavingsJar = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { totalSaved: 0, tripsCount: 0, averageSaved: 0 };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return { totalSaved: 0, tripsCount: 0, averageSaved: 0 };

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

    return {
      totalSaved: Math.round(totalSaved * 100) / 100,
      tripsCount,
      averageSaved: tripsCount > 0 ? Math.round((totalSaved / tripsCount) * 100) / 100 : 0,
    };
  },
});

/**
 * Get personal bests
 */
export const getPersonalBests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const completedLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const completed = completedLists.filter((l: any) => l.status === "completed");

    let biggestSaving = 0;
    let longestStreak = 0;
    let mostItemsInTrip = 0;
    let cheapestTrip = Infinity;

    for (const list of completed) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q: any) => q.eq("listId", list._id))
        .collect();

      const spent = items.reduce(
        (sum: number, item: any) => sum + (item.actualPrice || item.estimatedPrice || 0) * item.quantity,
        0
      );

      if (list.budget) {
        const saved = list.budget - spent;
        if (saved > biggestSaving) biggestSaving = saved;
      }

      if (items.length > mostItemsInTrip) mostItemsInTrip = items.length;
      if (spent > 0 && spent < cheapestTrip) cheapestTrip = spent;
    }

    // Get longest streak
    const streaks = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    for (const s of streaks) {
      if (s.longestCount > longestStreak) longestStreak = s.longestCount;
    }

    return {
      biggestSaving: Math.round(biggestSaving * 100) / 100,
      longestStreak,
      mostItemsInTrip,
      cheapestTrip: cheapestTrip === Infinity ? 0 : Math.round(cheapestTrip * 100) / 100,
      totalTrips: completed.length,
    };
  },
});

/**
 * Unlock an achievement
 */
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

    // Send notification
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
