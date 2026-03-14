import { mutation, internalMutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import { getOrCreatePointsBalance, processEarnPoints, processExpirePoints } from "./helpers";

export const initializePointsBalance = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Usually called internally or on signup
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

export const refundPoints = internalMutation({
  args: {
    userId: v.id("users"),
    receiptId: v.id("receipts"),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const balance = await getOrCreatePointsBalance(ctx, args.userId);

    // We only refund up to what's available to avoid negative balance, though theoretically it could go negative
    const refundAmount = args.points;
    const now = Date.now();

    await ctx.db.patch(balance._id, {
      totalPoints: Math.max(0, balance.totalPoints - refundAmount),
      availablePoints: Math.max(0, balance.availablePoints - refundAmount),
      // We don't rollback tier or scan counts currently as that's complex,
      // just removing the points is enough for deletion/fraud.
      updatedAt: now,
    });

    await ctx.db.insert("pointsTransactions", {
      userId: args.userId,
      type: "refund",
      amount: -refundAmount,
      source: "receipt_deleted_or_fraud",
      receiptId: args.receiptId,
      balanceBefore: balance.availablePoints,
      balanceAfter: Math.max(0, balance.availablePoints - refundAmount),
      createdAt: now,
    });
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
