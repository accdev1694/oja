import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import {
  getFreeFeatures,
  getPlanFeatures,
  effectiveStatus,
  isEffectivelyPremium,
  getTierFromScans,
  getNextTierInfo,
  type TierName,
} from "./lib/featureGating";
import { trackFunnelEvent } from "./lib/analytics";

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

    // Calculate trial days for dynamic message
    const trialDays = Math.ceil((trialEndsAt - now) / (24 * 60 * 60 * 1000));

    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "trial_started",
      title: "Premium Trial Started!",
      body: `You have ${trialDays} days of free premium access. Enjoy all features!`,
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

    if (user.isAdmin) return true;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
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
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    if (user.isAdmin) {
      return { isPremium: true, plan: "premium_annual", status: "active" };
    }

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
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
    // Get dynamic pricing from config
    const pricing = await ctx.db.query("pricingConfig")
      .withIndex("by_active", (q: any) => q.eq("isActive", true))
      .collect();

    const monthlyPrice = pricing.find((p: any) => p.planId === "premium_monthly")?.priceAmount ?? 0;
    const annualPrice = pricing.find((p: any) => p.planId === "premium_annual")?.priceAmount ?? 0;

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

// =============================================
// Unified Scan Rewards — Receipt scans earn tier progress + credits
// =============================================

/**
 * Get scan rewards status for the authenticated user.
 * Returns data for ALL users (free + premium).
 * Free users see tier progress; premium users also see credit progress.
 */
export const getScanCredits = query({
  args: {},
  handler: async () => null,
});

export const earnScanCredit = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async () => null,
});

// =============================================================================
// CRON: Expire stale trials — runs daily, flips trial → expired
// =============================================================================

export const expireTrials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const trialSubs = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q: any) => q.eq("status", "trial"))
      .collect();

    let expired = 0;
    for (const sub of trialSubs) {
      if (sub.trialEndsAt && sub.trialEndsAt <= now) {
        await ctx.db.patch(sub._id, {
          status: "expired",
          updatedAt: now,
        });
        expired++;
      }
    }

    return { expired };
  },
});

// =============================================================================
// DATA MIGRATION — run once after deploy from Convex dashboard
// =============================================================================

/**
 * Backfill `lifetimeScans` and `tier` on existing scanCredits records.
 *
 * For each user with a scanCredits record:
 * 1. Count scanCreditTransactions for that user → lifetime scans
 * 2. Also count pointTransactions where source = "receipt_scan" (pre-credit era)
 * 3. Deduplicate by receipt (don't double-count)
 * 4. Set lifetimeScans and compute tier on latest scanCredits record
 */
export const migrateToUnifiedRewards = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allCredits = await ctx.db.query("scanCredits").collect();
    const userIds = [...new Set(allCredits.map((c: any) => c.userId))];

    let migrated = 0;

    for (const userId of userIds) {
      // Count scan credit transactions
      const scanTxns = await ctx.db
        .query("scanCreditTransactions")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect();

      const receiptIds = new Set(scanTxns.map((t: any) => t.receiptId?.toString()).filter(Boolean));

      // Count point transactions from receipt scans (pre-credit era)
      const pointTxns = await ctx.db
        .query("pointTransactions")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect();

      for (const pt of pointTxns) {
        if ((pt as any).source === "receipt_scan" && (pt as any).receiptId) {
          const rid = (pt as any).receiptId.toString();
          if (!receiptIds.has(rid)) {
            receiptIds.add(rid);
          }
        }
      }

      const lifetimeScans = receiptIds.size;
      const tierConfig = getTierFromScans(lifetimeScans);

      // Update latest scanCredits record for this user
      const latestCredit = allCredits
        .filter((c: any) => c.userId === userId)
        .sort((a: any, b: any) => (b._creationTime || 0) - (a._creationTime || 0))[0];

      if (latestCredit) {
        await ctx.db.patch(latestCredit._id, {
          lifetimeScans,
          tier: tierConfig.tier,
          updatedAt: Date.now(),
        });
        migrated++;
      }
    }

    return { migrated, totalUsers: userIds.length };
  },
});
