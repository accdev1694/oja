import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Report a new admin alert
 */
export const reportAlert = mutation({
  args: {
    alertType: v.string(),
    message: v.string(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
  },
  handler: async (ctx, args) => {
    const alertId = await ctx.db.insert("adminAlerts", {
      alertType: args.alertType,
      message: args.message,
      severity: args.severity,
      isResolved: false,
      createdAt: Date.now(),
    });
    
    // In a real app, this would trigger an actual push notification to admins
    console.log(`[ALERT] ${args.severity.toUpperCase()}: ${args.message}`);
    
    return alertId;
  },
});

/**
 * Resolve an alert
 */
export const resolveAlert = mutation({
  args: { alertId: v.id("adminAlerts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
      
    if (!admin || !admin.isAdmin) throw new Error("Unauthorized");
    
    await ctx.db.patch(args.alertId, {
      isResolved: true,
      resolvedBy: admin._id,
      resolvedAt: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Record an SLA metric
 */
export const recordSLAMetric = mutation({
  args: {
    metric: v.string(),
    target: v.number(),
    actual: v.number(),
  },
  handler: async (ctx, args) => {
    let status: "pass" | "warn" | "fail" = "pass";
    
    if (args.actual > args.target * 1.5) status = "fail";
    else if (args.actual > args.target) status = "warn";
    
    const metricId = await ctx.db.insert("slaMetrics", {
      metric: args.metric,
      target: args.target,
      actual: args.actual,
      status,
      timestamp: Date.now(),
    });
    
    // Auto-report alert if SLA fails
    if (status === "fail") {
      await ctx.db.insert("adminAlerts", {
        alertType: "sla_breach",
        message: `SLA Breach: ${args.metric} is ${args.actual}ms (target ${args.target}ms)`,
        severity: "warning",
        isResolved: false,
        createdAt: Date.now(),
      });
    }
    
    return metricId;
  },
});

/**
 * Get active alerts
 */
export const getActiveAlerts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("adminAlerts")
      .withIndex("by_resolved", (q) => q.eq("isResolved", false))
      .order("desc")
      .collect();
  },
});

/**
 * Get SLA metrics for dashboard
 */
export const getSLAMetrics = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("slaMetrics")
      .order("desc")
      .take(args.limit || 20);
  },
});
