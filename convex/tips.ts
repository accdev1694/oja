import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { TIPS } from "./lib/tipsConfig";

export { TIPS } from "./lib/tipsConfig";
export type { TipKey, TipContext } from "./lib/tipsConfig";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get the next relevant tip for a given context
 */
export const getNextTip = query({
  args: {
    context: v.string(),
    // Client-supplied rotation cursor. Each time the caller bumps this
    // number, the eligible-tip pool is re-indexed so the returned tip
    // changes — this is how variety is achieved *within* a session.
    // Callers typically bump on tab focus / resurface.
    rotation: v.optional(v.number()),
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
        case "first_list_with_5_items":
          return lists.some((l) => !l.healthAnalysis);
        default:
          return false;
      }
    };

    // Collect eligible tips for this context. Ordering inside the pool is
    // priority-first (tie-broken by key) so the rotation is stable — an
    // eligible global-priority-10 tip like `general_trial_ending` will
    // always sit at a fixed index.
    const contextTips = Object.entries(TIPS)
      .filter(([key, tip]) => {
        if (tip.context !== args.context && tip.context !== "global") return false;
        if (dismissedKeys.has(key)) return false;
        if (sessionCount < tip.showAfterSessions) return false;
        if (!checkCondition(tip.showIfCondition)) return false;
        return true;
      })
      .sort((a, b) => a[1].priority - b[1].priority || a[0].localeCompare(b[0]));

    if (contextTips.length === 0) return null;

    // Seed = sessionCount + context hash + client rotation cursor.
    //   • sessionCount varies the starting point across app launches
    //   • contextHash desyncs rotation across tabs so Lists and Pantry
    //     don't show the same-index tip at the same time
    //   • rotation is bumped by the client on focus/resurface so users
    //     see variety *within* a single session
    let contextHash = 0;
    for (let i = 0; i < args.context.length; i++) {
      contextHash = (contextHash * 31 + args.context.charCodeAt(i)) | 0;
    }
    const seed = sessionCount + contextHash + (args.rotation ?? 0);
    const rotationIndex =
      ((seed % contextTips.length) + contextTips.length) % contextTips.length;
    const [tipKey, tipConfig] = contextTips[rotationIndex];
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
