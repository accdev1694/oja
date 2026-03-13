import { query } from "../_generated/server";
import { v } from "convex/values";
import { checkFeatureAccess, getTierFromScans, getNextTierInfo, getMaxEarningScans } from "../lib/featureGating";
import { getPointsBalanceReadOnly } from "./helpers";

export const getPointsBalance = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const balance = await getPointsBalanceReadOnly(ctx, user._id);
    if (!balance) return null; // Balance not yet initialized

    const { isPremium } = await checkFeatureAccess(ctx, user._id);

    const currentTier = getTierFromScans(balance.tierProgress);
    const nextTier = getNextTierInfo(balance.tierProgress);
    const maxEarningScans = getMaxEarningScans(currentTier, isPremium);

    return {
      ...balance,
      canEarnMore: balance.earningScansThisMonth < maxEarningScans,
      nextTierInfo: nextTier,
      effectiveDiscount: balance.availablePoints / 1000,
      monthlyEarningCap: currentTier.maxPoints,
      maxEarningScans,
      isPremium,
    };
  },
});

export const getPointsHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const limit = args.limit ?? 50;

    const transactions = await ctx.db
      .query("pointsTransactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return transactions;
  },
});

export const getExpiringPoints = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    // Points expire after 12 months.
    // We check for transactions that will expire in the next 30 days.
    const elevenMonthsAgo = Date.now() - (11 * 30 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = Date.now() - (12 * 30 * 24 * 60 * 60 * 1000);

    const transactions = await ctx.db
      .query("pointsTransactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.and(
        q.gte(q.field("createdAt"), twelveMonthsAgo),
        q.lte(q.field("createdAt"), elevenMonthsAgo),
        q.or(
          q.eq(q.field("type"), "earn"),
          q.eq(q.field("type"), "bonus")
        )
      ))
      .collect();

    const amount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    if (amount <= 0) return null;

    // Find the earliest expiration date in this set
    const earliestTx = transactions.sort((a, b) => a.createdAt - b.createdAt)[0];
    const expiryDate = earliestTx.createdAt + (365 * 24 * 60 * 60 * 1000);

    return {
      amount,
      expiresAt: expiryDate,
    };
  },
});
