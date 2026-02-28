/**
 * Stripe Integration Actions
 *
 * Convex actions for creating Stripe Checkout sessions,
 * Customer Portal sessions, and processing webhook events.
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getTierFromScans } from "./lib/featureGating";
import { trackFunnelEvent, trackActivity } from "./lib/analytics";

// =============================================================================
// STRIPE CHECKOUT SESSION
// =============================================================================

export const createCheckoutSession = action({
  args: {
    planId: v.union(v.literal("premium_monthly"), v.literal("premium_annual")),
  },
  handler: async (ctx, args): Promise<{ url: string | null; sessionId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const stripe = await getStripeClient();

    const user: any = await ctx.runQuery(internal.stripe.getUserByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    const subscription: any = await ctx.runQuery(
      internal.stripe.getSubscriptionByUser,
      { userId: user._id }
    );

    let customerId: string | undefined = subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name,
        metadata: {
          convexUserId: user._id,
          clerkId: identity.subject,
        },
      });
      customerId = customer.id;
    }

    const priceId =
      args.planId === "premium_monthly"
        ? process.env.STRIPE_PRICE_MONTHLY!
        : process.env.STRIPE_PRICE_ANNUAL!;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL || "https://oja.app"}/subscription?success=true`,
      cancel_url: `${process.env.APP_URL || "https://oja.app"}/subscription?cancelled=true`,
      subscription_data: {
        metadata: {
          convexUserId: user._id,
          planId: args.planId,
        },
      },
      metadata: {
        convexUserId: user._id,
        planId: args.planId,
      },
    });

    return { url: session.url, sessionId: session.id };
  },
});

// =============================================================================
// STRIPE CUSTOMER PORTAL
// =============================================================================

export const createPortalSession = action({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const stripe = await getStripeClient();

    const user: any = await ctx.runQuery(internal.stripe.getUserByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    const subscription: any = await ctx.runQuery(
      internal.stripe.getSubscriptionByUser,
      { userId: user._id }
    );

    if (!subscription?.stripeCustomerId) {
      throw new Error("No Stripe customer found. Please subscribe first.");
    }

    const session: any = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.APP_URL || "https://oja.app"}/subscription`,
    });

    return { url: session.url };
  },
});

// =============================================================================
// WEBHOOK PROCESSING
// =============================================================================

export const processWebhookEvent = action({
  args: {
    eventType: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const { eventType, data } = args;

    switch (eventType) {
      case "checkout.session.completed": {
        const session = data;
        const convexUserId = session.metadata?.convexUserId;
        const planId = session.metadata?.planId;
        if (convexUserId && planId) {
          await ctx.runMutation(internal.stripe.handleCheckoutCompleted, {
            userId: convexUserId,
            planId,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = data;
        await ctx.runMutation(internal.stripe.handleSubscriptionUpdated, {
          stripeCustomerId: sub.customer,
          stripeSubscriptionId: sub.id,
          status: mapStripeStatus(sub.status, sub.cancel_at_period_end),
          currentPeriodStart: sub.current_period_start * 1000,
          currentPeriodEnd: sub.current_period_end * 1000,
        });
        break;
      }

      case "customer.subscription.deleted": {
        await ctx.runMutation(internal.stripe.handleSubscriptionDeleted, {
          stripeCustomerId: data.customer,
        });
        break;
      }

      case "invoice.payment_failed": {
        await ctx.runMutation(internal.stripe.handlePaymentFailed, {
          stripeCustomerId: data.customer,
        });
        break;
      }

      case "invoice.created": {
        // Apply scan credits as a discount before the invoice is finalized
        // Handles both first subscription and renewals
        const isSubscriptionInvoice =
          data.billing_reason === "subscription_cycle" ||
          data.billing_reason === "subscription_create";
        if (isSubscriptionInvoice && data.status === "draft") {
          const creditResult: any = await ctx.runMutation(
            internal.stripe.getAndMarkScanCredits,
            {
              stripeCustomerId: data.customer,
              stripeInvoiceId: data.id,
            }
          );
          if (creditResult && creditResult.creditsToApply > 0) {
            const stripe = await getStripeClient();
            // Add a negative invoice item (credit) to the draft invoice
            const creditAmountPence = Math.round(creditResult.creditsToApply * 100);
            await stripe.invoiceItems.create({
              customer: data.customer,
              invoice: data.id,
              amount: -creditAmountPence,
              currency: "gbp",
              description: `Scan credit reward (${creditResult.tier} tier, ${creditResult.scansThisPeriod} scans)`,
            });
          }
        }
        break;
      }
    }

    return { success: true };
  },
});

function mapStripeStatus(
  stripeStatus: string,
  cancelAtPeriodEnd: boolean
): "active" | "cancelled" | "expired" | "trial" {
  if (cancelAtPeriodEnd) return "cancelled";
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trial";
    case "canceled":
    case "unpaid":
    case "past_due":
      return "cancelled";
    case "incomplete_expired":
      return "expired";
    default:
      return "active";
  }
}

// =============================================================================
// INTERNAL QUERIES (called by actions)
// =============================================================================

export const getUserByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const getSubscriptionByUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .first();
  },
});

// =============================================================================
// INTERNAL MUTATIONS (called from webhook processor)
// =============================================================================

export const handleCheckoutCompleted = internalMutation({
  args: {
    userId: v.string(),
    planId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find user by Convex ID (stored as string in Stripe metadata)
    const userId = args.userId as Id<"users">;
    let user;
    try {
      user = await ctx.db.get(userId);
    } catch {
      user = null;
    }
    if (!user) {
      console.error(
        `[handleCheckoutCompleted] User not found for ID: ${args.userId}. ` +
        `Stripe customer: ${args.stripeCustomerId}, plan: ${args.planId}. ` +
        `Payment succeeded but subscription NOT activated.`
      );
      throw new Error(`User not found for Stripe checkout: ${args.userId}`);
    }

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .first();

    const plan =
      args.planId === "premium_annual" ? "premium_annual" : "premium_monthly";

    if (existing) {
      await ctx.db.patch(existing._id, {
        plan: plan as "premium_monthly" | "premium_annual",
        status: "active",
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId,
        plan: plan as "premium_monthly" | "premium_annual",
        status: "active",
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: now + 30 * 24 * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("notifications", {
      userId,
      type: "subscription_activated",
      title: "Premium Activated!",
      body: "Welcome to Oja Premium. Enjoy all features!",
      read: false,
      createdAt: now,
    });

    // Track subscription funnel event
    await trackFunnelEvent(ctx, userId, "subscribed", {
      plan: args.planId,
      stripeSubscriptionId: args.stripeSubscriptionId,
    });

    // Track activity
    await trackActivity(ctx, userId, "subscribed", { plan: args.planId });

    // Create initial scanCredits record for the first billing period
    // Carry forward lifetime scans from trial period if they exist
    const prevCredit = await ctx.db
      .query("scanCredits")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .first();

    const lifetimeScans = prevCredit?.lifetimeScans ?? 0;
    const tier = prevCredit?.tier ?? "bronze";
    const isAnnual = plan === "premium_annual";
    const tierConfig = getTierFromScans(lifetimeScans);

    const periodStart = existing?.currentPeriodStart ?? now;
    const periodEnd = existing?.currentPeriodEnd ?? now + 30 * 24 * 60 * 60 * 1000;
    const maxScans = isAnnual ? tierConfig.maxScans * 12 : tierConfig.maxScans;
    const maxCredits = isAnnual
      ? parseFloat((tierConfig.maxCredits * 12).toFixed(2))
      : tierConfig.maxCredits;

    // Only create if no active-period record exists
    const hasActiveCreditRecord = prevCredit && prevCredit.periodEnd > now && !prevCredit.appliedToInvoice;
    if (!hasActiveCreditRecord) {
      await ctx.db.insert("scanCredits", {
        userId,
        periodStart,
        periodEnd,
        scansThisPeriod: 0,
        creditsEarned: 0,
        maxScans,
        maxCredits,
        creditPerScan: tierConfig.creditPerScan,
        appliedToInvoice: false,
        lifetimeScans,
        tier: tier as "bronze" | "silver" | "gold" | "platinum",
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const handleSubscriptionUpdated = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("expired"),
      v.literal("trial")
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer", (q: any) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    if (!sub) return;

    // Detect billing period change → reset scan credits
    const periodChanged = sub.currentPeriodStart !== args.currentPeriodStart;

    await ctx.db.patch(sub._id, {
      status: args.status,
      stripeSubscriptionId: args.stripeSubscriptionId,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      updatedAt: Date.now(),
    });

    // Create fresh scan credits record for new billing period (tier-aware)
    if (periodChanged && (args.status === "active" || args.status === "trial")) {
      const isAnnual = sub.plan === "premium_annual";

      // Carry forward lifetimeScans and tier from previous record
      const prevCredit = await ctx.db
        .query("scanCredits")
        .withIndex("by_user", (q: any) => q.eq("userId", sub.userId))
        .order("desc")
        .first();

      const lifetimeScans = prevCredit?.lifetimeScans ?? 0;
      const tier = prevCredit?.tier ?? "bronze";

      // Tier-aware caps (using shared tier config)
      const tierConfig = getTierFromScans(lifetimeScans);

      const maxScans = isAnnual ? tierConfig.maxScans * 12 : tierConfig.maxScans;
      const maxCredits = isAnnual
        ? parseFloat((tierConfig.maxCredits * 12).toFixed(2))
        : tierConfig.maxCredits;

      await ctx.db.insert("scanCredits", {
        userId: sub.userId,
        periodStart: args.currentPeriodStart,
        periodEnd: args.currentPeriodEnd,
        scansThisPeriod: 0,
        creditsEarned: 0,
        maxScans,
        maxCredits,
        creditPerScan: tierConfig.creditPerScan,
        appliedToInvoice: false,
        lifetimeScans,
        tier: tier as any,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const handleSubscriptionDeleted = internalMutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer", (q: any) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    if (!sub) return;

    await ctx.db.patch(sub._id, {
      status: "expired",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId: sub.userId,
      type: "subscription_expired",
      title: "Subscription Ended",
      body: "Your premium subscription has ended. Upgrade to keep all features.",
      read: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get unapplied scan credits for a Stripe customer and mark them as applied.
 * Called during invoice.created to apply credits as a discount.
 */
