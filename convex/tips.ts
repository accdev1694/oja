import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// =============================================================================
// CONTEXTUAL TIPS CONFIGURATION
// =============================================================================

/**
 * Tips shown in-app at relevant moments.
 * Each tip has a context (where to show) and conditions.
 */
export const TIPS = {
  // Pantry Screen Tips
  pantry_swipe_stock: {
    context: "pantry",
    title: "Swipe to change stock",
    body: "Swipe left on any item to mark it as running low or out of stock.",
    showAfterSessions: 1,
    showIfCondition: "has_pantry_items",
    priority: 1,
  },

  pantry_tap_add_list: {
    context: "pantry",
    title: "Quick add to list",
    body: "Tap the cart icon on any low-stock item to add it to your shopping list.",
    showAfterSessions: 2,
    showIfCondition: "has_low_stock",
    priority: 2,
  },

  pantry_voice_check: {
    context: "pantry",
    title: "Ask Tobi",
    body: "Tap the mic and ask \"What am I running low on?\" for a quick summary.",
    showAfterSessions: 3,
    showIfCondition: "no_voice_usage",
    priority: 3,
  },

  // Lists Screen Tips
  lists_budget_dial: {
    context: "lists",
    title: "Set a budget",
    body: "Tap 'Set Budget' to track spending as you shop. Oja will warn you before you go over.",
    showAfterSessions: 1,
    showIfCondition: "has_list_no_budget",
    priority: 1,
  },

  lists_share_partner: {
    context: "lists",
    title: "Shop together",
    body: "Tap the share icon to invite a partner. They can add items and see your progress in real-time.",
    showAfterSessions: 2,
    showIfCondition: "no_partners",
    priority: 2,
  },

  lists_check_off: {
    context: "list_detail",
    title: "Check off as you shop",
    body: "Tap items to check them off. Your budget updates live as you go.",
    showAfterSessions: 1,
    showIfCondition: "has_unchecked_items",
    priority: 1,
  },

  // Scan Screen Tips
  scan_first_receipt: {
    context: "scan",
    title: "Scan to save",
    body: "Every receipt you scan helps Oja learn local prices. Scan more to get better estimates!",
    showAfterSessions: 1,
    showIfCondition: "no_receipts",
    priority: 1,
  },

  scan_earn_credits: {
    context: "scan",
    title: "Earn scan credits",
    body: "Each scan earns credits toward your subscription. Bronze tier starts at just 5 scans!",
    showAfterSessions: 2,
    showIfCondition: "has_receipts_no_tier",
    priority: 2,
  },

  // Profile Screen Tips
  profile_insights: {
    context: "profile",
    title: "Weekly Insights",
    body: "Check your spending trends and see where you can save money each week.",
    showAfterSessions: 2,
    showIfCondition: "has_spending_data",
    priority: 1,
  },

  profile_voice_settings: {
    context: "profile",
    title: "Voice Assistant Settings",
    body: "Customise Tobi's voice and manage your AI usage in Settings.",
    showAfterSessions: 3,
    showIfCondition: "always",
    priority: 2,
  },

  // Voice Assistant Tips
  voice_commands: {
    context: "voice",
    title: "Try these commands",
    body: "\"Add milk to my list\", \"What's my budget?\", \"Create a new list for Aldi\"",
    showAfterSessions: 1,
    showIfCondition: "first_voice_use",
    priority: 1,
  },

  // General/Global Tips
  general_trial_ending: {
    context: "global",
    title: "Trial ending soon",
    body: "Don't lose your price history and AI features. Subscribe to keep all your data.",
    showAfterSessions: 0,
    showIfCondition: "trial_ending_soon",
    priority: 10,
  },
} as const;

export type TipKey = keyof typeof TIPS;
export type TipContext = "pantry" | "lists" | "list_detail" | "scan" | "profile" | "voice" | "global";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get the next relevant tip for a given context
 */
