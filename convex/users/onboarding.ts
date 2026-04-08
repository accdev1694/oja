import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { trackFunnelEvent, trackActivity } from "../lib/analytics";
import { normalizeEmailForTombstone } from "../lib/emailNormalizer";

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
    postcodePrefix: v.optional(v.string()),
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

    // M1 fix: Server-side input validation
    const name = args.name.trim().slice(0, 100);
    if (!name) throw new Error("Name is required");
    const country = args.country.trim().slice(0, 100);
    if (!country) throw new Error("Country is required");
    if (args.cuisinePreferences.length > 20) throw new Error("Too many cuisine preferences");
    const cuisinePreferences = args.cuisinePreferences.map(c => c.trim().slice(0, 50)).filter(Boolean);
    const dietaryRestrictions = args.dietaryRestrictions?.map(d => d.trim().slice(0, 50)).filter(Boolean);
    const postcodePrefix = args.postcodePrefix?.trim().slice(0, 10) || undefined;

    await ctx.db.patch(user._id, {
      name,
      nameManuallySet: true,
      country,
      cuisinePreferences,
      dietaryRestrictions,
      defaultBudget: args.defaultBudget,
      postcodePrefix,
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

    // C1 fix: Idempotency guard — prevent duplicate subscriptions/analytics on retry
    if (user.onboardingComplete) {
      return true;
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

    // Auto-start 7-day premium trial — but only for genuinely new users.
    // Returning users (who deleted their account) are detected via the
    // deletedAccounts tombstone table and placed on free tier instead.
    const existingSub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Check if this email was previously used (trial abuse prevention).
    // Uses normalized email to catch Gmail alias bypasses (user+2@gmail.com).
    const previousAccount = user.email
      ? await ctx.db
          .query("deletedAccounts")
          .withIndex("by_email", (q) => q.eq("email", normalizeEmailForTombstone(user.email!)))
          .first()
      : null;

    if (!existingSub && !previousAccount) {
      // Brand-new user: grant a fresh 7-day trial
      const defaultPlan = await ctx.db
        .query("pricingConfig")
        .withIndex("by_plan", (q) => q.eq("planId", "premium_monthly"))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      const trialEndsAt = now + 7 * 24 * 60 * 60 * 1000;
      const planId = defaultPlan?.planId === "premium_monthly" || defaultPlan?.planId === "premium_annual"
        ? defaultPlan.planId
        : "premium_monthly";

      await ctx.db.insert("subscriptions", {
        userId: user._id,
        plan: planId,
        status: "trial",
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        createdAt: now,
        updatedAt: now,
      });

      const trialDays = Math.ceil((trialEndsAt - now) / (24 * 60 * 60 * 1000));

      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "trial_started",
        title: "Welcome to Oja Premium!",
        body: `You have ${trialDays} days of full access to all features — explore everything!`,
        read: false,
        createdAt: now,
      });
    } else if (!existingSub && previousAccount) {
      // Returning user: resume trial with original dates (clock kept ticking).
      // If the original trial end date is still in the future, restore it.
      // Otherwise the trial has expired — user lands on free tier (no sub created).
      const originalTrialEnd = previousAccount.trialEndsAt;
      if (originalTrialEnd && originalTrialEnd > now) {
        const originalStart = previousAccount.trialStartedAt ?? now;

        await ctx.db.insert("subscriptions", {
          userId: user._id,
          plan: "premium_monthly",
          status: "trial",
          trialEndsAt: originalTrialEnd,
          currentPeriodStart: originalStart,
          currentPeriodEnd: originalTrialEnd,
          createdAt: now,
          updatedAt: now,
        });

        const remainingDays = Math.ceil((originalTrialEnd - now) / (24 * 60 * 60 * 1000));

        await ctx.db.insert("notifications", {
          userId: user._id,
          type: "trial_started",
          title: "Welcome back to Oja!",
          body: `Your trial continues — ${remainingDays} day${remainingDays === 1 ? "" : "s"} of Premium remaining.`,
          read: false,
          createdAt: now,
        });
      }
      // If originalTrialEnd is missing or in the past, no subscription is created.
      // The user lands on free tier and can subscribe to get Premium.
    }

    return true;
  },
});
