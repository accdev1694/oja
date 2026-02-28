import { internalMutation } from "./_generated/server";
import { sendAlert } from "./lib/alerts";

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
        await sendAlert(ctx, {
          type: "receipt_failure_spike",
          message: `Receipt failure rate is ${failureRate.toFixed(1)}% (${failed}/${recentReceipts.length})`,
          severity,
          metadata: { failureRate, failed, total: recentReceipts.length }
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
        await sendAlert(ctx, {
          type: "high_latency",
          message: `System experiencing high latency: ${failingCount}/10 recent checks failed SLA`,
          severity: "warning",
          metadata: { failingCount }
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

/**
 * Security: Detects brute force or suspicious login activity
 * Threshold: > 5 sessions from same IP in 10 minutes
 */
export const checkSecurityAnomalies = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    
    const recentSessions = await ctx.db
      .query("adminSessions")
      .filter(q => q.gt(q.field("loginAt"), tenMinutesAgo))
      .collect();

    // Group by IP
    const ipCounts: Record<string, number> = {};
    for (const session of recentSessions) {
      if (!session.ipAddress) continue;
      ipCounts[session.ipAddress] = (ipCounts[session.ipAddress] || 0) + 1;
    }

    let alertsCreated = 0;
    for (const [ip, count] of Object.entries(ipCounts)) {
      if (count >= 5) {
        await sendAlert(ctx, {
          type: "security_anomaly_login",
          message: `Suspicious login activity: ${count} sessions from IP ${ip} in 10 mins`,
          severity: "critical",
          metadata: { ip, count }
        });
        alertsCreated++;
      }
    }

    return { alertsCreated };
  },
});

/**
 * Data Quality: Detects rapid, massive price changes
 * Threshold: Price change > 300% in a single update
 */
export const checkPriceAnomalies = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Check audit logs for override_price actions
    const recentOverrides = await ctx.db
      .query("adminLogs")
      .withIndex("by_action", q => q.eq("action", "override_price"))
      .filter(q => q.gt(q.field("createdAt"), oneHourAgo))
      .collect();

    let alertsCreated = 0;
    for (const log of recentOverrides) {
      // Details format: "Overrode price for [Item] from £[Old] to £[New]"
      const match = log.details?.match(/from £([\d.]+) to £([\d.]+)/);
      if (match) {
        const oldPrice = parseFloat(match[1]);
        const newPrice = parseFloat(match[2]);
        const deviation = newPrice / oldPrice;

        if (deviation > 3.0 || deviation < 0.2) {
          await sendAlert(ctx, {
            type: "data_anomaly_price",
            message: `Massive price override detected for ${log.targetId}: £${oldPrice} -> £${newPrice} (${Math.round(deviation * 100)}%)`,
            severity: "warning",
            metadata: { targetId: log.targetId, oldPrice, newPrice, deviation }
          });
          alertsCreated++;
        }
      }
    }

    return { alertsCreated };
  },
});
