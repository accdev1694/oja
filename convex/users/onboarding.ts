import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { trackFunnelEvent, trackActivity } from "../lib/analytics";

/**
 * Record a health analysis score for historical tracking
 */
export const recordHealthAnalysis = internalMutation({
  args: {
    userId: v.id("users"),
    listId: v.id("shoppingLists"),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const healthHistory = user.healthHistory || [];
    // Keep only last 50 entries to prevent document bloat
    const updatedHistory = [
      ...healthHistory,
      { listId: args.listId, score: args.score, analyzedAt: Date.now() }
    ].slice(-50);

    await ctx.db.patch(args.userId, {
      healthHistory: updatedHistory,
      updatedAt: Date.now(),
    });

    // Check for "Health Champion" achievement: 3 lists scored 80+ in the last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentHighScores = updatedHistory.filter(h => h.score >= 80 && h.analyzedAt > thirtyDaysAgo);

    if (recentHighScores.length >= 3) {
      // Check if already has it
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", q => q.eq("userId", args.userId).eq("type", "health_champion"))
        .first();

      if (!existing) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          type: "health_champion",
          title: "🏆 Health Champion",
          description: "Scored 80+ on 3 different lists this month!",
          icon: "medal",
          unlockedAt: Date.now(),
        });

        // Also notify user
        await ctx.db.insert("notifications", {
          userId: args.userId,
          type: "achievement",
          title: "New Achievement Unlocked!",
          body: "You've earned the Health Champion medal! 🏆",
          read: false,
          createdAt: Date.now(),
        });
      }
    }
  },
});

/**
 * Set onboarding data (name, country, cuisinePreferences)
 */
export const setOnboardingData = mutation({
  args: {
    name: v.string(),
    country: v.string(),
    cuisinePreferences: v.array(v.string()),
    dietaryRestrictions: v.optional(v.array(v.string())),
    defaultBudget: v.optional(v.number()),
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

    await ctx.db.patch(user._id, {
      name: args.name,
      country: args.country,
      cuisinePreferences: args.cuisinePreferences,
      dietaryRestrictions: args.dietaryRestrictions,
      defaultBudget: args.defaultBudget,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(user._id);
  },
});

/**
 * Mark onboarding as complete
 */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
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

    const now = Date.now();
    await ctx.db.patch(user._id, {
      onboardingComplete: true,
      updatedAt: now,
    });

    // Track funnel event: onboarding_complete
    await trackFunnelEvent(ctx, user._id, "onboarding_complete");

    // Track activity
    await trackActivity(ctx, user._id, "onboarding_complete");

    // Auto-start 7-day premium trial for new users
    const existingSub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!existingSub) {
      // Get dynamic pricing to find the default plan
      const defaultPlan = await ctx.db
        .query("pricingConfig")
        .withIndex("by_plan", (q) => q.eq("planId", "premium_monthly"))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      const trialEndsAt = now + 7 * 24 * 60 * 60 * 1000;
      await ctx.db.insert("subscriptions", {
        userId: user._id,
        plan: (defaultPlan?.planId as any) || "premium_monthly",
        status: "trial",
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        createdAt: now,
        updatedAt: now,
      });

      // Calculate trial days for dynamic message
      const trialDays = Math.ceil((trialEndsAt - now) / (24 * 60 * 60 * 1000));

      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "trial_started",
        title: "Welcome to Oja Premium!",
        body: `You have ${trialDays} days of full access to all features — explore everything!`,
        read: false,
        createdAt: now,
      });
    }

    return true;
  },
});
