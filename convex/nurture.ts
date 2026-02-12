import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// =============================================================================
// NURTURE SEQUENCE CONFIGURATION
// =============================================================================

/**
 * Nurture messages for new users during their first week.
 * Each message has conditions based on user state and days since signup.
 */
export const NURTURE_SEQUENCE = {
  // Day 1: Welcome & First Steps
  day_1_welcome: {
    daysSinceSignup: 0,
    title: "Welcome to Oja! 🛒",
    body: "Your AI shopping assistant is ready. Start by checking your pantry or creating your first list.",
    condition: "onboarding_complete",
    screen: "index",
    priority: 1,
  },

  // Day 2: Encourage First List
  day_2_first_list: {
    daysSinceSignup: 1,
    title: "Ready to shop smarter?",
    body: "Create your first shopping list and let Oja estimate your budget before you even leave home.",
    condition: "no_lists",
    screen: "lists",
    priority: 2,
  },

  // Day 2 (alternative): Encourage Receipt Scan
  day_2_scan_receipt: {
    daysSinceSignup: 1,
    title: "Got a receipt? 📱",
    body: "Scan it to track prices and earn scan credits. The more you scan, the smarter Oja gets!",
    condition: "no_receipts",
    screen: "scan",
    priority: 3,
  },

  // Day 3: Highlight Voice Assistant
  day_3_voice: {
    daysSinceSignup: 2,
    title: "Try asking Tobi 🎤",
    body: "\"What am I running low on?\" — Tap the mic and ask Tobi anything about your pantry or lists.",
    condition: "no_voice_usage",
    screen: "index",
    priority: 4,
  },

  // Day 4: Partner Mode
  day_4_partner: {
    daysSinceSignup: 3,
    title: "Shopping with someone?",
    body: "Invite a partner to share lists, approve items, and shop together in real-time.",
    condition: "no_partners",
    screen: "partners",
    priority: 5,
  },

  // Day 5: Weekly Insights Preview
  day_5_insights: {
    daysSinceSignup: 4,
    title: "Your first insights are ready 📊",
    body: "See how you're spending and discover ways to save. Check your weekly digest!",
    condition: "has_activity",
    screen: "insights",
    priority: 6,
  },

  // Trial Ending: 3 Days Left
  trial_ending_3d: {
    daysSinceSignup: -1, // Special: based on trialEndsAt
    daysUntilTrialEnd: 3,
    title: "3 days left of Premium",
    body: "Your trial ends soon. Keep all features — subscribe now and never miss a deal.",
    condition: "trial_active",
    screen: "subscription",
    priority: 10,
  },

  // Trial Ending: 1 Day Left
  trial_ending_1d: {
    daysSinceSignup: -1,
    daysUntilTrialEnd: 1,
    title: "Last day of Premium!",
    body: "Don't lose your price tracking and AI features. Subscribe to keep going.",
    condition: "trial_active",
    screen: "subscription",
    priority: 11,
  },

  // Trial Expired
  trial_expired: {
    daysSinceSignup: -1,
    daysUntilTrialEnd: 0,
    title: "Your trial has ended",
    body: "Thanks for trying Oja Premium! Upgrade anytime to unlock all features again.",
    condition: "trial_expired",
    screen: "subscription",
    priority: 12,
  },

  // Re-engagement: Inactive 7 Days
  inactive_7d: {
    daysSinceSignup: -1,
    daysInactive: 7,
    title: "We miss you! 👋",
    body: "Your pantry might need updating. Tap to see what's running low.",
    condition: "inactive",
    screen: "index",
    priority: 20,
  },
} as const;

type NurtureKey = keyof typeof NURTURE_SEQUENCE;

// =============================================================================
// HELPER: Calculate days since signup
// =============================================================================

function getDaysSinceSignup(createdAt: number): number {
  const now = Date.now();
  const diffMs = now - createdAt;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

function getDaysUntilTrialEnd(trialEndsAt: number | undefined): number | null {
  if (!trialEndsAt) return null;
  const now = Date.now();
  const diffMs = trialEndsAt - now;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

function getDaysInactive(lastActiveAt: number | undefined): number {
  if (!lastActiveAt) return 999; // Never active = very inactive
  const now = Date.now();
  const diffMs = now - lastActiveAt;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

// =============================================================================
// HELPER: Format dynamic trial message
// =============================================================================

export function formatTrialMessage(trialEndsAt: number | undefined): string {
  const daysLeft = getDaysUntilTrialEnd(trialEndsAt);
  if (daysLeft === null) return "Enjoy your premium features!";
  if (daysLeft <= 0) return "Your trial has ended.";
  if (daysLeft === 1) return "You have 1 day of premium access remaining.";
  return `You have ${daysLeft} days of premium access remaining.`;
}

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

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Record user activity (call on app focus/session start)
 */
export const recordActivity = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const now = Date.now();
    const lastSession = user.lastSessionAt ?? 0;
    const hoursSinceLastSession = (now - lastSession) / (60 * 60 * 1000);

    // Count as new session if > 30 minutes since last
    const isNewSession = hoursSinceLastSession > 0.5;

    await ctx.db.patch(user._id, {
      lastActiveAt: now,
      ...(isNewSession && {
        lastSessionAt: now,
        sessionCount: (user.sessionCount ?? 0) + 1,
      }),
      updatedAt: now,
    });

    return { isNewSession, sessionCount: (user.sessionCount ?? 0) + (isNewSession ? 1 : 0) };
  },
});

/**
 * Mark a nurture message as sent
 */
export const markNurtureSent = mutation({
  args: {
    messageKey: v.string(),
    channel: v.union(v.literal("push"), v.literal("in_app"), v.literal("both")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    // Check if already sent
    const existing = await ctx.db
      .query("nurtureMessages")
      .withIndex("by_user_message", (q) =>
        q.eq("userId", user._id).eq("messageKey", args.messageKey)
      )
      .unique();

    if (existing) return { alreadySent: true };

    await ctx.db.insert("nurtureMessages", {
      userId: user._id,
      messageKey: args.messageKey,
      sentAt: Date.now(),
      channel: args.channel,
    });

    return { alreadySent: false };
  },
});

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
