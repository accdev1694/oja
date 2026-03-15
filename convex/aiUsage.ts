import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { AI_LIMITS, getAILimit } from "./lib/featureGating";
import { checkRateLimit as performRateLimitCheck } from "./lib/rateLimit";
import { PROVIDER_LIMITS } from "./lib/aiTracking";

// Notification thresholds (percentage)
const USAGE_THRESHOLDS = [50, 80, 100] as const;

/**
 * Check if a user has exceeded their rate limit for a specific feature.
 * Features: "voice", "receipt_scan", "ai_estimation"
 */
export const checkRateLimit = mutation({
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

    // Default limits per minute
    const limits: Record<string, number> = {
      voice: 15,
      receipt_scan: 5,
      ai_estimation: 30,
      list_items: 100,
      pantry_items: 50,
      shopping_lists: 20,
    };

    const limit = limits[args.feature] || 10;
    return await performRateLimitCheck(ctx, user._id, args.feature, limit);
  },
});

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

    // Maintain daily delta fields alongside monthly cumulative
    const todayStr = new Date().toISOString().split("T")[0];
    const isNewDay = usage.dailyDate !== todayStr;

    await ctx.db.patch(usage._id, {
      requestCount: newCount,
      tokenCount: (usage.tokenCount ?? 0) + (args.tokenCount ?? 0),
      dailyDate: todayStr,
      dailyRequestCount: isNewDay ? 1 : (usage.dailyRequestCount ?? 0) + 1,
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
 * Correct token count for a usage record without incrementing requestCount.
 * Used after Gemini returns actual token usage metadata.
 */
export const correctTokenCount = mutation({
  args: {
    feature: v.string(),
    tokenDelta: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;

    const { end } = getCurrentPeriod();

    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_feature_period", (q) =>
        q.eq("userId", user._id).eq("feature", args.feature).eq("periodEnd", end)
      )
      .unique();

    if (!usage) return;

    await ctx.db.patch(usage._id, {
      tokenCount: (usage.tokenCount ?? 0) + args.tokenDelta,
      updatedAt: Date.now(),
    });
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
      // No usage yet this period — look up actual plan limit
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      const plan = subscription?.plan ?? "free";
      const featureKey = args.feature as keyof typeof AI_LIMITS;
      const actualLimit = AI_LIMITS[featureKey]
        ? getAILimit(plan, featureKey)
        : 999999;
      const displayLimit = actualLimit === -1 ? 999999 : actualLimit;
      return { allowed: true, usage: 0, limit: displayLimit, percentage: 0 };
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

    // Look up actual plan limit for voice if no usage record exists yet
    let voiceFallback = { usage: 0, limit: 10, percentage: 0 };
    if (!summary.voice) {
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      const plan = subscription?.plan ?? "free";
      const voiceLimit = getAILimit(plan, "voice");
      voiceFallback = { usage: 0, limit: voiceLimit === -1 ? 999999 : voiceLimit, percentage: 0 };
    }

    return {
      voice: summary.voice ?? voiceFallback,
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
 * Track an AI call with full provider metrics.
 * Called by AI actions after each successful API call.
 * Increments requestCount and adds actual token/cost data.
 */
export const trackAICall = mutation({
  args: {
    feature: v.string(),
    provider: v.string(), // "gemini" | "openai" | "azure_tts"
    inputTokens: v.number(),
    outputTokens: v.number(),
    estimatedCostUsd: v.number(),
    isVision: v.boolean(),
    isFallback: v.boolean(),
    ttsCharacters: v.optional(v.number()),
    checkLimit: v.optional(v.boolean()), // When true, check limit before tracking and return allowed status
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return args.checkLimit ? { allowed: false, message: "Not authenticated" } : undefined;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return args.checkLimit ? { allowed: false, message: "User not found" } : undefined;

    const { start, end } = getCurrentPeriod();

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
      const featureKey = args.feature as keyof typeof AI_LIMITS;
      const limit = AI_LIMITS[featureKey] ? getAILimit(plan, featureKey) : 999999;

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

    if (!usage) return args.checkLimit ? { allowed: false, message: "Failed to create usage record" } : undefined;

    // Check limit before tracking if requested
    if (args.checkLimit && usage.requestCount >= usage.limit) {
      return {
        allowed: false,
        usage: usage.requestCount,
        limit: usage.limit,
        percentage: 100,
        message: `You've reached your monthly ${args.feature} limit. Upgrade for more.`,
      };
    }

    // Maintain daily delta fields for accurate daily aggregation & RPD meter
    const todayStr = new Date().toISOString().split("T")[0];
    const isNewDay = usage.dailyDate !== todayStr;

    await ctx.db.patch(usage._id, {
      // Monthly cumulative fields (unchanged behavior)
      requestCount: usage.requestCount + 1,
      tokenCount: (usage.tokenCount ?? 0) + args.inputTokens + args.outputTokens,
      inputTokens: (usage.inputTokens ?? 0) + args.inputTokens,
      outputTokens: (usage.outputTokens ?? 0) + args.outputTokens,
      estimatedCostUsd: (usage.estimatedCostUsd ?? 0) + args.estimatedCostUsd,
      visionRequests: (usage.visionRequests ?? 0) + (args.isVision ? 1 : 0),
      fallbackRequests: (usage.fallbackRequests ?? 0) + (args.isFallback ? 1 : 0),
      // Daily delta fields — reset on new day, increment on same day
      dailyDate: todayStr,
      dailyRequestCount: isNewDay ? 1 : (usage.dailyRequestCount ?? 0) + 1,
      dailyInputTokens: isNewDay ? args.inputTokens : (usage.dailyInputTokens ?? 0) + args.inputTokens,
      dailyOutputTokens: isNewDay ? args.outputTokens : (usage.dailyOutputTokens ?? 0) + args.outputTokens,
      dailyCostUsd: isNewDay ? args.estimatedCostUsd : (usage.dailyCostUsd ?? 0) + args.estimatedCostUsd,
      dailyVisionRequests: isNewDay ? (args.isVision ? 1 : 0) : (usage.dailyVisionRequests ?? 0) + (args.isVision ? 1 : 0),
      dailyFallbackRequests: isNewDay ? (args.isFallback ? 1 : 0) : (usage.dailyFallbackRequests ?? 0) + (args.isFallback ? 1 : 0),
      dailyTtsCharacters: isNewDay ? (args.ttsCharacters ?? 0) : (usage.dailyTtsCharacters ?? 0) + (args.ttsCharacters ?? 0),
      updatedAt: Date.now(),
    });

    // Return limit status when checkLimit is requested
    if (args.checkLimit) {
      const newCount = usage.requestCount + 1;
      const percentage = Math.round((newCount / usage.limit) * 100);
      return { allowed: true, usage: newCount, limit: usage.limit, percentage };
    }
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

/**
 * Track TTS (text-to-speech) usage via internal mutation.
 * TTS runs as an unauthenticated action, so caller must pass userId.
 */
export const trackTTSUsage = internalMutation({
  args: {
    userId: v.id("users"),
    characterCount: v.number(),
    estimatedCostUsd: v.number(),
  },
  handler: async (ctx, args) => {
    const { start, end } = getCurrentPeriod();

    let usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_feature_period", (q) =>
        q.eq("userId", args.userId).eq("feature", "tts").eq("periodEnd", end)
      )
      .unique();

    if (!usage) {
      const usageId = await ctx.db.insert("aiUsage", {
        userId: args.userId,
        feature: "tts",
        periodStart: start,
        periodEnd: end,
        requestCount: 0,
        limit: 999999, // TTS is unlimited but tracked
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      usage = await ctx.db.get(usageId);
    }

    if (!usage) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const isNewDay = usage.dailyDate !== todayStr;

    await ctx.db.patch(usage._id, {
      requestCount: usage.requestCount + 1,
      estimatedCostUsd: (usage.estimatedCostUsd ?? 0) + args.estimatedCostUsd,
      ttsCharacters: (usage.ttsCharacters ?? 0) + args.characterCount,
      dailyDate: todayStr,
      dailyRequestCount: isNewDay ? 1 : (usage.dailyRequestCount ?? 0) + 1,
      dailyCostUsd: isNewDay ? args.estimatedCostUsd : (usage.dailyCostUsd ?? 0) + args.estimatedCostUsd,
      dailyTtsCharacters: isNewDay ? args.characterCount : (usage.dailyTtsCharacters ?? 0) + args.characterCount,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get today's total Gemini request count across ALL users and features.
 * Used by AI actions to enforce the 1,500 RPD free tier hard cap.
 */
export const getGeminiRPDToday = internalQuery({
  args: {},
  handler: async (ctx) => {
    const todayStr = new Date().toISOString().split("T")[0];
    // Sum dailyRequestCount across all aiUsage records where dailyDate === today
    // and the provider was gemini (we only track gemini calls toward RPD)
    const allUsage = await ctx.db
      .query("aiUsage")
      .withIndex("by_period")
      .collect();

    let totalToday = 0;
    for (const record of allUsage) {
      if (record.dailyDate === todayStr) {
        totalToday += record.dailyRequestCount ?? 0;
      }
    }
    return {
      requestsToday: totalToday,
      limit: PROVIDER_LIMITS.gemini.requestsPerDay,
      remaining: Math.max(0, PROVIDER_LIMITS.gemini.requestsPerDay - totalToday),
      blocked: totalToday >= PROVIDER_LIMITS.gemini.requestsPerDay,
    };
  },
});

/**
 * Get this month's total Azure TTS characters across ALL users.
 * Used by textToSpeech action to enforce 480K hard cap (leaving 20K buffer from 500K free tier).
 */
export const getTTSCharactersThisMonth = internalQuery({
  args: {},
  handler: async (ctx) => {
    const { end } = getCurrentPeriod();
    const ttsRecords = await ctx.db
      .query("aiUsage")
      .withIndex("by_period")
      .filter((q) => q.eq(q.field("feature"), "tts"))
      .collect();

    let totalChars = 0;
    for (const record of ttsRecords) {
      if (record.periodEnd === end) {
        totalChars += record.ttsCharacters ?? 0;
      }
    }

    const hardCap = PROVIDER_LIMITS.azure_tts.freeCharsPerMonth - 20_000; // 480K buffer
    return {
      charactersUsed: totalChars,
      hardCap,
      freeLimit: PROVIDER_LIMITS.azure_tts.freeCharsPerMonth,
      remaining: Math.max(0, hardCap - totalChars),
      blocked: totalChars >= hardCap,
    };
  },
});

/**
 * Track a failed AI call. Increments errorCount on the feature's usage record.
 * Called from catch blocks in AI actions to monitor error rates.
 */
export const trackAICallError = mutation({
  args: {
    feature: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;

    const { end } = getCurrentPeriod();

    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_feature_period", (q) =>
        q.eq("userId", user._id).eq("feature", args.feature).eq("periodEnd", end)
      )
      .unique();

    if (usage) {
      await ctx.db.patch(usage._id, {
        errorCount: (usage.errorCount ?? 0) + 1,
        updatedAt: Date.now(),
      });
    }
  },
});
