import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

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
// TIER SYSTEM — Scan-based tiers with credit rates
// ============================================================================

type TierName = "bronze" | "silver" | "gold" | "platinum";

interface TierConfig {
  tier: TierName;
  creditPerScan: number;
  maxScans: number;     // monthly cap
  maxCredits: number;   // monthly max credit (£)
  threshold: number;    // lifetime scans to reach
}

const TIER_TABLE: TierConfig[] = [
  { tier: "bronze",   threshold: 0,   creditPerScan: 0.25, maxScans: 4, maxCredits: 1.00 },
  { tier: "silver",   threshold: 20,  creditPerScan: 0.25, maxScans: 5, maxCredits: 1.25 },
  { tier: "gold",     threshold: 50,  creditPerScan: 0.30, maxScans: 5, maxCredits: 1.50 },
  { tier: "platinum", threshold: 100, creditPerScan: 0.30, maxScans: 6, maxCredits: 1.79 },
];

function getTierFromScans(lifetimeScans: number): TierConfig {
  for (let i = TIER_TABLE.length - 1; i >= 0; i--) {
    if (lifetimeScans >= TIER_TABLE[i].threshold) return TIER_TABLE[i];
  }
  return TIER_TABLE[0];
}

function getNextTierInfo(lifetimeScans: number) {
  const current = getTierFromScans(lifetimeScans);
  const currentIdx = TIER_TABLE.findIndex((t) => t.tier === current.tier);
  if (currentIdx >= TIER_TABLE.length - 1) {
    return { nextTier: null, scansToNextTier: 0 };
  }
  const next = TIER_TABLE[currentIdx + 1];
  return {
    nextTier: next.tier,
    scansToNextTier: Math.max(0, next.threshold - lifetimeScans),
  };
}

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

// (earnPointsForReceipt removed — replaced by unified earnScanCredit)

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
          "Earn up to £1.00–£1.79/mo back (tier-based)",
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
          "Earn up to £12.00–£21.48/yr back (tier-based)",
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

    const now = Date.now();
    const plan = sub?.plan || "free";
    const isPremium = sub && (sub.status === "active" || sub.status === "trial") && plan !== "free";
    const isAnnual = plan === "premium_annual";

    // Find latest credit record for this user
    const credit = await ctx.db
      .query("scanCredits")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .first();

    const lifetimeScans = credit?.lifetimeScans ?? 0;
    const tierConfig = getTierFromScans(lifetimeScans);
    const nextTier = getNextTierInfo(lifetimeScans);

    // Tier-aware caps (scale for annual)
    const maxScans = isAnnual ? tierConfig.maxScans * 12 : tierConfig.maxScans;
    const maxCredits = isAnnual
      ? parseFloat((tierConfig.maxCredits * 12).toFixed(2))
      : tierConfig.maxCredits;
    const basePrice = isAnnual ? 21.99 : 2.99;

    // Current period credit progress (premium only)
    const hasCreditRecord = credit && credit.periodStart <= now && credit.periodEnd > now;
    const scansThisPeriod = hasCreditRecord ? credit.scansThisPeriod : 0;
    const creditsEarned = hasCreditRecord ? credit.creditsEarned : 0;

    return {
      lifetimeScans,
      tier: tierConfig.tier,
      tierInfo: {
        nextTier: nextTier.nextTier,
        scansToNextTier: nextTier.scansToNextTier,
        creditPerScan: tierConfig.creditPerScan,
        maxScans: tierConfig.maxScans,
        maxCredits: tierConfig.maxCredits,
      },
      scansThisPeriod,
      creditsEarned,
      maxScans,
      maxCredits,
      creditPerScan: tierConfig.creditPerScan,
      effectivePrice: isPremium
        ? parseFloat(Math.max(0, basePrice - creditsEarned).toFixed(2))
        : basePrice,
      basePrice,
      periodEnd: (hasCreditRecord ? credit.periodEnd : sub?.currentPeriodEnd) || null,
      plan,
      isPremium: !!isPremium,
    };
  },
});

