import { internalMutation } from "./_generated/server";

/**
 * Monitors receipt processing failure rate
 * Threshold: > 10% failure rate in the last hour triggers a warning
 * Threshold: > 25% failure rate in the last hour triggers a critical alert
 */
export const checkReceiptFailures = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentReceipts = await ctx.db
      .query("receipts")
      .withIndex("by_created", (q) => q.gte("createdAt", oneHourAgo))
      .collect();

    if (recentReceipts.length < 5) return { checked: false, reason: "Insufficient data" };

    const failed = recentReceipts.filter(r => r.processingStatus === "failed").length;
    const failureRate = (failed / recentReceipts.length) * 100;

    if (failureRate > 10) {
      const severity = failureRate > 25 ? "critical" : "warning";
      
      // Check for existing unresolved alert of same type to avoid spam
      const existing = await ctx.db
        .query("adminAlerts")
        .withIndex("by_resolved", q => q.eq("isResolved", false))
        .filter(q => q.eq(q.field("alertType"), "receipt_failure_spike"))
        .first();

      if (!existing) {
        await ctx.db.insert("adminAlerts", {
          alertType: "receipt_failure_spike",
          message: `Receipt failure rate is ${failureRate.toFixed(1)}% (${failed}/${recentReceipts.length})`,
          severity,
          isResolved: false,
          createdAt: now,
        });
      }
    }

    return { checked: true, failureRate };
  },
});

/**
 * Monitors API Latency via SLA metrics
 */
export const checkApiLatency = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get last 10 SLA metrics
    const recentSla = await ctx.db
      .query("slaMetrics")
      .order("desc")
      .take(10);
      
    const failingCount = recentSla.filter(s => s.status === "fail").length;
    
    if (failingCount >= 3) {
      const existing = await ctx.db
        .query("adminAlerts")
        .withIndex("by_resolved", q => q.eq("isResolved", false))
        .filter(q => q.eq(q.field("alertType"), "high_latency"))
        .first();

      if (!existing) {
        await ctx.db.insert("adminAlerts", {
          alertType: "high_latency",
          message: `System experiencing high latency: ${failingCount}/10 recent checks failed SLA`,
          severity: "warning",
          isResolved: false,
          createdAt: now,
        });
      }
    }
    
    return { checked: true, failingCount };
  },
});

/**
 * Periodic cleanup of resolved/old alerts
 */
export const pruneAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    
    const oldAlerts = await ctx.db
      .query("adminAlerts")
      .filter(q => q.lt(q.field("createdAt"), ninetyDaysAgo))
      .collect();
      
    for (const alert of oldAlerts) {
      await ctx.db.delete(alert._id);
    }
    
    return { pruned: oldAlerts.length };
  },
});
