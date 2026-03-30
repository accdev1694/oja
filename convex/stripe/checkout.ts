import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

async function getStripeClient() {
  const Stripe = (await import("stripe")).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-01-28.clover" as const,
  });
}

export const createCheckoutSession = action({
  args: {
    planId: v.union(v.literal("premium_monthly"), v.literal("premium_annual")),
  },
  handler: async (ctx, args): Promise<{ url: string | null; sessionId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const stripe = await getStripeClient();

    const user = await ctx.runQuery(internal.stripe.getUserByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    const subscription = await ctx.runQuery(
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

export const createPortalSession = action({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const stripe = await getStripeClient();

    const user = await ctx.runQuery(internal.stripe.getUserByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    const subscription = await ctx.runQuery(
      internal.stripe.getSubscriptionByUser,
      { userId: user._id }
    );

    if (!subscription?.stripeCustomerId) {
      throw new Error("No Stripe customer found. Please subscribe first.");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.APP_URL || "https://oja.app"}/subscription`,
    });

    return { url: session.url };
  },
});

export const cancelAllUserSubscriptions = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; count: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const stripe = await getStripeClient();

    const user = await ctx.runQuery(internal.stripe.getUserByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    const subscription = await ctx.runQuery(
      internal.stripe.getSubscriptionByUser,
      { userId: user._id }
    );

    if (!subscription?.stripeCustomerId) {
      return { success: true, count: 0 };
    }

    // List all cancellable subscriptions for this customer
    // Must include past_due and unpaid — otherwise Stripe retries the payment
    // method after account deletion, leading to unexpected charges.
    const statuses = ["active", "trialing", "past_due", "unpaid"] as const;
    const allSubs = [];
    for (const status of statuses) {
      const subs = await stripe.subscriptions.list({
        customer: subscription.stripeCustomerId,
        status,
      });
      allSubs.push(...subs.data);
    }

    for (const sub of allSubs) {
      await stripe.subscriptions.cancel(sub.id);
    }

    return { success: true, count: allSubs.length };
  },
});
