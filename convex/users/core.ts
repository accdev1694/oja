import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { trackFunnelEvent, trackActivity } from "../lib/analytics";

/**
 * Sync MFA status from the frontend (security requirement)
 */
export const syncMfaStatus = mutation({
  args: { mfaEnabled: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      mfaEnabled: args.mfaEnabled,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get the current user from the database
 * Creates a new user if one doesn't exist for this Clerk ID
 */
export const getOrCreate = mutation({
  args: { mfaEnabled: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // 1. Check if user already exists by exact Clerk ID
    let existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // 2. If not found by Clerk ID, check by email (to prevent duplicates for same person)
    if (!existingUser && identity.email) {
      existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email))
        .unique();

      // If found by email, migrate/link this new Clerk ID to the existing record
      if (existingUser) {
        console.log(`[Users] Migrating user ${existingUser._id} to new Clerk ID: ${identity.subject}`);
        await ctx.db.patch(existingUser._id, {
          clerkId: identity.subject,
          updatedAt: Date.now(),
        });
      }
    }

    if (existingUser) {
      // Track login activity
      await trackActivity(ctx, existingUser._id, "login");

      // Update MFA status if provided
      if (args.mfaEnabled !== undefined && existingUser.mfaEnabled !== args.mfaEnabled) {
        await ctx.db.patch(existingUser._id, {
          mfaEnabled: args.mfaEnabled,
          updatedAt: Date.now(),
        });
      }

      return existingUser;
    }

    // Create new user
    const now = Date.now();

    // Improved name extraction: Name -> Given Name -> Email Prefix -> "Shopper"
    const fallbackName = identity.email ? identity.email.split("@")[0] : "Shopper";
    const displayName = identity.name || identity.givenName || fallbackName;

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: displayName,
      email: identity.email,
      avatarUrl: identity.pictureUrl,
      currency: "GBP", // Default for UK
      onboardingComplete: false,
      mfaEnabled: args.mfaEnabled ?? false,
      createdAt: now,
      updatedAt: now,
    });

    // Track funnel event: signup
    await trackFunnelEvent(ctx, userId, "signup");

    // Track activity: signup
    await trackActivity(ctx, userId, "signup");

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
 * Get user by internal ID
 */
export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
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
    postcodePrefix: v.optional(v.string()),
    showTutorialHints: v.optional(v.boolean()),
    preferences: v.optional(
      v.object({
        notifications: v.boolean(),
        haptics: v.boolean(),
        theme: v.string(),
        notificationSettings: v.optional(v.object({
          stockReminders: v.boolean(),
          nurtureMessages: v.boolean(),
          partnerUpdates: v.boolean(),
          quietHours: v.optional(v.object({
            enabled: v.boolean(),
            start: v.string(),
            end: v.string(),
          }))
        }))
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
    if (args.postcodePrefix !== undefined) updates.postcodePrefix = args.postcodePrefix;
    if (args.showTutorialHints !== undefined) updates.showTutorialHints = args.showTutorialHints;
    if (args.preferences !== undefined) updates.preferences = args.preferences;

    await ctx.db.patch(user._id, updates);
    return await ctx.db.get(user._id);
  },
});

/**
 * Update specific notification settings without overwriting other preferences
 */
export const updateNotificationSettings = mutation({
  args: {
    notifications: v.optional(v.boolean()),
    stockReminders: v.optional(v.boolean()),
    nurtureMessages: v.optional(v.boolean()),
    partnerUpdates: v.optional(v.boolean()),
    quietHours: v.optional(v.object({
      enabled: v.boolean(),
      start: v.string(),
      end: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPrefs = user.preferences ?? {
      notifications: true,
      haptics: true,
      theme: "system",
    };

    const currentSettings = currentPrefs.notificationSettings ?? {
      stockReminders: true,
      nurtureMessages: true,
      partnerUpdates: true,
    };

    const newPrefs = {
      ...currentPrefs,
      notifications: args.notifications ?? currentPrefs.notifications,
      notificationSettings: {
        ...currentSettings,
        stockReminders: args.stockReminders ?? currentSettings.stockReminders,
        nurtureMessages: args.nurtureMessages ?? currentSettings.nurtureMessages,
        partnerUpdates: args.partnerUpdates ?? currentSettings.partnerUpdates,
        quietHours: args.quietHours ?? currentSettings.quietHours,
      },
    };

    await ctx.db.patch(user._id, {
      preferences: newPrefs,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
