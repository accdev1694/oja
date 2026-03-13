import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { trackFunnelEvent, trackActivity } from "../lib/analytics";
import { processExpirePoints } from "../points";

async function getStripeClient() {
  const Stripe = (await import("stripe")).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-04-30.basil" as const,
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
  args: { eventId: v.string(), eventType: v.string(), data: v.any() },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const { eventId, eventType, data } = args;

    const existing = await ctx.runQuery(internal.stripe.checkWebhookProcessed, { eventId });
    if (existing) {
      if (existing.status === "completed") return { success: true };
      if (existing.status === "processing") return { success: true };
    }

    await ctx.runMutation(internal.stripe.markWebhookProcessing, { eventId, eventType });

    try {
      switch (eventType) {
        case "checkout.session.completed": {
          const session = data;
          if (session.metadata?.convexUserId && session.metadata?.planId) {
            await ctx.runMutation(internal.stripe.handleCheckoutCompleted, {
              userId: session.metadata.convexUserId,
              planId: session.metadata.planId,
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
          await ctx.runMutation(internal.stripe.handleSubscriptionDeleted, { stripeCustomerId: data.customer });
          break;
        }
        case "invoice.payment_failed": {
          await ctx.runMutation(internal.stripe.handlePaymentFailed, { stripeCustomerId: data.customer });
          break;
        }
        case "invoice.created": {
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
                await stripe.invoiceItems.create({
                  customer: data.customer,
                  invoice: data.id,
                  amount: -creditAmountPence,
                  currency: "gbp",
                  description: `Oja Points redemption (${creditResult.pointsApplied} pts applied)`,
                });
                await ctx.runMutation(internal.stripe.confirmPointsRedemption, { reservationId: creditResult.reservationId });
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

    await ctx.db.insert("notifications", {
      userId,
      type: "subscription_activated",
      title: "Premium Activated!",
      body: "Welcome to Oja Premium. Enjoy all features!",
      read: false,
      createdAt: now,
    });

    await trackFunnelEvent(ctx, userId, "subscribed", { plan: args.planId, stripeSubscriptionId: args.stripeSubscriptionId });
    await trackActivity(ctx, userId, "subscribed", { plan: args.planId });

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
  args: { stripeCustomerId: v.string(), stripeSubscriptionId: v.string(), status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("expired"), v.literal("trial")), currentPeriodStart: v.number(), currentPeriodEnd: v.number() },
  handler: async (ctx, args) => {
    const sub = await ctx.db.query("subscriptions").withIndex("by_stripe_customer", q => q.eq("stripeCustomerId", args.stripeCustomerId)).first();
    if (!sub) return;
    await ctx.db.patch(sub._id, {
      status: args.status,
      stripeSubscriptionId: args.stripeSubscriptionId,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      updatedAt: Date.now(),
    });
  },
});

export const handleSubscriptionDeleted = internalMutation({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db.query("subscriptions").withIndex("by_stripe_customer", q => q.eq("stripeCustomerId", args.stripeCustomerId)).first();
    if (!sub) return;
    await ctx.db.patch(sub._id, { status: "expired", updatedAt: Date.now() });
    await ctx.db.insert("notifications", {
      userId: sub.userId,
      type: "subscription_expired",
      title: "Subscription Ended",
      body: "Your premium subscription has ended. Upgrade to keep all features.",
      read: false,
      createdAt: Date.now(),
    });
    const balance = await ctx.db.query("pointsBalance").withIndex("by_user", q => q.eq("userId", sub.userId)).first();
    if (balance && balance.availablePoints > 0) {
      await processExpirePoints(ctx, sub.userId, balance.availablePoints, "subscription_cancelled");
    }
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
