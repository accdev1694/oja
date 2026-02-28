import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all active pricing configurations
 */
export const getPricing = query({
  args: { region: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("pricingConfig").withIndex("by_active", (q: any) => q.eq("isActive", true));
    
    const allActive = await q.collect();
    
    // Filter by region if provided, otherwise return global prices (where region is undefined)
    if (args.region) {
      const regional = allActive.filter(p => p.region === args.region);
      if (regional.length > 0) return regional;
    }
    
    return allActive.filter(p => p.region === undefined);
  },
});

/**
 * Get pricing for a specific plan
 */
export const getPlanPrice = query({
  args: { planId: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("pricingConfig")
      .withIndex("by_plan", (q: any) => q.eq("planId", args.planId))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .first();

    return config ? config.priceAmount : null;
  },
});

/**
 * Get all pricing configs (admin only)
 */
export const getAllPricing = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || !user.isAdmin) return [];

    return await ctx.db.query("pricingConfig").collect();
  },
});

/**
 * Update pricing (admin only)
 */
export const updatePricing = mutation({
  args: {
    planId: v.string(),
    priceAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || !user.isAdmin) throw new Error("Admin access required");

    if (args.priceAmount <= 0) {
      throw new Error("Price must be positive");
    }

    if (args.priceAmount > 10000) {
      throw new Error("Price exceeds maximum (£10,000)");
    }

    const existing = await ctx.db
      .query("pricingConfig")
      .withIndex("by_plan", (q: any) => q.eq("planId", args.planId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        priceAmount: args.priceAmount,
        updatedAt: Date.now(),
      });
    } else {
      throw new Error(`Plan ${args.planId} not found`);
    }

    // Log admin action
    await ctx.db.insert("adminLogs", {
      adminUserId: user._id,
      action: "update_pricing",
      targetType: "pricingConfig",
      targetId: args.planId,
      details: `Updated ${args.planId} price to £${args.priceAmount}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
