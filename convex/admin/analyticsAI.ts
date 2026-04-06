import { v } from "convex/values";
import { query } from "../_generated/server";
import {
  requirePermissionQuery,
  QueryCtx
} from "./helpers";
import { PROVIDER_LIMITS } from "../lib/aiTracking";

export const getPlatformAIUsage = query({
  args: { refreshKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics");

    const now = Date.now();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    const usageRecords = await ctx.db
        .query("aiUsage")
        .filter((q) => q.gte(q.field("periodStart"), monthStart))
        .collect();

      const summary: Record<string, { requests: number; tokens: number; cost: number; vision: number; fallbacks: number }> = {};
      const trackedFeatures = ["voice", "receipt_scan", "product_scan", "health_analysis", "price_estimate", "item_variants", "list_suggestions", "pantry_seed", "tts"];
      for (const f of trackedFeatures) {
        summary[f] = { requests: 0, tokens: 0, cost: 0, vision: 0, fallbacks: 0 };
      }

      let totalRequests = 0;
      let totalTokens = 0;
      let totalCost = 0;
      let totalVision = 0;
      let totalFallbacks = 0;

      for (const record of usageRecords) {
        if (!summary[record.feature]) {
          summary[record.feature] = { requests: 0, tokens: 0, cost: 0, vision: 0, fallbacks: 0 };
        }
        summary[record.feature].requests += record.requestCount;
        summary[record.feature].tokens += (record.tokenCount ?? 0);
        summary[record.feature].cost += (record.estimatedCostUsd ?? 0);
        summary[record.feature].vision += (record.visionRequests ?? 0);
        summary[record.feature].fallbacks += (record.fallbackRequests ?? 0);
        totalRequests += record.requestCount;
        totalTokens += (record.tokenCount ?? 0);
        totalCost += (record.estimatedCostUsd ?? 0);
        totalVision += (record.visionRequests ?? 0);
        totalFallbacks += (record.fallbackRequests ?? 0);
      }

      const TOKEN_ALERT_THRESHOLD = 1000000;
      const REQ_ALERT_THRESHOLD = 5000;
      let alert: { level: "info" | "warning" | "critical"; message: string } | null = null;

      if (totalTokens > TOKEN_ALERT_THRESHOLD * 0.9 || totalRequests > REQ_ALERT_THRESHOLD * 0.9) {
        alert = {
          level: "critical",
          message: `CRITICAL: Platform usage approaching limits (${totalTokens.toLocaleString()} tokens used). Review provider quotas.`,
        };
      } else if (totalTokens > TOKEN_ALERT_THRESHOLD * 0.7 || totalRequests > REQ_ALERT_THRESHOLD * 0.7) {
        alert = {
          level: "warning",
          message: "WARNING: High platform AI consumption. Monitor usage patterns.",
        };
      }

      const daysInMonthSoFar = Math.max(1, Math.ceil((now - monthStart) / (24 * 60 * 60 * 1000)));
      const weeksInMonthSoFar = Math.max(1, daysInMonthSoFar / 7);

      const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
      const daysUntilRenewal = Math.ceil((nextMonth.getTime() - now) / (24 * 60 * 60 * 1000));

    return {
      summary,
      totalRequests,
      totalTokens,
      tokenQuota: TOKEN_ALERT_THRESHOLD,
      requestQuota: REQ_ALERT_THRESHOLD,
      dailyAverageTokens: Math.round(totalTokens / daysInMonthSoFar),
      weeklyAverageTokens: Math.round(totalTokens / weeksInMonthSoFar),
      daysUntilRenewal,
      renewalDate: nextMonth.getTime(),
      activeProvider: "Gemini 2.5 Flash-Lite",
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalVision,
      totalFallbacks,
      fallbackRate: totalRequests > 0 ? Math.round((totalFallbacks / totalRequests) * 100) : 0,
      alert,
      computedAt: now,
    };
  },
});

/**
 * Get today's AI request count — the single most important scaling metric.
 * Gemini 2.5 Flash-Lite free tier limit: 1,000 requests per day.
 */
