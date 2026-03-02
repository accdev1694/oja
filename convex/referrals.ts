import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Generate a unique referral code for a user
 */
export const generateReferralCode = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Check if code already exists
    const existing = await ctx.db
      .query("referralCodes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) return existing.code;

    // Generate unique 8-char code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    await ctx.db.insert("referralCodes", {
      userId: args.userId,
      code,
      referredUsers: [],
      pointsEarned: 0,
      createdAt: Date.now(),
    });

    return code;
  },
});

/**
 * Apply a referral code during signup/onboarding
 */
export const applyReferralCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const referral = await ctx.db
      .query("referralCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!referral) throw new ConvexError("Invalid referral code");
    if (referral.userId === user._id) throw new ConvexError("You cannot refer yourself");

    // Check if user was already referred
    const alreadyReferred = await ctx.db
      .query("pointsTransactions")
      .withIndex("by_user_and_type", (q) => q.eq("userId", user._id).eq("type", "bonus"))
      .filter((q) => q.eq(q.field("source"), "referral_welcome"))
      .first();

    if (alreadyReferred) throw new ConvexError("Referral code already applied");

    // Award 500 points to the new user immediately as a welcome bonus
    await ctx.runMutation(internal.points.awardBonusPoints, {
      userId: user._id,
      amount: 500,
      source: "referral_welcome",
      metadata: { referredBy: referral.userId }
    });

    // Award 500 points to the referrer
    await ctx.runMutation(internal.points.awardBonusPoints, {
      userId: referral.userId,
      amount: 500,
      source: "referral_reward",
      metadata: { referredUser: user._id }
    });

    // Update referral record
    const referredUsers = [...referral.referredUsers, user._id];
    await ctx.db.patch(referral._id, {
      referredUsers,
      pointsEarned: referral.pointsEarned + 500,
    });

    return { success: true, pointsEarned: 500 };
  },
});

/**
 * Get user's referral info
 */
export const getMyReferralInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const referral = await ctx.db
      .query("referralCodes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return referral;
  },
});
