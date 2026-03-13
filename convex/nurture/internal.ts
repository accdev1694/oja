import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import {
  NURTURE_SEQUENCE,
  getDaysSinceSignup,
  getDaysUntilTrialEnd,
  getDaysInactive,
} from "./config";

// =============================================================================
// INTERNAL: Cron job to process nurture sequence
// =============================================================================

/**
 * Internal query: Get users eligible for nurture messages
 */
export const getUsersForNurture = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get users who signed up in the last 7 days OR have active trials
    const recentUsers = await ctx.db
      .query("users")
      .withIndex("by_created")
      .filter((q) => q.gte(q.field("createdAt"), sevenDaysAgo))
      .collect();

    // Also get users with expiring trials
    const subscriptions = await ctx.db.query("subscriptions").collect();
    const trialUserIds = subscriptions
      .filter((s) => s.status === "trial" && s.trialEndsAt && s.trialEndsAt > now - 24 * 60 * 60 * 1000)
      .map((s) => s.userId);

    // Merge and dedupe
    const allUserIds = new Set([
      ...recentUsers.map((u) => u._id),
      ...trialUserIds,
    ]);

    const users: {
      userId: Id<"users">;
      createdAt: number;
      onboardingComplete: boolean;
      lastActiveAt: number | undefined;
      expoPushToken: string | undefined;
      trialEndsAt: number | undefined;
      trialStatus: string | undefined;
    }[] = [];

    for (const userId of allUserIds) {
      const user = await ctx.db.get(userId);
      if (!user || !user.expoPushToken) continue; // Skip users without push tokens

      // Enforce notification preferences
      if (user.preferences?.notifications === false) continue;
      if (user.preferences?.notificationSettings?.nurtureMessages === false) continue;

      const sub = subscriptions.find((s) => s.userId === userId);

      users.push({
        userId: user._id,
        createdAt: user.createdAt,
        onboardingComplete: user.onboardingComplete,
        lastActiveAt: user.lastActiveAt,
        expoPushToken: user.expoPushToken,
        trialEndsAt: sub?.trialEndsAt,
        trialStatus: sub?.status,
      });
    }

    return users;
  },
});

/**
 * Internal query: Get user's activity stats for condition checking
 */
export const getUserActivityStats = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const partners = await ctx.db
      .query("listPartners")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Check voice usage from aiUsage table
    const voiceUsage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_feature", (q) => q.eq("userId", args.userId).eq("feature", "voice"))
      .first();

    const sentNurtures = await ctx.db
      .query("nurtureMessages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      listCount: lists.length,
      receiptCount: receipts.length,
      partnerCount: partners.length,
      voiceUsageCount: voiceUsage?.requestCount ?? 0,
      sentNurtureKeys: sentNurtures.map((n) => n.messageKey),
    };
  },
});

/**
 * Internal mutation: Send nurture message to a user
 */
export const sendNurtureMessage = internalMutation({
  args: {
    userId: v.id("users"),
    messageKey: v.string(),
    title: v.string(),
    body: v.string(),
    screen: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, messageKey, title, body, screen } = args;

    // Check if already sent
    const existing = await ctx.db
      .query("nurtureMessages")
      .withIndex("by_user_message", (q) =>
        q.eq("userId", userId).eq("messageKey", messageKey)
      )
      .unique();

    if (existing) return { sent: false, reason: "already_sent" };

    // Create in-app notification
    await ctx.db.insert("notifications", {
      userId,
      type: "nurture",
      title,
      body,
      data: { messageKey, screen },
      read: false,
      createdAt: Date.now(),
    });

    // Send push notification
    await ctx.scheduler.runAfter(0, internal.notifications.sendPush, {
      userId,
      title,
      body,
      data: { type: "nurture", messageKey, screen },
    });

    // Record that we sent it
    await ctx.db.insert("nurtureMessages", {
      userId,
      messageKey,
      sentAt: Date.now(),
      channel: "both",
    });

    return { sent: true };
  },
});

/**
 * Internal mutation: Process nurture sequence for all eligible users
 * Called by cron job daily
 */
export const processNurtureSequence = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ processed: number; sent: number }> => {
    const users = await ctx.runQuery(internal.nurture.getUsersForNurture, {}) as {
      userId: Id<"users">;
      createdAt: number;
      onboardingComplete: boolean;
      lastActiveAt: number | undefined;
      expoPushToken: string | undefined;
      trialEndsAt: number | undefined;
      trialStatus: string | undefined;
    }[];

    let sentCount = 0;

    for (const user of users) {
      const daysSinceSignup = getDaysSinceSignup(user.createdAt);
      const daysUntilTrial = getDaysUntilTrialEnd(user.trialEndsAt);
      const daysInactive = getDaysInactive(user.lastActiveAt);

      const stats = await ctx.runQuery(internal.nurture.getUserActivityStats, {
        userId: user.userId,
      }) as {
        listCount: number;
        receiptCount: number;
        partnerCount: number;
        voiceUsageCount: number;
        sentNurtureKeys: string[];
      };

      // Find the first applicable nurture message that hasn't been sent
      for (const [key, config] of Object.entries(NURTURE_SEQUENCE)) {
        if (stats.sentNurtureKeys.includes(key)) continue;

        let shouldSend = false;

        // Check day-based triggers
        if (config.daysSinceSignup >= 0 && daysSinceSignup === config.daysSinceSignup) {
          shouldSend = true;
        }

        // Check trial-ending triggers
        if ("daysUntilTrialEnd" in config && daysUntilTrial !== null) {
          if (config.daysUntilTrialEnd === daysUntilTrial) {
            shouldSend = true;
          }
        }

        // Check inactivity triggers
        if ("daysInactive" in config && daysInactive >= (config as any).daysInactive) {
          shouldSend = true;
        }

        if (!shouldSend) continue;

        // Check conditions
        let conditionMet = true;
        switch (config.condition) {
          case "onboarding_complete":
            conditionMet = user.onboardingComplete;
            break;
          case "no_lists":
            conditionMet = stats.listCount === 0;
            break;
          case "no_receipts":
            conditionMet = stats.receiptCount === 0;
            break;
          case "no_voice_usage":
            conditionMet = stats.voiceUsageCount === 0;
            break;
          case "no_partners":
            conditionMet = stats.partnerCount === 0;
            break;
          case "has_activity":
            conditionMet = stats.listCount > 0 || stats.receiptCount > 0;
            break;
          case "trial_active":
            conditionMet = user.trialStatus === "trial" && (daysUntilTrial === null || daysUntilTrial > 0);
            break;
          case "trial_expired":
            conditionMet = daysUntilTrial !== null && daysUntilTrial <= 0;
            break;
          case "inactive":
            conditionMet = true;
            break;
        }

        if (!conditionMet) continue;

        // Send the message
        await ctx.runMutation(internal.nurture.sendNurtureMessage, {
          userId: user.userId,
          messageKey: key,
          title: config.title,
          body: config.body,
          screen: config.screen,
        });

        sentCount++;
        break; // Only send one nurture per user per day
      }
    }

    console.log(`[Nurture] Processed ${users.length} users, sent ${sentCount} messages`);
    return { processed: users.length, sent: sentCount };
  },
});