export const getTodayAIRequestCount = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");

    const now = Date.now();
    const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    // Get all aiUsage records for current month — read daily delta fields
    const todayStr = new Date().toISOString().split("T")[0];
    const usageRecords = await ctx.db
      .query("aiUsage")
      .filter((q) => q.gte(q.field("periodStart"), monthStart))
      .collect();

    // Sum today's actual requests using daily delta fields (not monthly cumulative)
    let todayRequests = 0;
    let todayVision = 0;
    let todayFallback = 0;
    let todayCost = 0;
    const todayUsers = new Set<string>();

    for (const record of usageRecords) {
      if (record.dailyDate === todayStr) {
        todayRequests += record.dailyRequestCount ?? 0;
        todayVision += record.dailyVisionRequests ?? 0;
        todayFallback += record.dailyFallbackRequests ?? 0;
        todayCost += record.dailyCostUsd ?? 0;
        todayUsers.add(record.userId.toString());
      }
    }

    const geminiDailyLimit = PROVIDER_LIMITS.gemini.requestsPerDay;
    const usagePercent = Math.round((todayRequests / geminiDailyLimit) * 100);
    const fallbackRate = todayRequests > 0 ? Math.round((todayFallback / todayRequests) * 100) : 0;

    let zone = "green";
    if (usagePercent > 93) zone = "red";
    else if (usagePercent > 70) zone = "yellow";

    return {
      todayRequests,
      geminiDailyLimit,
      usagePercent,
      todayVision,
      todayFallback,
      fallbackRate,
      todayCost: Math.round(todayCost * 10000) / 10000,
      activeUsers: todayUsers.size,
      zone,
      timestamp: now,
    };
  },
});

/**
 * Get capacity planning data for the admin dashboard.
 * Historical trends, projections, and scaling recommendations.
 */
