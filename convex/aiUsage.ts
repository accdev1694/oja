import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { AI_LIMITS, getAILimit } from "./lib/featureGating";

// Notification thresholds (percentage)
const USAGE_THRESHOLDS = [50, 80, 100] as const;

/**
 * Get current billing period (monthly, aligned to subscription)
 */
function getCurrentPeriod(): { start: number; end: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  return { start, end };
}

/**
 * Get or create usage record for current period
 */
export const getOrCreateUsage = mutation({
  args: {
    feature: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const { start, end } = getCurrentPeriod();

    // Check existing usage for this period
    const existing = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_feature_period", (q) =>
        q.eq("userId", user._id).eq("feature", args.feature).eq("periodEnd", end)
      )
      .unique();

    if (existing) return existing;

    // Get user's plan for limit
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const plan = subscription?.plan ?? "free";
    const limit = getAILimit(plan, args.feature as keyof typeof AI_LIMITS);

    // Create new usage record (-1 means unlimited, stored as 999999)
    const usageId = await ctx.db.insert("aiUsage", {
      userId: user._id,
      feature: args.feature,
      periodStart: start,
      periodEnd: end,
      requestCount: 0,
      limit: limit === -1 ? 999999 : limit,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(usageId);
  },
});

/**
 * Increment usage and check limits
 * Returns: { allowed: boolean, usage: number, limit: number, percentage: number }
 */
export const incrementUsage = mutation({
  args: {
    feature: v.string(),
    tokenCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const { end } = getCurrentPeriod();

    // Get or create usage record
    let usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_feature_period", (q) =>
        q.eq("userId", user._id).eq("feature", args.feature).eq("periodEnd", end)
      )
      .unique();

    if (!usage) {
      // Get user's plan for limit
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();

      const plan = subscription?.plan ?? "free";
      const limit = getAILimit(plan, args.feature as keyof typeof AI_LIMITS);

      const { start } = getCurrentPeriod();
      const usageId = await ctx.db.insert("aiUsage", {
        userId: user._id,
        feature: args.feature,
        periodStart: start,
        periodEnd: end,
        requestCount: 0,
        limit: limit === -1 ? 999999 : limit,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      usage = await ctx.db.get(usageId);
    }

    if (!usage) throw new Error("Failed to create usage record");

    // Check if at limit
    if (usage.requestCount >= usage.limit) {
      return {
        allowed: false,
        usage: usage.requestCount,
        limit: usage.limit,
        percentage: 100,
        message: `You've reached your monthly ${args.feature} limit. Upgrade for more.`,
      };
    }

    // Increment usage
    const newCount = usage.requestCount + 1;
    const percentage = Math.round((newCount / usage.limit) * 100);

    await ctx.db.patch(usage._id, {
      requestCount: newCount,
      tokenCount: (usage.tokenCount ?? 0) + (args.tokenCount ?? 0),
      updatedAt: Date.now(),
    });

    // Check if we should send notification
    const shouldNotify = user.aiSettings?.usageAlerts !== false;
    if (shouldNotify) {
      for (const threshold of USAGE_THRESHOLDS) {
        if (percentage >= threshold && (usage.lastNotifiedThreshold ?? 0) < threshold) {
          // Schedule notification
          await ctx.scheduler.runAfter(0, internal.aiUsage.sendUsageNotification, {
            userId: user._id,
            feature: args.feature,
            percentage,
            usage: newCount,
            limit: usage.limit,
          });

          await ctx.db.patch(usage._id, {
            lastNotifiedAt: Date.now(),
            lastNotifiedThreshold: threshold,
          });
          break;
        }
      }
    }

    return {
      allowed: true,
      usage: newCount,
      limit: usage.limit,
      percentage,
    };
  },
});

/**
 * Check if user can use a feature (without incrementing)
 */
export const canUseFeature = query({
  args: {
    feature: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { allowed: false, reason: "Not authenticated" };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return { allowed: false, reason: "User not found" };

    // Check if feature is disabled by user
    if (args.feature === "voice" && user.aiSettings?.voiceEnabled === false) {
      return { allowed: false, reason: "Voice assistant is disabled in settings" };
    }

    const { end } = getCurrentPeriod();

    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_feature_period", (q) =>
        q.eq("userId", user._id).eq("feature", args.feature).eq("periodEnd", end)
      )
      .unique();

    if (!usage) {
      // No usage yet this period = allowed
      return { allowed: true, usage: 0, limit: 200, percentage: 0 };
    }

    const percentage = Math.round((usage.requestCount / usage.limit) * 100);

    if (usage.requestCount >= usage.limit) {
      return {
        allowed: false,
        usage: usage.requestCount,
        limit: usage.limit,
        percentage: 100,
        reason: `Monthly ${args.feature} limit reached`,
      };
    }

    return {
      allowed: true,
      usage: usage.requestCount,
      limit: usage.limit,
      percentage,
    };
  },
});

/**
 * Get current month's usage summary for a user
 */
export const getUsageSummary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const { end } = getCurrentPeriod();

    const usageRecords = await ctx.db
      .query("aiUsage")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("periodEnd"), end))
      .collect();

    const summary: Record<string, { usage: number; limit: number; percentage: number }> = {};

    for (const record of usageRecords) {
      summary[record.feature] = {
        usage: record.requestCount,
        limit: record.limit,
        percentage: Math.round((record.requestCount / record.limit) * 100),
      };
    }

    // Get scan credits too (receipts earn discount)
    const scanCredits = await ctx.db
      .query("scanCredits")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    return {
      voice: summary.voice ?? { usage: 0, limit: 200, percentage: 0 },
      receipts: {
        scansThisPeriod: scanCredits?.scansThisPeriod ?? 0,
        creditsEarned: scanCredits?.creditsEarned ?? 0,
        lifetimeScans: scanCredits?.lifetimeScans ?? 0,
      },
      aiSettings: user.aiSettings ?? { voiceEnabled: true, usageAlerts: true },
    };
  },
});

