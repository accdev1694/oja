/**
 * Stripe Integration Actions
 *
 * Convex actions for creating Stripe Checkout sessions,
 * Customer Portal sessions, and processing webhook events.
 */

import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getTierFromScans } from "./lib/featureGating";
import { trackFunnelEvent, trackActivity } from "./lib/analytics";
import { processExpirePoints } from "./points";

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
// STRIPE CANCELLATION (for Account Deletion)
// =============================================================================

export const cancelAllUserSubscriptions = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; count: number }> => {
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
      return { success: true, count: 0 };
    }

    // List all active/trialling subscriptions for this customer
    const stripeSubs = await stripe.subscriptions.list({
      customer: subscription.stripeCustomerId,
      status: "active",
    });

    const trialSubs = await stripe.subscriptions.list({
      customer: subscription.stripeCustomerId,
      status: "trialing",
    });

    const allSubs = [...stripeSubs.data, ...trialSubs.data];

    for (const sub of allSubs) {
      await stripe.subscriptions.cancel(sub.id);
    }

    return { success: true, count: allSubs.length };
  },
});

// =============================================================================
// WEBHOOK PROCESSING
// =============================================================================

export const processWebhookEvent = action({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const { eventId, eventType, data } = args;

    // 1. Check if already processed
    const existing: any = await ctx.runQuery(internal.stripe.checkWebhookProcessed, {
      eventId,
    });

    if (existing) {
      if (existing.status === "completed") {
        console.log(`[Webhook] Duplicate detected: ${eventId} (already completed at ${new Date(existing.processedAt).toISOString()})`);
        return { success: true };
      }
      if (existing.status === "processing") {
        console.warn(`[Webhook] Concurrent processing detected: ${eventId}`);
        return { success: true }; // Let it finish
      }
    }

    // 2. Mark as processing
    await ctx.runMutation(internal.stripe.markWebhookProcessing, {
      eventId,
      eventType,
    });

    try {
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
          // Apply points as a discount before the invoice is finalized
          const isSubscriptionInvoice =
            data.billing_reason === "subscription_cycle" ||
            data.billing_reason === "subscription_create";
          if (isSubscriptionInvoice && data.status === "draft") {
            // PHASE 1: Reserve points
            const creditResult: any = await ctx.runMutation(
              internal.stripe.reservePoints,
              {
                stripeCustomerId: data.customer,
                stripeInvoiceId: data.id,
              }
            );
            if (creditResult && creditResult.pointsApplied > 0) {
              const stripe = await getStripeClient();
              const creditAmountPence = Math.round(creditResult.pointsApplied / 10);
              
              try {
                // PHASE 2: Apply to Stripe
                await stripe.invoiceItems.create({
                  customer: data.customer,
                  invoice: data.id,
                  amount: -creditAmountPence,
                  currency: "gbp",
                  description: `Oja Points redemption (${creditResult.pointsApplied} pts applied)`,
                });

                // PHASE 3a: Confirm Redemption
                await ctx.runMutation(internal.stripe.confirmPointsRedemption, {
                  reservationId: creditResult.reservationId
                });
              } catch (stripeError: any) {
                console.error(`[Webhook] Stripe invoice item creation failed for ${data.id}:`, stripeError);
                // PHASE 3b: Release Reservation
                await ctx.runMutation(internal.stripe.releasePoints, {
                  reservationId: creditResult.reservationId
                });
                throw stripeError; // Fail the webhook processing
              }
            }
          }
          break;
        }
      }

      // 3. Mark as complete
      await ctx.runMutation(internal.stripe.markWebhookComplete, { eventId });
      return { success: true };
    } catch (error) {
      console.error(`[Webhook] Error processing ${eventType} (${eventId}):`, error);
      // 4. Mark as failed
      await ctx.runMutation(internal.stripe.markWebhookFailed, {
        eventId,
        error: String(error),
      });
      throw error;
    }
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

export const checkWebhookProcessed = internalQuery({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("processedWebhooks")
      .withIndex("by_event_id", (q: any) => q.eq("eventId", args.eventId))
      .first();
  },
});

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

