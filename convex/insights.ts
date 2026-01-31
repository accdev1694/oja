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

async function optionalUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();
}

// =============================================================================
// 6.1 — Weekly Digest & Monthly Trends
// =============================================================================

/**
 * Get weekly spending digest with sparkline data
 */
export const getWeeklyDigest = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    const allReceipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const thisWeek = allReceipts.filter((r: any) => r.purchaseDate >= weekAgo);
    const lastWeek = allReceipts.filter(
      (r: any) => r.purchaseDate >= twoWeeksAgo && r.purchaseDate < weekAgo
    );

    const thisWeekTotal = thisWeek.reduce((sum: number, r: any) => sum + r.total, 0);
    const lastWeekTotal = lastWeek.reduce((sum: number, r: any) => sum + r.total, 0);
    const percentChange = lastWeekTotal > 0
      ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
      : 0;

    // Sparkline: daily totals for the last 7 days
    const dailyTotals: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
      const dayEnd = now - i * 24 * 60 * 60 * 1000;
      const dayTotal = thisWeek
        .filter((r: any) => r.purchaseDate >= dayStart && r.purchaseDate < dayEnd)
        .reduce((sum: number, r: any) => sum + r.total, 0);
      dailyTotals.push(Math.round(dayTotal * 100) / 100);
    }

    // Completed lists this week for budget tracking
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
      thisWeekTotal: Math.round(thisWeekTotal * 100) / 100,
      lastWeekTotal: Math.round(lastWeekTotal * 100) / 100,
      percentChange: Math.round(percentChange * 10) / 10,
      tripsCount: thisWeek.length,
      completedLists: completedThisWeek.length,
      budgetSaved: budgetSaved > 0 ? Math.round(budgetSaved * 100) / 100 : 0,
      topCategories: getTopCategories(thisWeek),
      dailySparkline: dailyTotals,
    };
  },
});

function getTopCategories(receipts: any[]) {
  const categoryTotals: Record<string, number> = {};
  for (const receipt of receipts) {
    for (const item of receipt.items || []) {
      const cat = item.category || "Uncategorized";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (item.totalPrice || 0);
    }
  }
  return Object.entries(categoryTotals)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6)
    .map(([category, total]) => ({ category, total: Math.round((total as number) * 100) / 100 }));
}

/**
 * Get monthly spending trends (last 6 months) with category breakdown + budget adherence
 */
