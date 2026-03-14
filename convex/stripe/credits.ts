import { v } from "convex/values";
import { internalMutation, internalQuery, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

async function getStripeClient() {
  const Stripe = (await import("stripe")).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-01-28.clover" as const,
  });
}

export const reservePoints = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeInvoiceId: v.string(),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer", q =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    if (!sub) return null;

    const balance = await ctx.db
      .query("pointsBalance")
      .withIndex("by_user", q => q.eq("userId", sub.userId))
      .first();

    if (!balance || balance.availablePoints < 500) return null;

    const existingReservation = await ctx.db
      .query("pointsReservations")
      .withIndex("by_invoice", q => q.eq("stripeInvoiceId", args.stripeInvoiceId))
      .filter(q => q.neq(q.field("status"), "released"))
      .first();
      
    if (existingReservation) return null;

    const pointsToApply = Math.floor(balance.availablePoints / 500) * 500;
    const isAnnual = sub.plan === "premium_annual";
    const maxPoints = isAnnual ? 5000 : 1500;
    const finalPoints = Math.min(pointsToApply, maxPoints);

    if (finalPoints === 0) return null;

    const now = Date.now();
    const reservationId = await ctx.db.insert("pointsReservations", {
      userId: sub.userId,
      stripeInvoiceId: args.stripeInvoiceId,
      amount: finalPoints,
      status: "pending",
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000,
    });

    return {
      pointsApplied: finalPoints,
      reservationId,
      tier: balance.tier ?? "bronze",
    };
  },
});

export const confirmPointsRedemption = internalMutation({
  args: {
    reservationId: v.id("pointsReservations"),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation || reservation.status !== "pending") return;

    const balance = await ctx.db
      .query("pointsBalance")
      .withIndex("by_user", q => q.eq("userId", reservation.userId))
      .first();

    if (!balance) return;

    const now = Date.now();
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

    await ctx.db.patch(reservation._id, { status: "confirmed" });
  },
});

export const releasePoints = internalMutation({
  args: {
    reservationId: v.id("pointsReservations"),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation || reservation.status !== "pending") return;
    await ctx.db.patch(reservation._id, { status: "released" });
  },
});

export const reconcilePointRedemptions = internalAction({
  args: {},
  handler: async (ctx) => {
    const stripe = await getStripeClient();
    const activeSubs = await ctx.runQuery(internal.stripe.getActiveSubscriptions);
    
    let checkedCount = 0;
    let discrepanciesFound = 0;
    
    for (const sub of activeSubs) {
      if (!sub.stripeCustomerId) continue;
      const invoices = await stripe.invoices.list({ customer: sub.stripeCustomerId, limit: 100 });
      
      for (const invoice of invoices.data) {
        if (invoice.status !== "paid") continue;
        const transaction = await ctx.runQuery(internal.stripe.getRedemptionByInvoiceId, {
          userId: sub.userId,
          invoiceId: invoice.id,
        });
        const hasPointCredit = invoice.lines.data.some(line => line.description?.toLowerCase().includes("oja points redemption"));

        if (transaction && !hasPointCredit) {
          discrepanciesFound++;
          await ctx.runMutation(internal.stripe.logDiscrepancy, {
            type: "points_reconciliation",
            severity: "high",
            description: `Invoice ${invoice.id} has redemption record but no Stripe credit.`,
            metadata: { invoiceId: invoice.id, userId: sub.userId, transactionId: transaction._id },
          });
        }
        if (!transaction && hasPointCredit) {
          discrepanciesFound++;
          await ctx.runMutation(internal.stripe.logDiscrepancy, {
            type: "points_reconciliation",
            severity: "high",
            description: `Invoice ${invoice.id} has Stripe credit but no redemption record.`,
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
  args: { type: v.string(), severity: v.string(), description: v.string(), metadata: v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())) },
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
    const active = await ctx.db.query("subscriptions").withIndex("by_status", q => q.eq("status", "active")).collect();
    const trial = await ctx.db.query("subscriptions").withIndex("by_status", q => q.eq("status", "trial")).collect();
    return [...active, ...trial];
  },
});

export const getRedemptionByInvoiceId = internalQuery({
  args: { userId: v.id("users"), invoiceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("pointsTransactions").withIndex("by_user_and_type", q => q.eq("userId", args.userId).eq("type", "redeem")).filter((q) => q.eq(q.field("invoiceId"), args.invoiceId)).first();
  },
});