export const getCapacityPlanningData = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics");

    const lookbackDays = args.days ?? 30;
    const now = Date.now();
    const startDate = new Date(now - lookbackDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Get historical daily aggregates
    const dailyRecords = await ctx.db
      .query("aiUsageDaily")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("date"), startDate))
      .collect();

    // Build daily trend (only "all" feature records for totals)
    const dailyTrend = dailyRecords
      .filter((r) => r.feature === "all")
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({
        date: r.date,
        requests: r.requestCount,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        cost: Math.round(r.estimatedCostUsd * 10000) / 10000,
        visionRequests: r.visionRequests,
        fallbackRequests: r.fallbackRequests,
        uniqueUsers: r.uniqueUsers,
        fallbackRate: r.requestCount > 0 ? Math.round((r.fallbackRequests / r.requestCount) * 100) : 0,
      }));

    // Feature breakdown from daily records
    const featureBreakdown: Record<string, { requests: number; cost: number; tokens: number }> = {};
    for (const record of dailyRecords) {
      if (record.feature === "all") continue;
      if (!featureBreakdown[record.feature]) {
        featureBreakdown[record.feature] = { requests: 0, cost: 0, tokens: 0 };
      }
      featureBreakdown[record.feature].requests += record.requestCount;
      featureBreakdown[record.feature].cost += record.estimatedCostUsd;
      featureBreakdown[record.feature].tokens += record.inputTokens + record.outputTokens;
    }

    // Calculate averages and projections
    const totalDays = dailyTrend.length || 1;
    const totalRequests = dailyTrend.reduce((s, d) => s + d.requests, 0);
    const totalCost = dailyTrend.reduce((s, d) => s + d.cost, 0);
    const avgRequestsPerDay = Math.round(totalRequests / totalDays);
    const avgCostPerDay = totalCost / totalDays;
    const avgUsersPerDay = dailyTrend.length > 0
      ? Math.round(dailyTrend.reduce((s, d) => s + d.uniqueUsers, 0) / totalDays)
      : 0;
    const costPerUser = avgUsersPerDay > 0 ? avgCostPerDay / avgUsersPerDay : 0;

    // Calculate growth rate from first half vs second half of period
    const midpoint = Math.floor(totalDays / 2);
    const firstHalf = dailyTrend.slice(0, midpoint);
    const secondHalf = dailyTrend.slice(midpoint);
    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((s, d) => s + d.requests, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((s, d) => s + d.requests, 0) / secondHalf.length : 0;
    const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    // User growth rate (from users table)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
    const recentUsers = await ctx.db
      .query("users")
      .withIndex("by_created", (q) => q.gte("createdAt", thirtyDaysAgo))
      .collect();
    const priorUsers = await ctx.db
      .query("users")
      .withIndex("by_created", (q) => q.gte("createdAt", sixtyDaysAgo))
      .filter((q) => q.lt(q.field("createdAt"), thirtyDaysAgo))
      .collect();
    const userGrowthRate = priorUsers.length > 0
      ? ((recentUsers.length - priorUsers.length) / priorUsers.length) * 100
      : 0;

    // Projections: days until Gemini free tier exceeded (1,000 RPD)
    const geminiDailyLimit = PROVIDER_LIMITS.gemini.requestsPerDay;
    let daysUntilLimit = null;
    if (avgRequestsPerDay > 0 && growthRate > 0) {
      const dailyGrowthFactor = 1 + growthRate / (100 * totalDays);
      if (dailyGrowthFactor > 1 && avgRequestsPerDay < geminiDailyLimit) {
        daysUntilLimit = Math.ceil(
          Math.log(geminiDailyLimit / avgRequestsPerDay) / Math.log(dailyGrowthFactor)
        );
      }
    } else if (avgRequestsPerDay >= geminiDailyLimit) {
      daysUntilLimit = 0;
    }

    // Cost projections at different user scales
    const currentTotalUsers = (await ctx.db.query("users").collect()).length;
    const projections = [
      { label: "Current", users: currentTotalUsers, monthlyCost: avgCostPerDay * 30 },
      { label: "2x Users", users: currentTotalUsers * 2, monthlyCost: avgCostPerDay * 30 * 2 },
      { label: "5x Users", users: currentTotalUsers * 5, monthlyCost: avgCostPerDay * 30 * 5 },
      { label: "10x Users", users: currentTotalUsers * 10, monthlyCost: avgCostPerDay * 30 * 10 },
    ].map((p) => ({
      ...p,
      monthlyCost: Math.round(p.monthlyCost * 100) / 100,
    }));

    // Scaling recommendation
    let recommendation = "You're well within free tier limits. No action needed.";
    if (avgRequestsPerDay > 950) {
      recommendation = "URGENT: Exceeding Gemini free tier (1,000 RPD). Enable billing immediately.";
    } else if (avgRequestsPerDay > 700) {
      recommendation = "Approaching Gemini free tier limit. Start planning paid tier migration.";
    } else if (daysUntilLimit !== null && daysUntilLimit < 30) {
      recommendation = `At current growth, you'll hit the Gemini free tier in ~${daysUntilLimit} days. Plan for Pay-as-you-go (~$${(avgCostPerDay * 30).toFixed(2)}/month).`;
    } else if (avgRequestsPerDay > 400) {
      recommendation = "Moderate usage. Monitor trends and plan for paid tier when approaching 700 RPD.";
    }

    // Fallback health
    const avgFallbackRate = dailyTrend.length > 0
      ? Math.round(dailyTrend.reduce((s, d) => s + d.fallbackRate, 0) / dailyTrend.length)
      : 0;
    let fallbackWarning = null;
    if (avgFallbackRate > 10) {
      fallbackWarning = `High fallback rate (${avgFallbackRate}%). Gemini is being throttled. Consider upgrading.`;
    } else if (avgFallbackRate > 5) {
      fallbackWarning = `Elevated fallback rate (${avgFallbackRate}%). Gemini may be experiencing rate limits.`;
    }

    return {
      dailyTrend,
      featureBreakdown,
      averages: {
        requestsPerDay: avgRequestsPerDay,
        costPerDay: Math.round(avgCostPerDay * 10000) / 10000,
        usersPerDay: avgUsersPerDay,
        costPerUser: Math.round(costPerUser * 10000) / 10000,
      },
      growth: {
        requestGrowthRate: Math.round(growthRate * 10) / 10,
        userGrowthRate: Math.round(userGrowthRate * 10) / 10,
      },
      projections,
      scaling: {
        geminiDailyLimit,
        daysUntilLimit,
        recommendation,
        fallbackWarning,
      },
      lookbackDays,
      computedAt: now,
    };
  },
});
