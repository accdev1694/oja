/**
 * Convex HTTP Endpoints
 *
 * Handles incoming HTTP requests (webhooks, etc.)
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// =============================================================================
// STRIPE WEBHOOK
// =============================================================================

const stripeHandler = httpAction(async (ctx, request) => {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // Verify webhook signature
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-04-30.basil" as any,
  });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Process relevant events
  const relevantEvents = [
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_failed",
    "invoice.created",
  ];

  if (relevantEvents.includes(event.type)) {
    try {
      await ctx.runAction(api.stripe.processWebhookEvent, {
        eventId: event.id,
        eventType: event.type,
        data: event.data.object,
      });
    } catch (err: any) {
      console.error("Error processing webhook:", err);
      return new Response("Webhook processing error", { status: 500 });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

// =============================================================================
// CLERK WEBHOOK
// =============================================================================

const clerkHandler = httpAction(async (ctx, request) => {
  const payload = await request.json();
  
  // Process known user events
  if (payload.type === "user.deleted" || payload.type === "user.updated") {
    try {
      await ctx.runAction(api.users.handleClerkWebhook, {
        type: payload.type,
        data: payload.data,
      });
    } catch (err) {
      console.error("[Clerk Webhook] Error:", err);
      return new Response("Webhook processing error", { status: 500 });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

// =============================================================================
// ROUTING
// =============================================================================

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: stripeHandler,
});

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: clerkHandler,
});

export default http;