/**
 * Update user's AI settings
 */
export const updateAiSettings = mutation({
  args: {
    voiceEnabled: v.optional(v.boolean()),
    usageAlerts: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const currentSettings = user.aiSettings ?? { voiceEnabled: true, usageAlerts: true };

    await ctx.db.patch(user._id, {
      aiSettings: {
        voiceEnabled: args.voiceEnabled ?? currentSettings.voiceEnabled,
        usageAlerts: args.usageAlerts ?? currentSettings.usageAlerts,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Internal: Send usage notification (in-app + push)
 */
export const sendUsageNotification = internalMutation({
  args: {
    userId: v.id("users"),
    feature: v.string(),
    percentage: v.number(),
    usage: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, feature, percentage, usage, limit } = args;

    let title: string;
    let body: string;

    if (percentage >= 100) {
      title = `${feature === "voice" ? "Voice" : "AI"} limit reached`;
      body = `You've used all ${limit} ${feature} requests this month. Upgrade for more!`;
    } else if (percentage >= 80) {
      title = `${percentage}% of ${feature} used`;
      body = `${limit - usage} ${feature} requests left this month. You're doing great!`;
    } else {
      title = `Halfway through ${feature} allowance`;
      body = `${usage} of ${limit} ${feature} requests used. ${limit - usage} remaining.`;
    }

    // Create in-app notification
    await ctx.db.insert("notifications", {
      userId,
      type: "ai_usage",
      title,
      body,
      data: { feature, percentage, usage, limit },
      read: false,
      createdAt: Date.now(),
    });

    // Send push notification
    await ctx.scheduler.runAfter(0, internal.notifications.sendPush, {
      userId,
      title,
      body,
      data: { type: "ai_usage", feature, percentage, screen: "ai-usage" },
    });
  },
});

/**
 * Get limit for a feature based on user's plan
 */
export const getFeatureLimit = query({
  args: {
    feature: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { limit: 0 };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return { limit: 0 };

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const plan = subscription?.plan ?? "free";
    const limit = getAILimit(plan, args.feature as keyof typeof AI_LIMITS);

    return { limit: limit === Infinity ? 999999 : limit, plan };
  },
});