export const markWebhookProcessing = internalMutation({
  args: { eventId: v.string(), eventType: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("processedWebhooks", {
      eventId: args.eventId,
      eventType: args.eventType,
      processedAt: Date.now(),
      status: "processing",
    });
  },
});

export const markWebhookComplete = internalMutation({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("processedWebhooks")
      .withIndex("by_event_id", (q: any) => q.eq("eventId", args.eventId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "completed",
        processedAt: Date.now(),
      });
    }
  },
});

export const markWebhookFailed = internalMutation({
  args: { eventId: v.string(), error: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("processedWebhooks")
      .withIndex("by_event_id", (q: any) => q.eq("eventId", args.eventId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "failed",
        error: args.error,
        processedAt: Date.now(),
      });
    }
  },
});

export const cleanupOldWebhooks = internalMutation({
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const oldWebhooks = await ctx.db
      .query("processedWebhooks")
      .withIndex("by_processed_at", (q: any) => q.lt("processedAt", ninetyDaysAgo))
      .collect();

    for (const webhook of oldWebhooks) {
      await ctx.db.delete(webhook._id);
    }

    return { deleted: oldWebhooks.length };
  },
});

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

    // Phase 3.1.2: Grant welcome bonus for new annual subscribers (500 points)
    if (plan === "premium_annual") {
      await ctx.runMutation(internal.points.awardBonusPoints, {
        userId,
        amount: 500,
        source: "annual_subscription_bonus",
        metadata: { stripeSubscriptionId: args.stripeSubscriptionId }
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

    // Detect billing period change
    const periodChanged = sub.currentPeriodStart !== args.currentPeriodStart;

    await ctx.db.patch(sub._id, {
      status: args.status,
      stripeSubscriptionId: args.stripeSubscriptionId,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      updatedAt: Date.now(),
    });

    // Note: Points balance is handled dynamically. No period-specific record needed.
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

    // Phase 3.1.3: Expire all remaining points on cancellation
    const balance = await ctx.db
      .query("pointsBalance")
      .withIndex("by_user", (q: any) => q.eq("userId", sub.userId))
      .first();

    if (balance && balance.availablePoints > 0) {
      await processExpirePoints(ctx, sub.userId, balance.availablePoints, "subscription_cancelled");
    }
  },
});

/**
 * Phase 1 of Two-Phase Commit: Reserve points for a Stripe invoice.
 */
export const reservePoints = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeInvoiceId: v.string(),
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

    // Find points balance
    const balance = await ctx.db
      .query("pointsBalance")
      .withIndex("by_user", (q: any) => q.eq("userId", sub.userId))
      .first();

    if (!balance || balance.availablePoints < 500) {
      return null;
    }

    // Check if we already have an active reservation or transaction for this invoice
    const existingReservation = await ctx.db
      .query("pointsReservations")
      .withIndex("by_invoice", (q: any) => q.eq("stripeInvoiceId", args.stripeInvoiceId))
      .filter(q => q.neq(q.field("status"), "released"))
      .first();
      
    if (existingReservation) {
      return null; // Already processing or confirmed
    }

    // Determine how many points to apply
    const pointsToApply = Math.floor(balance.availablePoints / 500) * 500;
    
    const isAnnual = sub.plan === "premium_annual";
    const maxPoints = isAnnual ? 5000 : 1500;
    const finalPoints = Math.min(pointsToApply, maxPoints);

    if (finalPoints === 0) return null;

    // Create reservation (DOES NOT DEDUCT POINTS YET)
    const now = Date.now();
    const reservationId = await ctx.db.insert("pointsReservations", {
      userId: sub.userId,
      stripeInvoiceId: args.stripeInvoiceId,
      amount: finalPoints,
      status: "pending",
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000, // 5 minute expiry
    });

    return {
      pointsApplied: finalPoints,
      reservationId,
      tier: balance.tier ?? "bronze",
    };
  },
});

/**
 * Phase 3a of Two-Phase Commit: Confirm points redemption.
 */
