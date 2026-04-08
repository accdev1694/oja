import { mutation, internalMutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { getOrCreatePointsBalance, processEarnPoints, processExpirePoints } from "./helpers";
import { getTierFromScans } from "../lib/featureGating";

/**
 * Initialize points balance - internal only to prevent arbitrary userId manipulation (C4 fix)
 */
export const initializePointsBalance = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await getOrCreatePointsBalance(ctx, args.userId);
  },
});

export const earnPointsInternal = internalMutation({
  args: {
    userId: v.id("users"),
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    return await processEarnPoints(ctx, args.userId, args.receiptId);
  },
});

// earnPoints is internal-only to prevent abuse (arbitrary userId/receiptId)
// Use earnPointsInternal via internal.points.earnPointsInternal

export const redeemPoints = mutation({
  args: {
    userId: v.id("users"),
    points: v.number(),
    invoiceId: v.string(),
    stripeInvoiceItemId: v.string(),
  },
  handler: async (ctx, args) => {
    // Only callable from Stripe webhook internal functions, but let's assume server logic for now
    const balance = await getOrCreatePointsBalance(ctx, args.userId);

    if (balance.availablePoints < args.points) {
      throw new ConvexError("Insufficient points");
    }

    if (args.points < 500) {
      throw new ConvexError("Minimum redemption is 500 points");
    }

    const now = Date.now();
    await ctx.db.patch(balance._id, {
      availablePoints: balance.availablePoints - args.points,
      pointsUsed: balance.pointsUsed + args.points,
      updatedAt: now,
    });

    await ctx.db.insert("pointsTransactions", {
      userId: args.userId,
      type: "redeem",
      amount: -args.points,
      source: "invoice_credit",
      invoiceId: args.invoiceId,
      stripeInvoiceItemId: args.stripeInvoiceItemId,
      balanceBefore: balance.availablePoints,
      balanceAfter: balance.availablePoints - args.points,
      createdAt: now,
    });

    return { success: true };
  },
});

export const awardBonusPoints = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    source: v.string(),
    metadata: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null()))),
  },
  handler: async (ctx, args) => {
    // Idempotency: if metadata includes an idempotencyKey, check for duplicates
    if (args.metadata?.idempotencyKey) {
      const existing = await ctx.db
        .query("pointsTransactions")
        .withIndex("by_user_and_type", (q) => q.eq("userId", args.userId).eq("type", "bonus"))
        .filter((q) => q.eq(q.field("source"), args.source))
        .collect();
      const dup = existing.find((tx) => tx.metadata?.idempotencyKey === args.metadata?.idempotencyKey);
      if (dup) return { success: false, reason: "already_awarded" };
    }

    const balance = await getOrCreatePointsBalance(ctx, args.userId);
    const now = Date.now();

    await ctx.db.patch(balance._id, {
      totalPoints: balance.totalPoints + args.amount,
      availablePoints: balance.availablePoints + args.amount,
      updatedAt: now,
    });

    // Phase 5.1: Check points achievements
    await ctx.runMutation(internal.insights.checkPointsAchievements, {
      userId: args.userId,
      totalPoints: balance.totalPoints + args.amount,
      currentTier: balance.tier,
    });

    await ctx.db.insert("pointsTransactions", {
      userId: args.userId,
      type: "bonus",
      amount: args.amount,
      source: args.source,
      balanceBefore: balance.availablePoints,
      balanceAfter: balance.availablePoints + args.amount,
      metadata: args.metadata,
      createdAt: now,
    });

    return { success: true, newBalance: balance.availablePoints + args.amount };
  },
});

/**
 * Refund points for fraudulent/deleted receipts (C3 fix)
 * Now properly tracks shortfall when user has insufficient balance
 */
export const refundPoints = internalMutation({
  args: {
    userId: v.id("users"),
    receiptId: v.id("receipts"),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const balance = await getOrCreatePointsBalance(ctx, args.userId);
    const now = Date.now();

    // Track actual vs requested refund to prevent silent under-refund
    const requestedAmount = args.points;
    const actualRefund = Math.min(balance.availablePoints, requestedAmount);
    const shortfall = requestedAmount - actualRefund;

    if (shortfall > 0) {
      console.warn(
        `[refundPoints] User ${args.userId} has insufficient balance. ` +
        `Requested: ${requestedAmount}, Available: ${balance.availablePoints}, Shortfall: ${shortfall}`
      );
    }

    const newTierProgress = Math.max(0, balance.tierProgress - 1);
    const newTier = getTierFromScans(newTierProgress);

    await ctx.db.patch(balance._id, {
      totalPoints: Math.max(0, balance.totalPoints - actualRefund),
      availablePoints: balance.availablePoints - actualRefund,
      tierProgress: newTierProgress,
      tier: newTier.tier,
      updatedAt: now,
    });

    await ctx.db.insert("pointsTransactions", {
      userId: args.userId,
      type: "refund",
      amount: -actualRefund, // Record actual refunded amount, not requested
      source: "receipt_deleted_or_fraud",
      receiptId: args.receiptId,
      balanceBefore: balance.availablePoints,
      balanceAfter: balance.availablePoints - actualRefund,
      metadata: shortfall > 0 ? { shortfall, requestedAmount } : undefined,
      createdAt: now,
    });

    return { actualRefund, shortfall };
  }
});

export const expirePoints = internalMutation({
  args: {
    userId: v.id("users"),
    points: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await processExpirePoints(ctx, args.userId, args.points, args.reason);
  }
});