export const getMonthlyTrends = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return { months: [], categoryBreakdown: [], budgetAdherence: { underBudget: 0, overBudget: 0, total: 0 } };

    const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;

    // Receipts for monthly totals + categories
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
    const recentReceipts = receipts.filter((r: any) => r.purchaseDate >= sixMonthsAgo);

    const monthlyData: Record<string, { total: number; count: number }> = {};
    const categoryTotals: Record<string, number> = {};

    for (const r of recentReceipts) {
      const date = new Date(r.purchaseDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[key]) monthlyData[key] = { total: 0, count: 0 };
      monthlyData[key].total += r.total;
      monthlyData[key].count++;

      // Category aggregation
      for (const item of r.items || []) {
        const cat = item.category || "Other";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (item.totalPrice || 0);
      }
    }

    const months = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        label: formatMonthLabel(month),
        total: Math.round(data.total * 100) / 100,
        trips: data.count,
      }));

    // Add month-over-month change
    const monthsWithChange = months.map((m, i) => ({
      ...m,
      change: i > 0 && months[i - 1].total > 0
        ? Math.round(((m.total - months[i - 1].total) / months[i - 1].total) * 1000) / 10
        : 0,
    }));

    const categoryBreakdown = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 6)
      .map(([category, total]) => ({
        category,
        total: Math.round((total as number) * 100) / 100,
      }));

    // Budget adherence from completed lists
    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
    const completedWithBudget = lists.filter(
      (l: any) => l.status === "completed" && l.budget && l.completedAt && l.completedAt >= sixMonthsAgo
    );

    let underBudget = 0;
    let overBudget = 0;
    for (const list of completedWithBudget) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q: any) => q.eq("listId", list._id))
        .collect();
      const spent = items.reduce(
        (sum: number, item: any) => sum + (item.actualPrice || item.estimatedPrice || 0) * item.quantity,
        0
      );
      if (spent <= (list.budget ?? 0)) underBudget++;
      else overBudget++;
    }

    return {
      months: monthsWithChange,
      categoryBreakdown,
      budgetAdherence: {
        underBudget,
        overBudget,
        total: completedWithBudget.length,
      },
    };
  },
});

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(month) - 1]} ${year.slice(2)}`;
}

// =============================================================================
// 6.2 — Streaks, Savings Jar, Challenges
// =============================================================================

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

/**
 * Savings jar with milestone tracking
 */
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

/**
 * Get active weekly challenge (or generate one)
 */
export const getActiveChallenge = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const challenges = await ctx.db
      .query("weeklyChallenges")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    // Find active (not expired, not completed)
    const active = challenges.find(
      (c: any) => c.endDate >= today && !c.completedAt
    );

    return active || null;
  },
});

/**
 * Generate a new weekly challenge
 */
export const generateChallenge = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Check if there's already an active one
    const challenges = await ctx.db
      .query("weeklyChallenges")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const active = challenges.find((c: any) => c.endDate >= today && !c.completedAt);
    if (active) return active;

    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const templates = [
      { type: "scan_receipts", title: "Receipt Collector", description: "Scan 3 receipts this week", icon: "camera", target: 3, reward: 15 },
      { type: "under_budget", title: "Budget Boss", description: "Complete 2 trips under budget", icon: "cash-check", target: 2, reward: 20 },
      { type: "complete_lists", title: "List Crusher", description: "Complete 3 shopping lists", icon: "clipboard-check", target: 3, reward: 15 },
      { type: "add_items", title: "Stock Up", description: "Add 15 items to your pantry", icon: "package-variant-closed", target: 15, reward: 10 },
      { type: "save_money", title: "Penny Pincher", description: "Save £10 or more across all trips", icon: "piggy-bank", target: 10, reward: 25 },
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];

    const id = await ctx.db.insert("weeklyChallenges", {
      userId: user._id,
      type: template.type,
      title: template.title,
      description: template.description,
      icon: template.icon,
      target: template.target,
      progress: 0,
      reward: template.reward,
      startDate: today,
      endDate,
      createdAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

/**
 * Update challenge progress
 */
export const updateChallengeProgress = mutation({
  args: {
    challengeId: v.id("weeklyChallenges"),
    increment: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge || challenge.userId !== user._id) throw new Error("Not found");
    if (challenge.completedAt) return challenge;

    const newProgress = Math.min(challenge.progress + args.increment, challenge.target);
    const completed = newProgress >= challenge.target;

    await ctx.db.patch(args.challengeId, {
      progress: newProgress,
      ...(completed ? { completedAt: Date.now() } : {}),
    });

    if (completed) {
      // Award achievement for first challenge completion
      const existingAch = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q: any) => q.eq("userId", user._id).eq("type", "first_challenge"))
        .unique();

      if (!existingAch) {
        await ctx.db.insert("achievements", {
          userId: user._id,
          type: "first_challenge",
          title: "Challenge Accepted",
          description: "Completed your first weekly challenge",
          icon: "flag-checkered",
          unlockedAt: Date.now(),
        });
      }

      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "challenge_completed",
        title: "Challenge Complete!",
        body: `You completed "${challenge.title}" — +${challenge.reward} points!`,
        data: { challengeId: args.challengeId },
        read: false,
        createdAt: Date.now(),
      });
    }

    return { ...challenge, progress: newProgress, completedAt: completed ? Date.now() : undefined };
  },
});

// =============================================================================
// 6.3 — Personal Bests & Achievements
// =============================================================================

export const getPersonalBests = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
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
 * Unlock an achievement (callable from frontend for non-automatic ones)
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
