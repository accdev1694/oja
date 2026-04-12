import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { trackFunnelEvent, trackActivity } from "../lib/analytics";

/** Minimal shape of a Stripe webhook event data object. */
interface StripeEventData {
  id?: string;
  customer?: string;
  subscription?: string;
  status?: string;
  cancel_at_period_end?: boolean;
  current_period_start?: number;
  current_period_end?: number;
  billing_reason?: string;
  metadata?: Record<string, string>;
}

async function getStripeClient() {
  const Stripe = (await import("stripe")).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-01-28.clover" as const,
  });
}

function mapStripeStatus(
  stripeStatus: string,
  cancelAtPeriodEnd: boolean
): "active" | "cancelled" | "expired" | "trial" {
  if (cancelAtPeriodEnd) return "cancelled";
  switch (stripeStatus) {
    case "active": return "active";
    case "trialing": return "trial";
    case "canceled":
    case "unpaid":
    case "past_due": return "cancelled";
    case "incomplete_expired": return "expired";
    default: return "active";
  }
}

export const processWebhookEvent = action({
  args: { eventId: v.string(), eventType: v.string(), data: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const { eventId, eventType } = args;
    const data = JSON.parse(args.data) as StripeEventData;

    // C1 fix: Use atomic check-and-mark mutation to prevent race condition
    const markResult = await ctx.runMutation(internal.stripe.markWebhookProcessing, { eventId, eventType });
    if (markResult.alreadyExists) {
      // Already being processed or completed - skip to prevent duplicates
      return { success: true };
    }

    try {
      switch (eventType) {
        case "checkout.session.completed": {
          const session = data;
          // H3 fix: Add null checks for optional Stripe data
          if (session.metadata?.convexUserId && session.metadata?.planId && session.customer && session.subscription) {
            await ctx.runMutation(internal.stripe.handleCheckoutCompleted, {
              userId: session.metadata.convexUserId,
              planId: session.metadata.planId,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
            });
          } else {
            console.warn(`[Webhook] checkout.session.completed missing required fields:`, {
              hasUserId: !!session.metadata?.convexUserId,
              hasPlanId: !!session.metadata?.planId,
              hasCustomer: !!session.customer,
              hasSubscription: !!session.subscription,
            });
          }
          break;
        }
        case "customer.subscription.updated": {
          const sub = data;
          // H3 fix: Add null checks for optional Stripe data
          if (!sub.customer || !sub.id || !sub.status || sub.current_period_start === undefined || sub.current_period_end === undefined) {
            console.warn(`[Webhook] customer.subscription.updated missing required fields`);
            break;
          }
          await ctx.runMutation(internal.stripe.handleSubscriptionUpdated, {
            stripeCustomerId: sub.customer,
            stripeSubscriptionId: sub.id,
            status: mapStripeStatus(sub.status, sub.cancel_at_period_end ?? false),
            currentPeriodStart: sub.current_period_start * 1000,
            currentPeriodEnd: sub.current_period_end * 1000,
            plan: sub.metadata?.planId,
          });
          break;
        }
        case "customer.subscription.deleted": {
          if (!data.customer) {
            console.warn(`[Webhook] customer.subscription.deleted missing customer`);
            break;
          }
          await ctx.runMutation(internal.stripe.handleSubscriptionDeleted, { stripeCustomerId: data.customer });
          break;
        }
        case "invoice.payment_failed": {
          if (!data.customer) {
            console.warn(`[Webhook] invoice.payment_failed missing customer`);
            break;
          }
          await ctx.runMutation(internal.stripe.handlePaymentFailed, { stripeCustomerId: data.customer });
          break;
        }
        case "invoice.created": {
          // H3 fix: Add null checks for optional Stripe data
          if (!data.customer || !data.id) {
            console.warn(`[Webhook] invoice.created missing customer or id`);
            break;
          }
          const isSubscriptionInvoice = data.billing_reason === "subscription_cycle" || data.billing_reason === "subscription_create";
          if (isSubscriptionInvoice && data.status === "draft") {
            const creditResult = await ctx.runMutation(internal.stripe.reservePoints, {
              stripeCustomerId: data.customer,
              stripeInvoiceId: data.id,
            });
            if (creditResult && creditResult.pointsApplied > 0) {
              const stripe = await getStripeClient();
              const creditAmountPence = Math.round(creditResult.pointsApplied / 10);
              try {
                const invoiceItem = await stripe.invoiceItems.create({
                  customer: data.customer,
                  invoice: data.id,
                  amount: -creditAmountPence,
                  currency: "gbp",
                  description: `Oja Points redemption (${creditResult.pointsApplied} pts applied)`,
                });
                await ctx.runMutation(internal.stripe.confirmPointsRedemption, {
                  reservationId: creditResult.reservationId,
                  stripeInvoiceItemId: invoiceItem.id,
                });
              } catch (stripeError: unknown) {
                console.error(`[Webhook] Stripe invoice item creation failed for ${data.id}:`, stripeError);
                await ctx.runMutation(internal.stripe.releasePoints, { reservationId: creditResult.reservationId });
                throw stripeError;
              }
            }
          }
          break;
        }
      }
      await ctx.runMutation(internal.stripe.markWebhookComplete, { eventId });
      return { success: true };
    } catch (error) {
      console.error(`[Webhook] Error processing ${eventType} (${eventId}):`, error);
      await ctx.runMutation(internal.stripe.markWebhookFailed, { eventId, error: String(error) });
      throw error;
    }
  },
});

