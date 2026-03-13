import { v } from "convex/values";
import { mutation } from "../_generated/server";

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
