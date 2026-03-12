import { v } from "convex/values";
import { query } from "../_generated/server";
import { api } from "../_generated/api";
import { 
  requirePermissionQuery, 
  getCachedOrCompute, 
  measureQueryPerformance,
  QueryCtx 
} from "./helpers";

export const getReceiptImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_receipts");
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getAnalytics = query({
  args: { refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    if (!args.dateFrom && !args.dateTo) {
      const today = new Date().toISOString().split("T")[0];
      let metrics = await ctx.db.query("platformMetrics").withIndex("by_date", q => q.eq("date", today)).unique();
      
      if (!metrics) {
        metrics = await ctx.db.query("platformMetrics").order("desc").first();
      }
      
      if (metrics) {
        return {
          totalUsers: metrics.totalUsers,
          newUsersThisWeek: metrics.newUsersThisWeek,
          newUsersThisMonth: metrics.newUsersThisMonth,
          activeUsersThisWeek: metrics.activeUsersThisWeek,
          totalLists: metrics.totalLists,
          completedLists: metrics.completedLists,
          totalReceipts: metrics.totalReceipts,
          receiptsThisWeek: metrics.receiptsThisWeek,
          receiptsThisMonth: metrics.receiptsThisMonth,
          totalGMV: metrics.totalGMV,
          gmvThisWeek: metrics.gmvThisWeek,
          gmvThisMonth: metrics.gmvThisMonth,
          gmvThisYear: metrics.gmvThisYear || 0,
          computedAt: metrics.computedAt,
          isPrecomputed: true,
        };
      }
    }

    return getLiveAnalytics(ctx, args.dateFrom, args.dateTo);
  },
});

async function getLiveAnalytics(ctx: QueryCtx, dateFrom?: number, dateTo?: number) {
  const cacheKey = `live_analytics_${dateFrom || 0}_${dateTo || 0}`;
  return await getCachedOrCompute(cacheKey, 5 * 60 * 1000, async () => {
    return measureQueryPerformance("getLiveAnalytics", async () => {
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      const yearAgo = now - 365 * 24 * 60 * 60 * 1000;
      
      const usersQuery = dateFrom 
        ? ctx.db.query("users").withIndex("by_created", (q: any) => q.gte("createdAt", dateFrom))
        : ctx.db.query("users").withIndex("by_created");
        
      const listsQuery = dateFrom
        ? ctx.db.query("shoppingLists").withIndex("by_created", (q: any) => q.gte("createdAt", dateFrom))
        : ctx.db.query("shoppingLists").withIndex("by_created");
      
      const receiptsQuery = dateFrom
        ? ctx.db.query("receipts").withIndex("by_created", (q: any) => q.gte("createdAt", dateFrom))
        : ctx.db.query("receipts").withIndex("by_created");

      let u = await usersQuery.collect();
      let l = await listsQuery.collect();
      let r = await receiptsQuery.collect();

      if (dateTo) {
        u = u.filter((x: any) => x.createdAt <= dateTo);
        l = l.filter((x: any) => x.createdAt <= dateTo);
        r = r.filter((x: any) => x.createdAt <= dateTo);
      }

      const computeGMV = (receipts: any[]) => Math.round(receipts.reduce((s: number, x: any) => s + (x.total || 0), 0) * 100) / 100;

      return {
        totalUsers: u.length,
        newUsersThisWeek: u.filter((x: any) => x.createdAt >= weekAgo).length,
        newUsersThisMonth: u.filter((x: any) => x.createdAt >= monthAgo).length,
        activeUsersThisWeek: new Set(l.filter((x: any) => x.updatedAt >= weekAgo).map((x: any) => x.userId.toString())).size,
        totalLists: l.length,
        completedLists: l.filter((x: any) => x.status === "completed").length,
        totalReceipts: r.length,
        receiptsThisWeek: r.filter((x: any) => x.createdAt >= weekAgo).length,
        receiptsThisMonth: r.filter((x: any) => x.createdAt >= monthAgo).length,
        totalGMV: computeGMV(r),
        gmvThisWeek: computeGMV(r.filter((x: any) => x.createdAt >= weekAgo)),
        gmvThisMonth: computeGMV(r.filter((x: any) => x.createdAt >= monthAgo)),
        gmvThisYear: computeGMV(r.filter((x: any) => x.createdAt >= yearAgo)),
        computedAt: now,
        isPrecomputed: false,
      };
    });
  });
}

