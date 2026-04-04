import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { MutationCtx } from "./_generated/server";
import {
  getFreeFeatures,
  getPlanFeatures,
  effectiveStatus,
  isEffectivelyPremium,
} from "./lib/featureGating";
import { trackFunnelEvent } from "./lib/analytics";
import { normalizeEmailForTombstone } from "./lib/emailNormalizer";

async function requireUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Get current subscription for user
 */
export const getCurrentSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!sub) {
      if (user.isAdmin) {
        return {
          plan: "premium_annual" as const,
          status: "active" as const,
          features: getPlanFeatures("premium_annual"),
          isActive: true,
          isAdminOverride: true,
        };
      }
      return {
        plan: "free" as const,
        status: "active" as const,
        features: getFreeFeatures(),
      };
    }

    const status = user.isAdmin ? "active" : effectiveStatus(sub);
    const isPrem = user.isAdmin || isEffectivelyPremium(sub);

    return {
      ...sub,
      status,
      features: isPrem ? getPlanFeatures(user.isAdmin ? "premium_annual" : sub.plan) : getFreeFeatures(),
      isActive: isPrem,
      isAdminOverride: !!user.isAdmin,
    };
  },
});

/**
 * Create or update subscription (called from Stripe webhook or manually)
 */
export const upsertSubscription = mutation({
  args: {
    plan: v.union(v.literal("free"), v.literal("premium_monthly"), v.literal("premium_annual")),
    status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("expired"), v.literal("trial")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Track funnel event: subscribed if status is active
    if (args.status === "active") {
      await trackFunnelEvent(ctx, user._id, "subscribed");
    }

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("subscriptions", {
      userId: user._id,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Start a free trial (7 days)
 */
export const startFreeTrial = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .first();

    if (existing) throw new Error("Already has a subscription");

    // Returning user: resume trial with remaining time (clock kept ticking).
    // New user: grant fresh 7-day trial.
    let trialEndsAt: number;
    let trialStart: number;
    let isReturning = false;

    if (user.email) {
      const normalized = normalizeEmailForTombstone(user.email);
      const previousAccount = await ctx.db
        .query("deletedAccounts")
        .withIndex("by_email", (q) => q.eq("email", normalized))
        .first();
      if (previousAccount) {
        const originalEnd = previousAccount.trialEndsAt;
        if (!originalEnd || originalEnd <= now) {
          throw new Error("Trial already used. Please subscribe to continue with Premium.");
        }
        // Resume with remaining time
        trialEndsAt = originalEnd;
        trialStart = previousAccount.trialStartedAt ?? now;
        isReturning = true;
      }
    }

    if (!isReturning) {
      trialEndsAt = now + 7 * 24 * 60 * 60 * 1000;
      trialStart = now;
    }

    const id = await ctx.db.insert("subscriptions", {
      userId: user._id,
      plan: "premium_monthly",
      status: "trial",
      trialEndsAt: trialEndsAt!,
      currentPeriodStart: trialStart!,
      currentPeriodEnd: trialEndsAt!,
      createdAt: now,
      updatedAt: now,
    });

    const trialDays = Math.ceil((trialEndsAt! - now) / (24 * 60 * 60 * 1000));

    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "trial_started",
      title: isReturning ? "Welcome back!" : "Premium Trial Started!",
      body: isReturning
        ? `Your trial continues — ${trialDays} day${trialDays === 1 ? "" : "s"} of Premium remaining.`
        : `You have ${trialDays} days of free premium access. Enjoy all features!`,
      read: false,
      createdAt: now,
    });

    return await ctx.db.get(id);
  },
});

/**
 * Cancel subscription
 */
export const cancelSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!sub) throw new Error("No active subscription");

    await ctx.db.patch(sub._id, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Check if user has premium access
 */
export const hasPremium = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return false;

    if (user.isAdmin) return true;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!sub) return false;
    return isEffectivelyPremium(sub);
  },
});

/**
 * Check if user has premium, throw if not.
 * Use this as a gate in premium-only mutations.
 */
export const requirePremium = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    if (user.isAdmin) {
      return { isPremium: true, plan: "premium_annual", status: "active" };
    }

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .first();

    const isPremium = sub ? isEffectivelyPremium(sub) : false;
    return { isPremium, plan: sub?.plan || "free", status: sub ? effectiveStatus(sub) : "active" };
  },
});

// (earnPointsForReceipt removed — replaced by unified earnScanCredit)

/**
 * Get subscription plans available
 */
export const getPlans = query({
  args: {},
  handler: async (ctx) => {
    // Get dynamic pricing from config, fallback to hard-coded values if unseeded
    const pricing = await ctx.db.query("pricingConfig")
      .withIndex("by_active", q => q.eq("isActive", true))
      .collect();

    // Fallbacks: £2.99/mo, £21.99/yr
    const monthlyPrice = pricing.find(p => p.planId === "premium_monthly")?.priceAmount ?? 2.99;
    const annualPrice = pricing.find(p => p.planId === "premium_annual")?.priceAmount ?? 21.99;

    // Calculate savings
    const yearlyIfMonthly = monthlyPrice * 12;
    const savings = Math.round(((yearlyIfMonthly - annualPrice) / yearlyIfMonthly) * 100);
    const savingsAmount = yearlyIfMonthly - annualPrice;

    return [
      {
        id: "free",
        name: "Free",
        price: 0,
        period: null,
        features: [
          "All features included",
          "3 shopping lists",
          "50 pantry items",
          "Receipt scanning",
          "Price history & insights",
          "Partner mode",
          "7-day unlimited trial on signup",
        ],
      },
      {
        id: "premium_monthly",
        name: "Premium Monthly",
        price: monthlyPrice,
        period: "month",
        features: [
          "Unlimited lists & pantry items",
          "Priority support",
          "Earn up to £1.00–£1.79/mo back from scans",
        ],
      },
      {
        id: "premium_annual",
        name: "Premium Annual",
        price: annualPrice,
        period: "year",
        savings: `${savings}% off`,
        features: [
          "Everything in Monthly",
          `Save £${savingsAmount.toFixed(2)}/year`,
          "Early access to new features",
          "Earn up to £12.00–£21.48/yr back from scans",
        ],
      },
    ];
  },
});

// Re-export from submodule for api.subscriptions.* compatibility
export {
  getScanCredits,
  earnScanCredit,
  expireTrials,
  migrateToUnifiedRewards,
} from "./subscriptions/internal";