/**
 * Award a scan credit when a receipt is confirmed.
 * Works for ALL users: free users get tier progression, premium users also get credits.
 * Replaces both earnPointsForReceipt and old earnScanCredit.
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

    // Deduplicate: check if this receipt already earned a credit
    const existingTx = await ctx.db
      .query("scanCreditTransactions")
      .withIndex("by_receipt", (q: any) => q.eq("receiptId", args.receiptId))
      .first();
    if (existingTx) {
      return { success: false, reason: "already_credited", creditEarned: 0, lifetimeScans: 0, tier: "bronze" as TierName };
    }

    // Get subscription
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .first();

    const plan = sub?.plan || "free";
    const isPremium = sub && (sub.status === "active" || sub.status === "trial") && plan !== "free";
    const isAnnual = plan === "premium_annual";

    // Get or create credit record
    let credit = await ctx.db
      .query("scanCredits")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .first();

    const periodStart = sub?.currentPeriodStart || now;
    const periodEnd = sub?.currentPeriodEnd || now + 30 * 24 * 60 * 60 * 1000;

    // Compute new lifetime scans BEFORE creating/updating records
    const oldLifetimeScans = credit?.lifetimeScans ?? 0;
    const newLifetimeScans = oldLifetimeScans + 1;
    const oldTier = getTierFromScans(oldLifetimeScans).tier;
    const newTierConfig = getTierFromScans(newLifetimeScans);
    const tierUpgrade = newTierConfig.tier !== oldTier;

    // Tier-aware caps
    const maxScans = isAnnual ? newTierConfig.maxScans * 12 : newTierConfig.maxScans;
    const maxCredits = isAnnual
      ? parseFloat((newTierConfig.maxCredits * 12).toFixed(2))
      : newTierConfig.maxCredits;

    // Create new period record if needed, or update existing
    if (!credit || credit.periodEnd <= now) {
      const id = await ctx.db.insert("scanCredits", {
        userId: user._id,
        periodStart,
        periodEnd,
        scansThisPeriod: 0,
        creditsEarned: 0,
        maxScans,
        maxCredits,
        creditPerScan: newTierConfig.creditPerScan,
        appliedToInvoice: false,
        lifetimeScans: oldLifetimeScans,
        tier: oldTier,
        createdAt: now,
        updatedAt: now,
      });
      credit = (await ctx.db.get(id))!;
    }

    // Determine credit amount: £0 if free user or past cap
    let creditAmount = 0;
    const atCap = credit.scansThisPeriod >= maxScans;

    if (isPremium && !atCap) {
      creditAmount = newTierConfig.creditPerScan;
    }

    // Update credit record
    const newScans = credit.scansThisPeriod + (isPremium && !atCap ? 1 : 0);
    const newCredits = parseFloat(
      Math.min(maxCredits, credit.creditsEarned + creditAmount).toFixed(2)
    );

    await ctx.db.patch(credit._id, {
      scansThisPeriod: newScans,
      creditsEarned: newCredits,
      lifetimeScans: newLifetimeScans,
      tier: newTierConfig.tier,
      maxScans,
      maxCredits,
      creditPerScan: newTierConfig.creditPerScan,
      updatedAt: now,
    });

    // Log transaction (always, even for free users — tracks scan count)
    await ctx.db.insert("scanCreditTransactions", {
      userId: user._id,
      scanCreditId: credit._id,
      receiptId: args.receiptId,
      creditAmount,
      scanNumber: newLifetimeScans,
      createdAt: now,
    });

    // Fire tier upgrade notification
    if (tierUpgrade) {
      const tierLabel = newTierConfig.tier.charAt(0).toUpperCase() + newTierConfig.tier.slice(1);
      const creditMsg = isPremium
        ? ` Scans now earn £${newTierConfig.creditPerScan.toFixed(2)} each.`
        : " Upgrade to Premium to unlock credits!";
      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "tier_upgrade",
        title: `${tierLabel} Tier Unlocked!`,
        body: `You've reached ${tierLabel} tier with ${newLifetimeScans} scans.${creditMsg}`,
        read: false,
        createdAt: now,
      });
    }

    return {
      success: true,
      creditEarned: creditAmount,
      totalCredits: newCredits,
      scansUsed: newScans,
      maxScans,
      lifetimeScans: newLifetimeScans,
      tier: newTierConfig.tier,
      tierUpgrade,
    };
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
