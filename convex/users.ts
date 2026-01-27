import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get the current user from the database
 * Creates a new user if one doesn't exist for this Clerk ID
 */
export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "User",
      email: identity.email,
      avatarUrl: identity.pictureUrl,
      currency: "GBP", // Default for UK
      onboardingComplete: false,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(userId);
  },
});

/**
 * Get current user (read-only, doesn't create)
 */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

/**
 * Get user by Clerk ID
 */
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

/**
 * Update user profile
 */
export const update = mutation({
  args: {
    name: v.optional(v.string()),
    defaultBudget: v.optional(v.number()),
    currency: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        notifications: v.boolean(),
        haptics: v.boolean(),
        theme: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.defaultBudget !== undefined) updates.defaultBudget = args.defaultBudget;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.preferences !== undefined) updates.preferences = args.preferences;

    await ctx.db.patch(user._id, updates);
    return await ctx.db.get(user._id);
  },
});

/**
 * Set onboarding data (name, country, cuisinePreferences)
 */
export const setOnboardingData = mutation({
  args: {
    name: v.string(),
    country: v.string(),
    cuisinePreferences: v.array(v.string()),
    defaultBudget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      name: args.name,
      country: args.country,
      cuisinePreferences: args.cuisinePreferences,
      defaultBudget: args.defaultBudget,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(user._id);
  },
});

/**
 * Mark onboarding as complete
 */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      onboardingComplete: true,
      updatedAt: Date.now(),
    });

    return true;
  },
});
