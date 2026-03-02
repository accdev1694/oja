import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

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
      const now = Date.now();

      // Challenge reward — no longer awards loyalty points (old system removed).
      // Challenge completion is tracked via the achievement below.

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
          unlockedAt: now,
        });
      }

      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "challenge_completed",
        title: "Challenge Complete!",
        body: `You completed "${challenge.title}" — +${challenge.reward} points!`,
        data: { challengeId: args.challengeId },
        read: false,
        createdAt: now,
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

// =============================================================================
// 6.4 — Store Achievements
// =============================================================================

/**
 * Store achievement definitions
 * Icons verified against MaterialCommunityIcons
 */
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

/**
 * Internal helper to unlock an achievement and notify user
 */
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

/**
 * Phase 5.1: Check and unlock points-related achievements
 */
export const checkPointsAchievements = internalMutation({
  args: {
    userId: v.id("users"),
    totalPoints: v.number(),
    currentTier: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const unlocked: string[] = [];

    // Rewards Pioneer
    if (args.totalPoints >= STORE_ACHIEVEMENTS.rewards_pioneer.threshold) {
      if (await processUnlockAchievement(ctx, args.userId, STORE_ACHIEVEMENTS.rewards_pioneer)) {
        unlocked.push(STORE_ACHIEVEMENTS.rewards_pioneer.type);
      }
    }

    // Top Tier
    if (args.currentTier === "platinum") {
      if (await processUnlockAchievement(ctx, args.userId, STORE_ACHIEVEMENTS.top_tier)) {
        unlocked.push(STORE_ACHIEVEMENTS.top_tier.type);
      }
    }

    return { unlocked };
  },
});

/**
 * Phase 1.2: Check and unlock pantry-related achievements
 */
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

/**
 * Check and unlock store-related achievements for a user
 * Called after receipt processing or when viewing store insights
 */
export const checkStoreAchievements = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const unlockedAchievements: string[] = [];

    // Get all user receipts with normalized store IDs
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    // Count unique stores and trips per store
    const storeTrips: Record<string, number> = {};
    for (const receipt of receipts) {
      const storeId = receipt.normalizedStoreId;
      if (storeId) {
        storeTrips[storeId] = (storeTrips[storeId] || 0) + 1;
      }
    }

    const uniqueStoreCount = Object.keys(storeTrips).length;
    const maxTripsAtSingleStore = Math.max(...Object.values(storeTrips), 0);

    // Check Store Explorer - 5 different stores
    if (uniqueStoreCount >= STORE_ACHIEVEMENTS.store_explorer.threshold) {
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q: any) =>
          q.eq("userId", user._id).eq("type", STORE_ACHIEVEMENTS.store_explorer.type)
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("achievements", {
          userId: user._id,
          type: STORE_ACHIEVEMENTS.store_explorer.type,
          title: STORE_ACHIEVEMENTS.store_explorer.title,
          description: STORE_ACHIEVEMENTS.store_explorer.description,
          icon: STORE_ACHIEVEMENTS.store_explorer.icon,
          unlockedAt: now,
        });
        await ctx.db.insert("notifications", {
          userId: user._id,
          type: "achievement_unlocked",
          title: "Achievement Unlocked!",
          body: `${STORE_ACHIEVEMENTS.store_explorer.title}: ${STORE_ACHIEVEMENTS.store_explorer.description}`,
          data: { achievementType: STORE_ACHIEVEMENTS.store_explorer.type },
          read: false,
          createdAt: now,
        });
        unlockedAchievements.push(STORE_ACHIEVEMENTS.store_explorer.type);
      }
    }

    // Check Loyal Shopper - 10 trips at same store
    if (maxTripsAtSingleStore >= STORE_ACHIEVEMENTS.loyal_shopper.threshold) {
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q: any) =>
          q.eq("userId", user._id).eq("type", STORE_ACHIEVEMENTS.loyal_shopper.type)
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("achievements", {
          userId: user._id,
          type: STORE_ACHIEVEMENTS.loyal_shopper.type,
          title: STORE_ACHIEVEMENTS.loyal_shopper.title,
          description: STORE_ACHIEVEMENTS.loyal_shopper.description,
          icon: STORE_ACHIEVEMENTS.loyal_shopper.icon,
          unlockedAt: now,
        });
        await ctx.db.insert("notifications", {
          userId: user._id,
          type: "achievement_unlocked",
          title: "Achievement Unlocked!",
          body: `${STORE_ACHIEVEMENTS.loyal_shopper.title}: ${STORE_ACHIEVEMENTS.loyal_shopper.description}`,
          data: { achievementType: STORE_ACHIEVEMENTS.loyal_shopper.type },
          read: false,
          createdAt: now,
        });
        unlockedAchievements.push(STORE_ACHIEVEMENTS.loyal_shopper.type);
      }
    }

    return { unlockedAchievements };
  },
});

/**
 * Check deal-based achievements (Price Detective & Budget Champion)
 * Called when user views best deals or store recommendations
 */
