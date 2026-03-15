import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

    if (args.endDate <= args.startDate) {
      throw new Error("End date must be after start date");
    }
    if (args.type === "points_multiplier" && args.multiplier != null && (args.multiplier < 0.5 || args.multiplier > 10)) {
      throw new Error("Multiplier must be between 0.5 and 10");
    }
    if (args.type === "bonus_points" && args.bonusAmount != null && (args.bonusAmount < 1 || args.bonusAmount > 1000)) {
      throw new Error("Bonus amount must be between 1 and 1000");
    }

    const eventId = await ctx.db.insert("seasonalEvents", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("adminLogs", {
      adminUserId: user._id,
      action: "create_seasonal_event",
      targetType: "seasonal_event",
      targetId: eventId,
      details: `Created ${args.type} event: ${args.name} (${new Date(args.startDate).toISOString()} - ${new Date(args.endDate).toISOString()})`,
      createdAt: Date.now(),
    });

    return eventId;
  },
});

/**
 * Auto-deactivate seasonal events past their end date.
 * Called by cron job.
 */
export const deactivateExpiredEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const activeEvents = await ctx.db
      .query("seasonalEvents")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    let deactivatedCount = 0;
    for (const event of activeEvents) {
      if (event.endDate < now) {
        await ctx.db.patch(event._id, { isActive: false });
        deactivatedCount++;
      }
    }

    return { deactivatedCount };
  },
});
