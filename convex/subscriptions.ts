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
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .first();

    const isPremium = sub && (sub.status === "active" || sub.status === "trial");
    return { isPremium: !!isPremium, plan: sub?.plan || "free", status: sub?.status || "active" };
  },
});

/**
 * Award loyalty points when a receipt is successfully scanned.
 * Includes first-receipt bonus and daily cap enforcement.
 */
export const earnPointsForReceipt = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Verify receipt belongs to user
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) throw new Error("Receipt not found");

    // Daily cap: max 5 receipts per day for point earning
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const todayTransactions = await ctx.db
      .query("pointTransactions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const todayReceiptEarns = todayTransactions.filter(
      (t) =>
        t.source === "receipt_scan" &&
        t.type === "earned" &&
        t.createdAt >= todayMs
    );

    if (todayReceiptEarns.length >= 5) {
      return { success: false, reason: "daily_cap", pointsEarned: 0 };
    }

    // Check if this is the user's first receipt ever
    const allReceipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const completedReceipts = allReceipts.filter(
      (r) => r.processingStatus === "completed"
    );
    const isFirstReceipt = completedReceipts.length <= 1;

    // Base points: 10 per receipt scan
    let pointsToAward = 10;
    let description = "Receipt scanned";

    // First receipt bonus: +20
    if (isFirstReceipt) {
      pointsToAward += 20;
      description = "First receipt scanned! (+20 bonus)";
    }

    // Weekly streak bonus: 3+ receipts this week → +10
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weekReceipts = completedReceipts.filter(
      (r) => r.purchaseDate >= weekAgo
    );
    if (weekReceipts.length >= 3) {
      pointsToAward += 10;
      description += " (+10 weekly streak)";
    }

    // Get or create loyalty record
    let loyalty = await ctx.db
      .query("loyaltyPoints")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .unique();

    if (!loyalty) {
      const id = await ctx.db.insert("loyaltyPoints", {
        userId: user._id,
        points: pointsToAward,
        lifetimePoints: pointsToAward,
        tier: "bronze",
        lastEarnedAt: now,
        updatedAt: now,
      });
      loyalty = await ctx.db.get(id);
    } else {
      const newPoints = loyalty.points + pointsToAward;
      const newLifetime = loyalty.lifetimePoints + pointsToAward;
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
      amount: pointsToAward,
      type: "earned",
      source: "receipt_scan",
      description,
      createdAt: now,
    });

    return { success: true, pointsEarned: pointsToAward };
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
          "Earn up to £1.00/mo back with receipt scans",
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
          "Earn up to £12.00/yr back with receipt scans",
        ],
      },
    ];
  },
});

// =============================================
// Scan Credits — Receipt scans reduce subscription price
// =============================================

/**
 * Get current scan credit status for the authenticated user.
 * Returns null for free users or users without a subscription.
 */
export const getScanCredits = query({
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

    // No subscription or free plan → no credits
    if (!sub || sub.plan === "free" || sub.status === "expired") {
      return null;
    }

    const now = Date.now();
    const isAnnual = sub.plan === "premium_annual";
    const basePrice = isAnnual ? 21.99 : 2.99;
    const maxScans = isAnnual ? 48 : 4;
    const maxCredits = isAnnual ? 12.0 : 1.0;

    // Find credit record for current billing period
    const credit = await ctx.db
      .query("scanCredits")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (credit && credit.periodStart <= now && credit.periodEnd > now) {
      return {
        scansThisPeriod: credit.scansThisPeriod,
        creditsEarned: credit.creditsEarned,
        maxScans: credit.maxScans,
        maxCredits: credit.maxCredits,
        creditPerScan: credit.creditPerScan,
        effectivePrice: parseFloat(Math.max(0, basePrice - credit.creditsEarned).toFixed(2)),
        basePrice,
        periodEnd: credit.periodEnd,
        plan: sub.plan,
      };
    }

    // No credit record for current period — return defaults
    return {
      scansThisPeriod: 0,
      creditsEarned: 0,
      maxScans,
      maxCredits,
      creditPerScan: 0.25,
      effectivePrice: basePrice,
      basePrice,
      periodEnd: sub.currentPeriodEnd || null,
      plan: sub.plan,
    };
  },
});

/**
 * Award a scan credit when a receipt is confirmed.
 * Called alongside earnPointsForReceipt.
 * £0.25 per scan, capped at £1.00/month (4 scans) or £12.00/year (48 scans).
 */
export const earnScanCredit = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Verify receipt belongs to user
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) throw new Error("Receipt not found");

    // Get subscription — must have active premium
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!sub || sub.plan === "free") {
      return { success: false, reason: "no_premium", creditEarned: 0 };
    }
    if (sub.status !== "active" && sub.status !== "trial") {
      return { success: false, reason: "inactive_subscription", creditEarned: 0 };
    }

    // Deduplicate: check if this receipt already earned a credit
    const existingTx = await ctx.db
      .query("scanCreditTransactions")
      .withIndex("by_receipt", (q: any) => q.eq("receiptId", args.receiptId))
      .first();
    if (existingTx) {
      return { success: false, reason: "already_credited", creditEarned: 0 };
    }

    const isAnnual = sub.plan === "premium_annual";
    const maxScans = isAnnual ? 48 : 4;
    const maxCredits = isAnnual ? 12.0 : 1.0;
    const creditPerScan = 0.25;
    const periodStart = sub.currentPeriodStart || now;
    const periodEnd = sub.currentPeriodEnd || now + 30 * 24 * 60 * 60 * 1000;

    // Get or create credit record for current billing period
    let credit = await ctx.db
      .query("scanCredits")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!credit || credit.periodEnd <= now) {
      const id = await ctx.db.insert("scanCredits", {
        userId: user._id,
        periodStart,
        periodEnd,
        scansThisPeriod: 0,
        creditsEarned: 0,
        maxScans,
        maxCredits,
        creditPerScan,
        appliedToInvoice: false,
        createdAt: now,
        updatedAt: now,
      });
      credit = (await ctx.db.get(id))!;
    }

    // Check cap
    if (credit.scansThisPeriod >= credit.maxScans) {
      return { success: false, reason: "monthly_cap", creditEarned: 0 };
    }

    // Award credit
    const newScans = credit.scansThisPeriod + 1;
    const newCredits = parseFloat(
      Math.min(credit.maxCredits, credit.creditsEarned + creditPerScan).toFixed(2)
    );

    await ctx.db.patch(credit._id, {
      scansThisPeriod: newScans,
      creditsEarned: newCredits,
      updatedAt: now,
    });

    // Log transaction
    await ctx.db.insert("scanCreditTransactions", {
      userId: user._id,
      scanCreditId: credit._id,
      receiptId: args.receiptId,
      creditAmount: creditPerScan,
      scanNumber: newScans,
      createdAt: now,
    });

    return {
      success: true,
      creditEarned: creditPerScan,
      totalCredits: newCredits,
      scansUsed: newScans,
      maxScans: credit.maxScans,
    };
  },
});