export const checkDealAchievements = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const unlockedAchievements: string[] = [];

    // Get price history for deal analysis (last 90 days)
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

    // Group purchases by normalized item name
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

    // Count items where cheaper price was found and calculate total savings
    let itemsCheaperElsewhere = 0;
    let totalSavings = 0;

    for (const [normalizedName, purchases] of userPurchases) {
      // Get the most recent purchase for this item
      const sortedPurchases = purchases.sort(
        (a, b) => b.purchaseDate - a.purchaseDate
      );
      const mostRecent = sortedPurchases[0];

      // Get all current prices for this item
      const currentPrices = await ctx.db
        .query("currentPrices")
        .withIndex("by_item", (q: any) => q.eq("normalizedName", normalizedName))
        .collect();

      if (currentPrices.length === 0) {
        continue;
      }

      // Find the cheapest price from a different store
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

        // Only count significant savings (>5%)
        if (savingsPercent >= 5) {
          itemsCheaperElsewhere++;
          totalSavings += savings;
        }
      }
    }

    // Check Price Detective - 10 items cheaper elsewhere
    if (itemsCheaperElsewhere >= STORE_ACHIEVEMENTS.price_detective.threshold) {
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q: any) =>
          q.eq("userId", user._id).eq("type", STORE_ACHIEVEMENTS.price_detective.type)
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("achievements", {
          userId: user._id,
          type: STORE_ACHIEVEMENTS.price_detective.type,
          title: STORE_ACHIEVEMENTS.price_detective.title,
          description: STORE_ACHIEVEMENTS.price_detective.description,
          icon: STORE_ACHIEVEMENTS.price_detective.icon,
          unlockedAt: now,
        });
        await ctx.db.insert("notifications", {
          userId: user._id,
          type: "achievement_unlocked",
          title: "Achievement Unlocked!",
          body: `${STORE_ACHIEVEMENTS.price_detective.title}: ${STORE_ACHIEVEMENTS.price_detective.description}`,
          data: { achievementType: STORE_ACHIEVEMENTS.price_detective.type },
          read: false,
          createdAt: now,
        });
        unlockedAchievements.push(STORE_ACHIEVEMENTS.price_detective.type);
      }
    }

    // Check Budget Champion - £50 saved by store switching
    if (totalSavings >= STORE_ACHIEVEMENTS.budget_champion.threshold) {
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q: any) =>
          q.eq("userId", user._id).eq("type", STORE_ACHIEVEMENTS.budget_champion.type)
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("achievements", {
          userId: user._id,
          type: STORE_ACHIEVEMENTS.budget_champion.type,
          title: STORE_ACHIEVEMENTS.budget_champion.title,
          description: STORE_ACHIEVEMENTS.budget_champion.description,
          icon: STORE_ACHIEVEMENTS.budget_champion.icon,
          unlockedAt: now,
        });
        await ctx.db.insert("notifications", {
          userId: user._id,
          type: "achievement_unlocked",
          title: "Achievement Unlocked!",
          body: `${STORE_ACHIEVEMENTS.budget_champion.title}: ${STORE_ACHIEVEMENTS.budget_champion.description}`,
          data: { achievementType: STORE_ACHIEVEMENTS.budget_champion.type },
          read: false,
          createdAt: now,
        });
        unlockedAchievements.push(STORE_ACHIEVEMENTS.budget_champion.type);
      }
    }

    return { unlockedAchievements, itemsCheaperElsewhere, totalSavings: Math.round(totalSavings * 100) / 100 };
  },
});

/**
 * Get all possible store achievements with user's progress
 */
export const getStoreAchievementProgress = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    // Get all user receipts with normalized store IDs
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    // Count unique stores and trips per store
    const storeTrips: Record<string, number> = {};
    for (const receipt of receipts) {
      const storeId = receipt.normalizedStoreId;
      if (storeId) {
        storeTrips[storeId] = (storeTrips[storeId] || 0) + 1;
      }
    }

    const uniqueStoreCount = Object.keys(storeTrips).length;
    const maxTripsAtSingleStore = Math.max(...Object.values(storeTrips), 0);

    // Get user's unlocked achievements
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
        // Progress for price detective requires analyzing deals (expensive)
        // Return unlocked status only, progress calculated in checkDealAchievements
        progress: null, // Calculated on-demand
        unlocked: unlockedTypes.has(STORE_ACHIEVEMENTS.price_detective.type),
        progressPercent: unlockedTypes.has(STORE_ACHIEVEMENTS.price_detective.type) ? 100 : null,
      },
      budgetChampion: {
        ...STORE_ACHIEVEMENTS.budget_champion,
        // Progress for budget champion requires analyzing deals (expensive)
        // Return unlocked status only, progress calculated in checkDealAchievements
        progress: null, // Calculated on-demand
        unlocked: unlockedTypes.has(STORE_ACHIEVEMENTS.budget_champion.type),
        progressPercent: unlockedTypes.has(STORE_ACHIEVEMENTS.budget_champion.type) ? 100 : null,
      },
    };
  },
});