export const getPlatformAIUsage = query({
  args: { refreshKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics");

    const now = Date.now();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    const cacheKey = `platform_ai_usage_${monthStart}`;
    return await getCachedOrCompute(cacheKey, 30 * 60 * 1000, async () => {
      const usageRecords = await ctx.db
        .query("aiUsage")
        .filter((q) => q.gte(q.field("periodStart"), monthStart))
        .collect();

      const summary: Record<string, { requests: number; tokens: number }> = {
        voice: { requests: 0, tokens: 0 },
        price_estimate: { requests: 0, tokens: 0 },
        list_suggestions: { requests: 0, tokens: 0 },
        item_variants: { requests: 0, tokens: 0 },
        pantry_seed: { requests: 0, tokens: 0 },
      };

      let totalRequests = 0;
      let totalTokens = 0;

      for (const record of usageRecords) {
        if (!summary[record.feature]) {
          summary[record.feature] = { requests: 0, tokens: 0 };
        }
        summary[record.feature].requests += record.requestCount;
        summary[record.feature].tokens += (record.tokenCount ?? 0);
        totalRequests += record.requestCount;
        totalTokens += (record.tokenCount ?? 0);
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
        activeProvider: "Gemini 2.0 Flash",
        alert,
        computedAt: now,
      };
    });
  },
});

export const getRevenueReport = query({
  args: { refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics");

    const cacheKey = `revenue_report_${args.dateFrom || 0}_${args.dateTo || 0}`;
    return await getCachedOrCompute(cacheKey, 5 * 60 * 1000, async () => {
      const monthlyPricing = await ctx.db
        .query("pricingConfig")
        .withIndex("by_plan", (q) => q.eq("planId", "premium_monthly"))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      const annualPricing = await ctx.db
        .query("pricingConfig")
        .withIndex("by_plan", (q) => q.eq("planId", "premium_annual"))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      const monthlyPrice = monthlyPricing?.priceAmount || 0;
      const annualPrice = annualPricing?.priceAmount || 0;

      const subsQuery = args.dateFrom 
        ? ctx.db.query("subscriptions").withIndex("by_created", q => q.gte("createdAt", args.dateFrom!))
        : ctx.db.query("subscriptions").withIndex("by_created");
        
      let subs = await subsQuery.collect();
      if (args.dateTo) subs = subs.filter(s => s.createdAt <= args.dateTo!);

      const activeSubs = subs.filter((s: any) => s.status === "active");
      const monthlyCount = activeSubs.filter((s: any) => s.plan === "premium_monthly").length;
      const annualCount = activeSubs.filter((s: any) => s.plan === "premium_annual").length;
      const trialsActive = subs.filter((s: any) => s.status === "trial").length;

      const mrr = monthlyCount * monthlyPrice + (annualCount * annualPrice) / 12;
      const arr = mrr * 12;

      return {
        totalSubscriptions: subs.length,
        activeSubscriptions: activeSubs.length,
        monthlySubscribers: monthlyCount,
        annualSubscribers: annualCount,
        trialsActive,
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
      };
    });
  },
});

export const getFinancialReport = query({
  args: { 
    refreshKey: v.optional(v.string()),
    dateFrom: v.optional(v.number()), 
    dateTo: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    // @ts-ignore
    const rev: any = await ctx.runQuery(api.admin.getRevenueReport, args);

    const grossRevenue: number = rev?.mrr || 0;
    const estimatedTax: number = grossRevenue * 0.20; // 20% VAT

    const analytics: any = await ctx.runQuery(api.admin.getAnalytics, {});
    const activeUsers: number = analytics?.activeUsersThisWeek || 0;
    const estimatedCOGS: number = activeUsers * 0.50;
    
    const netRevenue: number = grossRevenue - estimatedTax - estimatedCOGS;
    
    return {
      grossRevenue,
      estimatedTax,
      estimatedCOGS,
      netRevenue,
      margin: grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0,
    };
  },
});

export const getCohortMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db.query("cohortMetrics").order("desc").take(100);
  },
});