export const checkWebhookProcessed = internalQuery({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("processedWebhooks").withIndex("by_event_id", q => q.eq("eventId", args.eventId)).first();
  },
});

export const markWebhookProcessing = internalMutation({
  args: { eventId: v.string(), eventType: v.string() },
  handler: async (ctx, args) => {
    // C1 fix: Atomic check-and-insert to prevent race condition
    // If already exists, return the existing status instead of inserting
    const existing = await ctx.db
      .query("processedWebhooks")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existing) {
      return { alreadyExists: true, status: existing.status };
    }

    await ctx.db.insert("processedWebhooks", {
      eventId: args.eventId,
      eventType: args.eventType,
      processedAt: Date.now(),
      status: "processing",
    });

    return { alreadyExists: false, status: "processing" };
  },
});

export const markWebhookComplete = internalMutation({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("processedWebhooks").withIndex("by_event_id", q => q.eq("eventId", args.eventId)).first();
    if (existing) await ctx.db.patch(existing._id, { status: "completed", processedAt: Date.now() });
  },
});

export const markWebhookFailed = internalMutation({
  args: { eventId: v.string(), error: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("processedWebhooks").withIndex("by_event_id", q => q.eq("eventId", args.eventId)).first();
    if (existing) await ctx.db.patch(existing._id, { status: "failed", error: args.error, processedAt: Date.now() });
  },
});

export const handleCheckoutCompleted = internalMutation({
  args: { userId: v.string(), planId: v.string(), stripeCustomerId: v.string(), stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const userId = args.userId as Id<"users">;
    const user = await ctx.db.get(userId);
    if (!user) throw new Error(`User not found: ${args.userId}`);

    const existing = await ctx.db.query("subscriptions").withIndex("by_user", q => q.eq("userId", userId)).order("desc").first();
    const plan = args.planId === "premium_annual" ? "premium_annual" : "premium_monthly";

    if (existing) {
      await ctx.db.patch(existing._id, {
        plan: plan as "free" | "premium_monthly" | "premium_annual",
        status: "active",
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId,
        plan: plan as "free" | "premium_monthly" | "premium_annual",
        status: "active",
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: now + 30 * 24 * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
    }

    // C2 fix: Check for existing notification to prevent duplicates on webhook retry
    const existingNotification = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "subscription_activated"),
          q.gte(q.field("createdAt"), now - 60 * 1000) // Within last minute
        )
      )
      .first();

    // Restore any pantry items that were pruned when this user's trial expired.
    const restoreResult = await ctx.runMutation(
      internal.pantry.lifecycle.restoreDowngradePrunedItems,
      { userId }
    );

    if (!existingNotification) {
      const restoreSuffix =
        restoreResult.restored > 0
          ? ` We restored ${restoreResult.restored} previously archived pantry ${restoreResult.restored === 1 ? "item" : "items"}.`
          : "";
      await ctx.db.insert("notifications", {
        userId,
        type: "subscription_activated",
        title: "Premium Activated!",
        body: `Welcome to Oja Premium. Enjoy all features!${restoreSuffix}`,
        read: false,
        createdAt: now,
      });
    }

    await trackFunnelEvent(ctx, userId, "subscribed", { plan: args.planId, stripeSubscriptionId: args.stripeSubscriptionId });
    await trackActivity(ctx, userId, "subscribed", { plan: args.planId });

    // H1 fix: Add idempotency key to prevent double-credit scenario
    if (plan === "premium_annual") {
      await ctx.runMutation(internal.points.awardBonusPoints, {
        userId,
        amount: 500,
        source: "annual_subscription_bonus",
        metadata: {
          stripeSubscriptionId: args.stripeSubscriptionId,
          idempotencyKey: `checkout_annual_${args.stripeSubscriptionId}`,
        },
      });
    }
  },
});

