import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get current active seasonal event
 */
export const getActiveEvent = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const activeEvent = await ctx.db
      .query("seasonalEvents")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .filter((q) => q.and(
        q.lte(q.field("startDate"), now),
        q.gte(q.field("endDate"), now)
      ))
      .first();

    return activeEvent;
  },
});

/**
 * Internal query for mutation usage
 */
export const getActiveEventInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("seasonalEvents")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .filter((q) => q.and(
        q.lte(q.field("startDate"), now),
        q.gte(q.field("endDate"), now)
      ))
      .first();
  },
});

/**
 * Create a new seasonal event (Admin)
 */
export const createEvent = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    type: v.union(
      v.literal("points_multiplier"),
      v.literal("bonus_points"),
      v.literal("tier_boost")
    ),
    multiplier: v.optional(v.number()),
    bonusAmount: v.optional(v.number()),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    // Check admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
      
    if (!user?.isAdmin) throw new Error("Unauthorized");

    const eventId = await ctx.db.insert("seasonalEvents", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });

    return eventId;
  },
});