export const getAndMarkScanCredits = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeInvoiceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find subscription by Stripe customer ID
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer", (q: any) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    if (!sub) return null;

    // Find the latest unapplied scan credit record for this user
    const credit = await ctx.db
      .query("scanCredits")
      .withIndex("by_user", (q: any) => q.eq("userId", sub.userId))
      .order("desc")
      .first();

    if (!credit || credit.appliedToInvoice || credit.creditsEarned <= 0) {
      return null;
    }

    // Mark as applied with invoice ID for audit trail
    await ctx.db.patch(credit._id, {
      appliedToInvoice: true,
      stripeInvoiceId: args.stripeInvoiceId,
      updatedAt: Date.now(),
    });

    return {
      creditsToApply: credit.creditsEarned,
      scansThisPeriod: credit.scansThisPeriod,
      tier: credit.tier ?? "bronze",
    };
  },
});

export const handlePaymentFailed = internalMutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer", (q: any) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    if (!sub) return;

    await ctx.db.insert("notifications", {
      userId: sub.userId,
      type: "payment_failed",
      title: "Payment Failed",
      body: "We couldn't process your payment. Please update your payment method.",
      read: false,
      createdAt: Date.now(),
    });
  },
});

// =============================================================================
// HELPERS
// =============================================================================

async function getStripeClient() {
  const Stripe = (await import("stripe")).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-04-30.basil" as any,
  });
}

// (Old calculateTier removed — tier calculation now in subscriptions.ts)
