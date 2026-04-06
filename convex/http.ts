/**
 * Convex HTTP Endpoints
 *
 * Handles incoming HTTP requests (webhooks, etc.)
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

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
    apiVersion: "2026-01-28.clover" as const,
  });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
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
        data: JSON.stringify(event.data.object),
      });
    } catch (err: unknown) {
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
  const body = await request.text();

  // Verify Svix signature (Clerk uses Svix for webhook delivery)
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  // Verify timestamp is within tolerance (5 minutes)
  const timestampSeconds = parseInt(svixTimestamp, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (isNaN(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > 300) {
    return new Response("Timestamp outside tolerance", { status: 400 });
  }

  // Verify HMAC signature
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Clerk Webhook] CLERK_WEBHOOK_SECRET not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  // Decode the webhook secret (base64) using Web Crypto API (no Node.js required)
  const secretBase64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const secretBinary = atob(secretBase64);
  const secretBytes = new Uint8Array(secretBinary.length);
  for (let i = 0; i < secretBinary.length; i++) {
    secretBytes[i] = secretBinary.charCodeAt(i);
  }

  // Compute HMAC-SHA256 using Web Crypto API
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signedContent));
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  const signatures = svixSignature.split(" ");
  const verified = signatures.some((sig) => {
    const sigValue = sig.startsWith("v1,") ? sig.slice(3) : sig;
    return sigValue === expectedSignature;
  });

  if (!verified) {
    console.error("[Clerk Webhook] Signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  // Idempotency: skip already-processed events via processedWebhooks table
  const existing = await ctx.runQuery(internal.stripe.checkWebhookProcessed, {
    eventId: svixId,
  });
  if (existing) {
    return new Response(JSON.stringify({ received: true, deduplicated: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Process known user events
  if (payload.type === "user.deleted" || payload.type === "user.updated") {
    try {
      await ctx.runMutation(internal.stripe.markWebhookProcessing, {
        eventId: svixId,
        eventType: payload.type,
      });

      await ctx.runAction(internal.users.handleClerkWebhook, {
        type: payload.type,
        data: JSON.stringify(payload.data),
      });

      await ctx.runMutation(internal.stripe.markWebhookComplete, {
        eventId: svixId,
      });
    } catch (err) {
      console.error("[Clerk Webhook] Error:", err);
      await ctx.runMutation(internal.stripe.markWebhookFailed, {
        eventId: svixId,
        error: String(err),
      });
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