export const getNextTip = query({
  args: {
    context: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    // Get dismissed tips
    const dismissed = await ctx.db
      .query("tipsDismissed")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const dismissedKeys = new Set(dismissed.map((d) => d.tipKey));

    const sessionCount = user.sessionCount ?? 0;

    // Get user stats for condition checking
    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const partners = await ctx.db
      .query("listPartners")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const voiceUsage = await ctx.db
      .query("aiUsage")
      .withIndex("by_user_feature", (q) => q.eq("userId", user._id).eq("feature", "voice"))
      .first();

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const scanCredits = await ctx.db
      .query("scanCredits")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Helper to check conditions
    const checkCondition = (condition: string): boolean => {
      switch (condition) {
        case "always":
          return true;
        case "has_pantry_items":
          return pantryItems.length > 0;
        case "has_low_stock":
          return pantryItems.some((i) => i.stockLevel === "low" || i.stockLevel === "out");
        case "no_voice_usage":
          return (voiceUsage?.requestCount ?? 0) === 0;
        case "has_list_no_budget":
          return lists.some((l) => !l.budget || l.budget === 0);
        case "no_partners":
          return partners.length === 0;
        case "has_unchecked_items":
          return true; // Would need list context
        case "no_receipts":
          return receipts.length === 0;
        case "has_receipts_no_tier":
          return receipts.length > 0 && !scanCredits?.tier;
        case "has_spending_data":
          return receipts.length > 0;
        case "first_voice_use":
          return (voiceUsage?.requestCount ?? 0) <= 1;
        case "trial_ending_soon":
          if (!subscription?.trialEndsAt) return false;
          const daysLeft = Math.ceil((subscription.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000));
          return subscription.status === "trial" && daysLeft <= 3 && daysLeft > 0;
        default:
          return false;
      }
    };

    // Find the best tip for this context
    const contextTips = Object.entries(TIPS)
      .filter(([key, tip]) => {
        // Match context (or global)
        if (tip.context !== args.context && tip.context !== "global") return false;
        // Not dismissed
        if (dismissedKeys.has(key)) return false;
        // Session requirement met
        if (sessionCount < tip.showAfterSessions) return false;
        // Condition met
        if (!checkCondition(tip.showIfCondition)) return false;
        return true;
      })
      .sort((a, b) => a[1].priority - b[1].priority);

    if (contextTips.length === 0) return null;

    const [tipKey, tipConfig] = contextTips[0];
    return {
      key: tipKey,
      title: tipConfig.title,
      body: tipConfig.body,
      context: tipConfig.context,
    };
  },
});

/**
 * Get all tips for a context (for a tips carousel/list)
 */
export const getTipsForContext = query({
  args: {
    context: v.string(),
    includeGlobal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const dismissed = await ctx.db
      .query("tipsDismissed")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const dismissedKeys = new Set(dismissed.map((d) => d.tipKey));

    return Object.entries(TIPS)
      .filter(([key, tip]) => {
        const matchContext = tip.context === args.context || (args.includeGlobal && tip.context === "global");
        return matchContext && !dismissedKeys.has(key);
      })
      .map(([key, tip]) => ({
        key,
        title: tip.title,
        body: tip.body,
        context: tip.context,
        priority: tip.priority,
      }))
      .sort((a, b) => a.priority - b.priority);
  },
});

/**
 * Check if user has dismissed a specific tip
 */
export const hasDismissedTip = query({
  args: { tipKey: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return false;

    const dismissed = await ctx.db
      .query("tipsDismissed")
      .withIndex("by_user_tip", (q) =>
        q.eq("userId", user._id).eq("tipKey", args.tipKey)
      )
      .unique();

    return dismissed !== null;
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Dismiss a tip (user clicked "Got it" or X)
 */
export const dismissTip = mutation({
  args: { tipKey: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    // Check if already dismissed
    const existing = await ctx.db
      .query("tipsDismissed")
      .withIndex("by_user_tip", (q) =>
        q.eq("userId", user._id).eq("tipKey", args.tipKey)
      )
      .unique();

    if (existing) return { alreadyDismissed: true };

    await ctx.db.insert("tipsDismissed", {
      userId: user._id,
      tipKey: args.tipKey,
      dismissedAt: Date.now(),
    });

    return { alreadyDismissed: false };
  },
});

/**
 * Reset all tips for a user (for testing or "show tips again" setting)
 */
export const resetTips = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const dismissed = await ctx.db
      .query("tipsDismissed")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const d of dismissed) {
      await ctx.db.delete(d._id);
    }

    return { resetCount: dismissed.length };
  },
});