export const getFunnelAnalytics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    const steps = ["signup", "onboarding_complete", "first_list", "first_receipt", "first_scan", "subscribed"];
    const funnel: { step: string; count: number; percentage: number }[] = [];
    const allEvents = await ctx.db.query("funnelEvents").order("desc").take(10000);
    
    let baseCount = 0;
    for (const step of steps) {
      const uniqueUsers = new Set(
        allEvents
          .filter(e => e.eventName === step)
          .map(e => e.userId.toString())
      ).size;
      
      if (step === "signup") baseCount = uniqueUsers;
      
      funnel.push({
        step,
        count: uniqueUsers,
        percentage: baseCount > 0 ? (uniqueUsers / baseCount) * 100 : 0,
      });
    }
    
    return funnel;
  },
});

export const getChurnMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db.query("churnMetrics").order("desc").take(100);
  },
});

export const getLTVMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db.query("ltvMetrics").order("desc").take(100);
  },
});

export const getUserSegmentSummary = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    const segments = await ctx.db.query("userSegments").take(5000);
    
    const summary: Record<string, number> = {};
    for (const s of segments) {
      summary[s.segment] = (summary[s.segment] || 0) + 1;
    }
    
    return Object.entries(summary).map(([name, count]) => ({
      name,
      count,
      percentage: segments.length > 0 ? (count / segments.length) * 100 : 0,
    }));
  },
});

export const getPointsEconomics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");

    const balances = await ctx.db.query("pointsBalance").collect();
    
    const totalPointsIssued = balances.reduce((sum, b) => sum + (b.totalPoints || 0), 0);
    const totalPointsRedeemed = balances.reduce((sum, b) => sum + (b.pointsUsed || 0), 0);
    const totalPointsOutstanding = balances.reduce((sum, b) => sum + (b.availablePoints || 0), 0);
    
    const liabilityGBP = totalPointsOutstanding / 1000;

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentTxns = await ctx.db
      .query("pointsTransactions")
      .withIndex("by_created", (q) => q.gte("createdAt", thirtyDaysAgo))
      .collect();

    const pointsEarned30d = recentTxns
      .filter(t => t.type === "earn" || t.type === "bonus")
      .reduce((sum, t) => sum + t.amount, 0);
      
    const pointsRedeemed30d = Math.abs(recentTxns
      .filter(t => t.type === "redeem")
      .reduce((sum, t) => sum + t.amount, 0));

    const earnDistribution: Record<string, number> = {};
    recentTxns.filter(t => t.type === "earn" || t.type === "bonus").forEach(t => {
      const source = t.source || "unknown";
      earnDistribution[source] = (earnDistribution[source] || 0) + t.amount;
    });

    return {
      totalPointsIssued,
      totalPointsRedeemed,
      totalPointsOutstanding,
      liabilityGBP,
      pointsEarned30d,
      pointsRedeemed30d,
      earnDistribution,
      userCount: balances.length,
      avgBalance: balances.length > 0 ? totalPointsOutstanding / balances.length : 0,
      updatedAt: Date.now(),
    };
  },
});

export const getAdminSupportSummary = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    const [open, inProgress, resolved] = await Promise.all([
      ctx.db.query("supportTickets").withIndex("by_status", q => q.eq("status", "open")).collect().then(res => res.length),
      ctx.db.query("supportTickets").withIndex("by_status", q => q.eq("status", "in_progress")).collect().then(res => res.length),
      ctx.db.query("supportTickets").withIndex("by_status", q => q.eq("status", "resolved")).collect().then(res => res.length),
    ]);
    
    const unassigned = await ctx.db
      .query("supportTickets")
      .withIndex("by_assigned", q => q.eq("assignedTo", undefined as any))
      .filter(q => q.neq(q.field("status"), "resolved"))
      .collect()
      .then(res => res.length);
    
    return {
      total: open + inProgress + resolved,
      open,
      inProgress,
      resolved,
      unassigned,
    };
  },
});

export const getAdminTickets = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    let ticketsQuery;
    if (args.status) {
      ticketsQuery = ctx.db
        .query("supportTickets")
        .withIndex("by_status", (q) => q.eq("status", args.status as any));
    } else {
      ticketsQuery = ctx.db.query("supportTickets");
    }
    
    const tickets = await ticketsQuery.order("desc").take(100);
    
    const userIds = [...new Set(tickets.map(t => t.userId))];
    const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
    const userMap = new Map(users.filter(u => u).map(u => [u!._id, u!]));

    return tickets.map((t) => {
      const u = userMap.get(t.userId);
      return {
        ...t,
        userName: u?.name || "Unknown",
        userEmail: u?.email || "",
      };
    });
  },
});
