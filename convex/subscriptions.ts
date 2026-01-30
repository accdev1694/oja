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
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!sub) {
      return {
        plan: "free" as const,
        status: "active" as const,
        features: getFreeFeatures(),
      };
    }

    return {
      ...sub,
      features: getPlanFeatures(sub.plan),
      isActive: sub.status === "active" || sub.status === "trial",
    };
  },
});

function getFreeFeatures() {
  return {
    maxLists: 3,
    maxPantryItems: 50,
    receiptScanning: true,
    priceHistory: false,
    partnerMode: false,
    insights: false,
    exportData: false,
  };
}

function getPlanFeatures(plan: string) {
  if (plan === "free") return getFreeFeatures();
  return {
    maxLists: -1, // unlimited
    maxPantryItems: -1,
    receiptScanning: true,
    priceHistory: true,
    partnerMode: true,
    insights: true,
    exportData: true,
  };
}

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

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
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
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();

    if (existing) throw new Error("Already has a subscription");

    const trialEndsAt = now + 7 * 24 * 60 * 60 * 1000;

    const id = await ctx.db.insert("subscriptions", {
      userId: user._id,
      plan: "premium_monthly",
      status: "trial",
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "trial_started",
      title: "Premium Trial Started!",
      body: "You have 7 days of free premium access. Enjoy all features!",
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
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
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
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return false;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!sub) return false;
    return sub.status === "active" || sub.status === "trial";
  },
});

// ============================================================================
// LOYALTY POINTS
// ============================================================================

/**
 * Get loyalty points for current user
 */
export const getLoyaltyPoints = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const loyalty = await ctx.db
      .query("loyaltyPoints")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .unique();

    if (!loyalty) {
      return {
        points: 0,
        lifetimePoints: 0,
        tier: "bronze" as const,
        nextTier: "silver" as const,
        pointsToNextTier: 500,
        discount: 0,
      };
    }

    const tierInfo = getTierInfo(loyalty.tier, loyalty.lifetimePoints);

    return {
      ...loyalty,
      ...tierInfo,
    };
  },
});

function getTierInfo(tier: string, lifetimePoints: number) {
  const tiers = [
    { name: "bronze", threshold: 0, discount: 0, nextTier: "silver", nextThreshold: 500 },
    { name: "silver", threshold: 500, discount: 10, nextTier: "gold", nextThreshold: 2000 },
    { name: "gold", threshold: 2000, discount: 25, nextTier: "platinum", nextThreshold: 5000 },
    { name: "platinum", threshold: 5000, discount: 50, nextTier: null, nextThreshold: null },
  ];

  const currentTier = tiers.find((t) => t.name === tier) || tiers[0];
  return {
    discount: currentTier.discount,
    nextTier: currentTier.nextTier,
    pointsToNextTier: currentTier.nextThreshold
      ? Math.max(0, currentTier.nextThreshold - lifetimePoints)
      : 0,
  };
}

/**
 * Earn loyalty points
 */
export const earnPoints = mutation({
  args: {
    amount: v.number(),
    source: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Get or create loyalty record
    let loyalty = await ctx.db
      .query("loyaltyPoints")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .unique();

    if (!loyalty) {
      const id = await ctx.db.insert("loyaltyPoints", {
        userId: user._id,
        points: args.amount,
        lifetimePoints: args.amount,
        tier: "bronze",
        lastEarnedAt: now,
        updatedAt: now,
      });
      loyalty = await ctx.db.get(id);
    } else {
      const newPoints = loyalty.points + args.amount;
      const newLifetime = loyalty.lifetimePoints + args.amount;
      const newTier = calculateTier(newLifetime);

      await ctx.db.patch(loyalty._id, {
        points: newPoints,
        lifetimePoints: newLifetime,
        tier: newTier,
        lastEarnedAt: now,
        updatedAt: now,
      });

      // Check tier upgrade
      if (newTier !== loyalty.tier) {
        await ctx.db.insert("notifications", {
          userId: user._id,
          type: "tier_upgrade",
          title: "Tier Upgrade!",
          body: `Congratulations! You've reached ${newTier.charAt(0).toUpperCase() + newTier.slice(1)} tier!`,
          read: false,
          createdAt: now,
        });
      }
    }

    // Log transaction
    await ctx.db.insert("pointTransactions", {
      userId: user._id,
      amount: args.amount,
      type: "earned",
      source: args.source,
      description: args.description,
      createdAt: now,
    });

    return { success: true, amount: args.amount };
  },
});

function calculateTier(lifetimePoints: number): "bronze" | "silver" | "gold" | "platinum" {
  if (lifetimePoints >= 5000) return "platinum";
  if (lifetimePoints >= 2000) return "gold";
  if (lifetimePoints >= 500) return "silver";
  return "bronze";
}

/**
 * Redeem loyalty points
 */
export const redeemPoints = mutation({
  args: {
    amount: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const loyalty = await ctx.db
      .query("loyaltyPoints")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .unique();

    if (!loyalty || loyalty.points < args.amount) {
      throw new Error("Insufficient points");
    }

    await ctx.db.patch(loyalty._id, {
      points: loyalty.points - args.amount,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("pointTransactions", {
      userId: user._id,
      amount: -args.amount,
      type: "redeemed",
      source: "manual",
      description: args.description,
      createdAt: Date.now(),
    });

    return { success: true, remainingPoints: loyalty.points - args.amount };
  },
});

/**
 * Get point transaction history
 */
export const getPointHistory = query({
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
      .query("pointTransactions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

/**
 * Get subscription plans available
 */
export const getPlans = query({
  args: {},
  handler: async () => {
    return [
      {
        id: "free",
        name: "Free",
        price: 0,
        period: null,
        features: [
          "3 shopping lists",
          "50 pantry items",
          "Receipt scanning",
          "Basic budget tracking",
        ],
      },
      {
        id: "premium_monthly",
        name: "Premium Monthly",
        price: 2.99,
        period: "month",
        features: [
          "Unlimited lists & pantry items",
          "Price history & trends",
          "Partner mode (shared lists)",
          "Insights & gamification",
          "Export data",
          "Priority support",
        ],
      },
      {
        id: "premium_annual",
        name: "Premium Annual",
        price: 21.99,
        period: "year",
        savings: "39% off",
        features: [
          "Everything in Monthly",
          "Save £14.89/year",
          "Early access to new features",
        ],
      },
    ];
  },
});
