import { internalMutation } from "./_generated/server";
import { sendAlert } from "./lib/alerts";
import { PROVIDER_LIMITS } from "./lib/aiTracking";

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

/**
 * AI Capacity Alerting: Checks yesterday's AI usage against Gemini free tier limits
 * - Alert 1: Daily requests approaching Gemini RPD limit (>70% = warning, >93% = critical)
 * - Alert 2: High fallback rate indicating Gemini throttling (>5% = warning, >10% = critical)
 * - Alert 3: Cost spike detection (>$1/day = warning, >$5/day = critical)
 */
export const checkAICapacity = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get yesterday's date string
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dateStr = yesterday.toISOString().split("T")[0];

    // Get yesterday's "all" aggregate from aiUsageDaily
    const dailyRecord = await ctx.db
      .query("aiUsageDaily")
      .withIndex("by_date", (q) => q.eq("date", dateStr))
      .filter((q) => q.eq(q.field("feature"), "all"))
      .first();

    if (!dailyRecord) return { checked: false, reason: "No data for yesterday" };

    const geminiDailyLimit = 1500;
    const usagePercent = (dailyRecord.requestCount / geminiDailyLimit) * 100;
    const fallbackRate = dailyRecord.requestCount > 0
      ? (dailyRecord.fallbackRequests / dailyRecord.requestCount) * 100
      : 0;

    let alertsCreated = 0;

    // Alert 1: Daily requests approaching Gemini limit
    if (usagePercent > 70) {
      const severity = usagePercent > 93 ? "critical" : "warning";

      const existing = await ctx.db
        .query("adminAlerts")
        .withIndex("by_resolved", (q) => q.eq("isResolved", false))
        .filter((q) => q.eq(q.field("alertType"), "ai_capacity_daily"))
        .first();

      if (!existing) {
        await sendAlert(ctx, {
          type: "ai_capacity_daily",
          message: `AI daily usage at ${usagePercent.toFixed(0)}% of Gemini free tier (${dailyRecord.requestCount}/${geminiDailyLimit} RPD). ${severity === "critical" ? "Upgrade to Vertex AI immediately." : "Monitor closely."}`,
          severity,
          metadata: {
            date: dateStr,
            requests: dailyRecord.requestCount,
            limit: geminiDailyLimit,
            usagePercent: Math.round(usagePercent),
            cost: dailyRecord.estimatedCostUsd
          },
        });
        alertsCreated++;
      }
    }

    // Alert 2: High fallback rate (Gemini being throttled)
    if (fallbackRate > 5 && dailyRecord.requestCount > 10) {
      const severity = fallbackRate > 10 ? "critical" : "warning";

      const existing = await ctx.db
        .query("adminAlerts")
        .withIndex("by_resolved", (q) => q.eq("isResolved", false))
        .filter((q) => q.eq(q.field("alertType"), "ai_fallback_rate"))
        .first();

      if (!existing) {
        await sendAlert(ctx, {
          type: "ai_fallback_rate",
          message: `AI fallback rate is ${fallbackRate.toFixed(1)}% (${dailyRecord.fallbackRequests} of ${dailyRecord.requestCount} calls hit OpenAI). Gemini may be throttling.`,
          severity,
          metadata: {
            date: dateStr,
            fallbackRate: Math.round(fallbackRate),
            fallbackRequests: dailyRecord.fallbackRequests,
            totalRequests: dailyRecord.requestCount
          },
        });
        alertsCreated++;
      }
    }

    // Alert 3: Cost spike (daily cost > $1 indicates significant usage)
    if (dailyRecord.estimatedCostUsd > 1.0) {
      const existing = await ctx.db
        .query("adminAlerts")
        .withIndex("by_resolved", (q) => q.eq("isResolved", false))
        .filter((q) => q.eq(q.field("alertType"), "ai_cost_spike"))
        .first();

      if (!existing) {
        await sendAlert(ctx, {
          type: "ai_cost_spike",
          message: `AI daily cost was $${dailyRecord.estimatedCostUsd.toFixed(4)} on ${dateStr}. Projected monthly: $${(dailyRecord.estimatedCostUsd * 30).toFixed(2)}.`,
          severity: dailyRecord.estimatedCostUsd > 5.0 ? "critical" : "warning",
          metadata: {
            date: dateStr,
            dailyCost: dailyRecord.estimatedCostUsd,
            projectedMonthlyCost: dailyRecord.estimatedCostUsd * 30
          },
        });
        alertsCreated++;
      }
    }

    return {
      checked: true,
      date: dateStr,
      requests: dailyRecord.requestCount,
      usagePercent: Math.round(usagePercent),
      fallbackRate: Math.round(fallbackRate),
      cost: dailyRecord.estimatedCostUsd,
      alertsCreated
    };
  },
});

/**
 * TTS Character Quota: Monitors Azure TTS usage against the 500K chars/month free tier
 * - Alert 1: > 80% usage = warning
 * - Alert 2: > 95% usage = critical
 */
export const checkTTSQuota = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Sum ttsCharacters across all "tts" feature records for this period
    const ttsRecords = await ctx.db
      .query("aiUsage")
      .withIndex("by_period", (q) => q.gte("periodStart", monthStart.getTime()))
      .filter((q) =>
        q.and(
          q.eq(q.field("feature"), "tts"),
          q.lt(q.field("periodStart"), monthEnd.getTime())
        )
      )
      .collect();

    const totalChars = ttsRecords.reduce((sum, r) => sum + (r.ttsCharacters ?? 0), 0);
    const freeLimit = PROVIDER_LIMITS.azure_tts.freeCharsPerMonth;
    const usagePercent = (totalChars / freeLimit) * 100;

    if (usagePercent > 80) {
      const severity = usagePercent > 95 ? "critical" : "warning";

      const existing = await ctx.db
        .query("adminAlerts")
        .withIndex("by_resolved", (q) => q.eq("isResolved", false))
        .filter((q) => q.eq(q.field("alertType"), "tts_quota"))
        .first();

      if (!existing) {
        await sendAlert(ctx, {
          type: "tts_quota",
          message: `Azure TTS usage at ${usagePercent.toFixed(0)}% of free tier (${totalChars.toLocaleString()} / ${freeLimit.toLocaleString()} chars). ${severity === "critical" ? "Approaching limit — voice responses may fail." : "Monitor closely."}`,
          severity,
          metadata: {
            totalChars,
            freeLimit,
            usagePercent: Math.round(usagePercent),
          },
        });
        return { checked: true, totalChars, usagePercent: Math.round(usagePercent), alerted: true };
      }
    }

    return { checked: true, totalChars, usagePercent: Math.round(usagePercent), alerted: false };
  },
});
