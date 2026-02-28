import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new experiment
 */
export const createExperiment = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    goalEvent: v.string(),
    variants: v.array(v.object({
      variantName: v.string(),
      allocationPercent: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
      
    if (!admin || !admin.isAdmin) throw new Error("Unauthorized");
    
    // 1. Create experiment
    const experimentId = await ctx.db.insert("experiments", {
      name: args.name,
      description: args.description,
      goalEvent: args.goalEvent,
      status: "draft",
      startDate: Date.now(),
      createdBy: admin._id,
      createdAt: Date.now(),
    });
    
    // 2. Create variants
    for (const v of args.variants) {
      await ctx.db.insert("experimentVariants", {
        experimentId,
        variantName: v.variantName,
        allocationPercent: v.allocationPercent,
      });
    }
    
    return experimentId;
  },
});

/**
 * Assign a user to an active experiment
 */
export const assignUserToExperiment = mutation({
  args: { userId: v.id("users"), experimentId: v.id("experiments") },
  handler: async (ctx, args) => {
    // 1. Check if already assigned
    const existing = await ctx.db
      .query("experimentAssignments")
      .withIndex("by_user_experiment", (q) => q.eq("userId", args.userId).eq("experimentId", args.experimentId))
      .unique();
      
    if (existing) return existing.variantName;
    
    // 2. Get variants
    const variants = await ctx.db
      .query("experimentVariants")
      .withIndex("by_experiment", (q) => q.eq("experimentId", args.experimentId))
      .collect();
      
    if (variants.length === 0) return null;
    
    // 3. Simple random allocation
    const rand = Math.random() * 100;
    let sum = 0;
    let selectedVariant = variants[0].variantName;
    
    for (const v of variants) {
      sum += v.allocationPercent;
      if (rand <= sum) {
        selectedVariant = v.variantName;
        break;
      }
    }
    
    // 4. Save assignment
    await ctx.db.insert("experimentAssignments", {
      userId: args.userId,
      experimentId: args.experimentId,
      variantName: selectedVariant,
      assignedAt: Date.now(),
    });
    
    return selectedVariant;
  },
});

/**
 * Track an event for an experiment
 */
export const trackExperimentEvent = mutation({
  args: { userId: v.id("users"), eventName: v.string() },
  handler: async (ctx, args) => {
    // Find all active experiments for this user
    const assignments = await ctx.db
      .query("experimentAssignments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
      
    for (const ass of assignments) {
      const exp = await ctx.db.get(ass.experimentId);
      if (exp && exp.status === "running" && (exp.goalEvent === args.eventName || args.eventName === "view")) {
        await ctx.db.insert("experimentEvents", {
          userId: args.userId,
          experimentId: ass.experimentId,
          variantName: ass.variantName,
          eventName: args.eventName,
          timestamp: Date.now(),
        });
      }
    }
  },
});

/**
 * Get results for an experiment
 */
export const getExperimentResults = query({
  args: { experimentId: v.id("experiments") },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId);
    if (!experiment) return null;
    
    const variants = await ctx.db
      .query("experimentVariants")
      .withIndex("by_experiment", (q) => q.eq("experimentId", args.experimentId))
      .collect();
      
    const results = [];
    
    for (const v of variants) {
      // Count unique users assigned to this variant
      const assignments = await ctx.db
        .query("experimentAssignments")
        .withIndex("by_experiment", (q) => q.eq("experimentId", args.experimentId))
        .filter((q) => q.eq(q.field("variantName"), v.variantName))
        .collect();
        
      const userCount = assignments.length;
      
      // Count unique converted users
      const conversions = await ctx.db
        .query("experimentEvents")
        .withIndex("by_experiment_variant", (q) => q.eq("experimentId", args.experimentId).eq("variantName", v.variantName))
        .filter((q) => q.eq(q.field("eventName"), experiment.goalEvent))
        .collect();
        
      const convertedUserCount = new Set(conversions.map(c => c.userId.toString())).size;
      
      results.push({
        variantName: v.variantName,
        userCount,
        convertedUserCount,
        conversionRate: userCount > 0 ? (convertedUserCount / userCount) * 100 : 0,
      });
    }
    
    return {
      experiment,
      variants: results,
    };
  },
});

/**
 * Get all experiments
 */
export const listExperiments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("experiments").order("desc").take(100);
  },
});
