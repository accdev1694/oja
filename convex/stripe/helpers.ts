import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const getUserByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const getSubscriptionByUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .order("desc")
      .first();
  },
});

export const cleanupOldWebhooks = internalMutation({
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const oldWebhooks = await ctx.db
      .query("processedWebhooks")
      .withIndex("by_processed_at", q => q.lt("processedAt", ninetyDaysAgo))
      .collect();

    for (const webhook of oldWebhooks) {
      await ctx.db.delete(webhook._id);
    }

    return { deleted: oldWebhooks.length };
  },
});
