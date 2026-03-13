import { v } from "convex/values";
import { query } from "../_generated/server";
import {
  getDaysSinceSignup,
  getDaysUntilTrialEnd,
  getDaysInactive,
  formatTrialMessage,
} from "./config";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get nurture status for current user (for debugging/admin)
 */
export const getNurtureStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const sentMessages = await ctx.db
      .query("nurtureMessages")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    return {
      daysSinceSignup: getDaysSinceSignup(user.createdAt),
      daysUntilTrialEnd: getDaysUntilTrialEnd(subscription?.trialEndsAt),
      daysInactive: getDaysInactive(user.lastActiveAt),
      sentMessages: sentMessages.map((m) => m.messageKey),
      onboardingComplete: user.onboardingComplete,
      lastActiveAt: user.lastActiveAt,
      sessionCount: user.sessionCount ?? 0,
    };
  },
});

/**
 * Check if a specific nurture message has been sent
 */
export const hasReceivedNurture = query({
  args: { messageKey: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return false;

    const existing = await ctx.db
      .query("nurtureMessages")
      .withIndex("by_user_message", (q) =>
        q.eq("userId", user._id).eq("messageKey", args.messageKey)
      )
      .unique();

    return existing !== null;
  },
});

/**
 * Get trial info with dynamic days remaining
 */
export const getTrialInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!subscription) return null;

    const daysLeft = getDaysUntilTrialEnd(subscription.trialEndsAt);
    const isTrialActive = subscription.status === "trial" && (daysLeft === null || daysLeft > 0);

    return {
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      daysLeft,
      isTrialActive,
      message: formatTrialMessage(subscription.trialEndsAt),
    };
  },
});