export const confirmPointsRedemption = internalMutation({
  args: {
    reservationId: v.id("pointsReservations"),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation || reservation.status !== "pending") return;

    const balance = await ctx.db
      .query("pointsBalance")
      .withIndex("by_user", (q: any) => q.eq("userId", reservation.userId))
      .first();

    if (!balance) return;

    const now = Date.now();
    
    // Deduct points NOW
    await ctx.db.patch(balance._id, {
      availablePoints: balance.availablePoints - reservation.amount,
      pointsUsed: balance.pointsUsed + reservation.amount,
      updatedAt: now,
    });

    await ctx.db.insert("pointsTransactions", {
      userId: reservation.userId,
      type: "redeem",
      amount: -reservation.amount,
      source: "invoice_credit",
      invoiceId: reservation.stripeInvoiceId,
      balanceBefore: balance.availablePoints,
      balanceAfter: balance.availablePoints - reservation.amount,
      createdAt: now,
    });

    // Mark reservation confirmed
    await ctx.db.patch(reservation._id, { status: "confirmed" });
  },
});

/**
 * Phase 3b of Two-Phase Commit: Release points reservation.
 */
export const releasePoints = internalMutation({
  args: {
    reservationId: v.id("pointsReservations"),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation || reservation.status !== "pending") return;

    // Just mark as released, points were never actually deducted
    await ctx.db.patch(reservation._id, { status: "released" });
  },
});

export const reconcilePointRedemptions = internalAction({
  args: {},
  handler: async (ctx) => {
    const stripe = await getStripeClient();
    
    // 1. Get all active subscriptions from DB
    const activeSubs: any = await ctx.runQuery(internal.stripe.getActiveSubscriptions);
    
    let checkedCount = 0;
    let discrepanciesFound = 0;
    
    for (const sub of activeSubs) {
      if (!sub.stripeCustomerId) continue;
      
      // 2. Get recent invoices from Stripe (Check last 100 instead of 5)
      const invoices = await stripe.invoices.list({
        customer: sub.stripeCustomerId,
        limit: 100,
      });
      
      for (const invoice of invoices.data) {
        if (invoice.status !== "paid") continue;

        // Check if this invoice has points applied in our DB
        const transaction: any = await ctx.runQuery(internal.stripe.getRedemptionByInvoiceId, {
          userId: sub.userId,
          invoiceId: invoice.id,
        });
        
        const hasPointCredit = invoice.lines.data.some(line => 
          line.description?.toLowerCase().includes("oja points redemption")
        );

        // Discrepancy 1: Convex thinks points applied, but no Stripe credit
        if (transaction && !hasPointCredit) {
          discrepanciesFound++;
          await ctx.runMutation(internal.stripe.logDiscrepancy, {
            type: "points_reconciliation",
            severity: "high",
            description: `Invoice ${invoice.id} has a redemption record in Convex but no point credit in Stripe.`,
            metadata: { invoiceId: invoice.id, userId: sub.userId, transactionId: transaction._id },
          });
        }
        
        // Discrepancy 2: Stripe has credit, but no Convex transaction
        if (!transaction && hasPointCredit) {
          discrepanciesFound++;
          await ctx.runMutation(internal.stripe.logDiscrepancy, {
            type: "points_reconciliation",
            severity: "high",
            description: `Invoice ${invoice.id} has point credit in Stripe but no redemption record in Convex.`,
            metadata: { invoiceId: invoice.id, userId: sub.userId },
          });
        }
      }
      checkedCount++;
    }
    
    return { subscriptionsChecked: checkedCount, discrepanciesFound };
  },
});

export const logDiscrepancy = internalMutation({
  args: {
    type: v.string(),
    severity: v.string(),
    description: v.string(),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("discrepancies", {
      type: args.type,
      severity: args.severity,
      description: args.description,
      metadata: args.metadata,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

export const getActiveSubscriptions = internalQuery({
  args: {},
  handler: async (ctx) => {
    const active = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q: any) => q.eq("status", "active"))
      .collect();
    const trial = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q: any) => q.eq("status", "trial"))
      .collect();
    return [...active, ...trial];
  },
});

export const getRedemptionByInvoiceId = internalQuery({
  args: { userId: v.id("users"), invoiceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pointsTransactions")
      .withIndex("by_user_and_type", (q: any) => q.eq("userId", args.userId).eq("type", "redeem"))
      .filter((q) => q.eq(q.field("invoiceId"), args.invoiceId))
      .first();
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