export const handleSubscriptionUpdated = internalMutation({
  args: { stripeCustomerId: v.string(), stripeSubscriptionId: v.string(), status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("expired"), v.literal("trial")), currentPeriodStart: v.number(), currentPeriodEnd: v.number(), plan: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const sub = await ctx.db.query("subscriptions").withIndex("by_stripe_customer", q => q.eq("stripeCustomerId", args.stripeCustomerId)).first();
    if (!sub) return;

    const previousPlan = sub.plan;
    const previousStatus = sub.status;
    const newPlan = args.plan ?? sub.plan;

    await ctx.db.patch(sub._id, {
      plan: newPlan as "free" | "premium_monthly" | "premium_annual",
      status: args.status,
      stripeSubscriptionId: args.stripeSubscriptionId,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      updatedAt: Date.now(),
    });

    // If the user just came back from expired/cancelled to active/trial, restore
    // any pantry items that were pruned at the previous downgrade.
    const wasPremium = previousStatus === "active" || previousStatus === "trial";
    const isNowPremium = args.status === "active" || args.status === "trial";
    const wasDowngraded = previousStatus === "expired" || previousStatus === "cancelled";
    const isNowDowngraded = args.status === "expired" || args.status === "cancelled";
    if (isNowPremium && wasDowngraded) {
      await ctx.runMutation(internal.pantry.lifecycle.restoreDowngradePrunedItems, {
        userId: sub.userId,
      });
    }
    // Catch downgrades that arrive via `customer.subscription.updated` (e.g.
    // cancel-at-period-end → cancelled, past_due → cancelled). Only skip prune
    // for the trial→expired path — that's the one the trial-expiry cron
    // handles. `trial → cancelled` must still prune here because `expireTrials`
    // only scans `status === "trial"` rows, so a trial user who cancels
    // mid-trial would otherwise keep all their items indefinitely.
    const cronWillHandle = previousStatus === "trial" && args.status === "expired";
    if (wasPremium && isNowDowngraded && !cronWillHandle) {
      await ctx.runMutation(internal.pantry.lifecycle.prunePantryOnDowngrade, {
        userId: sub.userId,
      });
    }

    // Award 500pt bonus when upgrading from monthly to annual
    if (previousPlan === "premium_monthly" && newPlan === "premium_annual") {
      await ctx.runMutation(internal.points.awardBonusPoints, {
        userId: sub.userId,
        amount: 500,
        source: "annual_subscription_bonus",
        metadata: {
          stripeSubscriptionId: args.stripeSubscriptionId,
          idempotencyKey: `annual_upgrade_${args.stripeSubscriptionId}`,
        },
      });
    }
  },
});

export const handleSubscriptionDeleted = internalMutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db.query("subscriptions").withIndex("by_stripe_customer", q => q.eq("stripeCustomerId", args.stripeCustomerId)).first();
    if (!sub) return;
    const wasPremium = sub.status === "active" || sub.status === "trial";
    await ctx.db.patch(sub._id, { status: "expired", updatedAt: Date.now() });

    // Mirror the trial-expiry cron's prune behaviour so users who cancel mid-
    // cycle also get their pantry trimmed to the free-tier cap. Skip if the
    // sub was already downgraded — prune is idempotent but the extra query is
    // wasteful.
    let pruneArchived = 0;
    let pruneCap = 0;
    if (wasPremium) {
      const pruneResult = await ctx.runMutation(
        internal.pantry.lifecycle.prunePantryOnDowngrade,
        { userId: sub.userId }
      );
      pruneArchived = pruneResult.archived;
      pruneCap = pruneResult.cap;
    }

    const bodySuffix =
      pruneArchived > 0
        ? ` We archived ${pruneArchived} pantry ${pruneArchived === 1 ? "item" : "items"} to fit the free plan's ${pruneCap}-item limit — resubscribe to restore them instantly.`
        : "";
    await ctx.db.insert("notifications", {
      userId: sub.userId,
      type: pruneArchived > 0 ? "subscription_expired_prune" : "subscription_expired",
      title: "Subscription Ended",
      body: `Your premium subscription has ended. Upgrade to keep all features.${bodySuffix}`,
      ...(pruneArchived > 0
        ? { data: { archived: pruneArchived, cap: pruneCap, deeplink: "/subscription" } }
        : {}),
      read: false,
      createdAt: Date.now(),
    });
    // Points remain valid under the 12-month expiry policy.
    // Cancellation stops new earning on free tier, but existing points age out naturally via cron.
  },
});

export const handlePaymentFailed = internalMutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db.query("subscriptions").withIndex("by_stripe_customer", q => q.eq("stripeCustomerId", args.stripeCustomerId)).first();
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
