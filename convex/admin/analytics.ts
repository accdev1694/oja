import { v } from "convex/values";
import { query } from "../_generated/server";
import {
  requirePermissionQuery,
  measureQueryPerformance,
  QueryCtx
} from "./helpers";

async function computeRevenueReport(
  ctx: QueryCtx,
  dateFrom?: number,
  dateTo?: number
) {
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

  const subsQuery = dateFrom
    ? ctx.db.query("subscriptions").withIndex("by_created", q => q.gte("createdAt", dateFrom))
    : ctx.db.query("subscriptions").withIndex("by_created");

  // C4 fix: Add limit to prevent full table scan
  let subs = await subsQuery.take(10000);
  if (dateTo) subs = subs.filter(s => s.createdAt <= dateTo);

  const activeSubs = subs.filter(s => s.status === "active");
  const monthlyCount = activeSubs.filter(s => s.plan === "premium_monthly").length;
  const annualCount = activeSubs.filter(s => s.plan === "premium_annual").length;
  const trialsActive = subs.filter(s => s.status === "trial").length;

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
}

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
        metrics = await ctx.db.query("platformMetrics").withIndex("by_date").order("desc").first();
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
  return await measureQueryPerformance("getLiveAnalytics", async () => {
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      const yearAgo = now - 365 * 24 * 60 * 60 * 1000;
      
      const usersQuery = dateFrom
        ? ctx.db.query("users").withIndex("by_created", q => q.gte("createdAt", dateFrom))
        : ctx.db.query("users").withIndex("by_created");

      const listsQuery = dateFrom
        ? ctx.db.query("shoppingLists").withIndex("by_created", q => q.gte("createdAt", dateFrom))
        : ctx.db.query("shoppingLists").withIndex("by_created");

      const receiptsQuery = dateFrom
        ? ctx.db.query("receipts").withIndex("by_created", q => q.gte("createdAt", dateFrom))
        : ctx.db.query("receipts").withIndex("by_created");

      // C3 fix: Add .take() limits to prevent unbounded memory usage
      const LIVE_LIMIT = 50000;
      let u = await usersQuery.take(LIVE_LIMIT);
      let l = await listsQuery.take(LIVE_LIMIT);
      let r = await receiptsQuery.take(LIVE_LIMIT);

      if (dateTo) {
        u = u.filter(x => x.createdAt <= dateTo);
        l = l.filter(x => x.createdAt <= dateTo);
        r = r.filter(x => x.createdAt <= dateTo);
      }

      const computeGMV = (receipts: typeof r) => Math.round(receipts.reduce((s, x) => s + (x.total || 0), 0) * 100) / 100;

      return {
        totalUsers: u.length,
        newUsersThisWeek: u.filter(x => x.createdAt >= weekAgo).length,
        newUsersThisMonth: u.filter(x => x.createdAt >= monthAgo).length,
        activeUsersThisWeek: await ctx.db.query("activityEvents")
          .withIndex("by_timestamp", q => q.gte("timestamp", weekAgo))
          .take(50000)
          .then(events => new Set(events.map(e => e.userId.toString())).size),
        totalLists: l.length,
        completedLists: l.filter(x => x.status === "completed").length,
        totalReceipts: r.length,
        receiptsThisWeek: r.filter(x => x.createdAt >= weekAgo).length,
        receiptsThisMonth: r.filter(x => x.createdAt >= monthAgo).length,
        totalGMV: computeGMV(r),
        gmvThisWeek: computeGMV(r.filter(x => x.createdAt >= weekAgo)),
        gmvThisMonth: computeGMV(r.filter(x => x.createdAt >= monthAgo)),
        gmvThisYear: computeGMV(r.filter(x => x.createdAt >= yearAgo)),
        computedAt: now,
        isPrecomputed: false,
      };
    });
}

export const getRevenueReport = query({
  args: { refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics");

    return await computeRevenueReport(ctx, args.dateFrom, args.dateTo);
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

    const rev = await computeRevenueReport(ctx, args.dateFrom, args.dateTo);

    const grossRevenue: number = rev?.mrr || 0;
    const estimatedTax: number = grossRevenue * 0.20; // 20% VAT

    // L2 fix: Query only activeUsersThisWeek instead of full getLiveAnalytics (avoids 3 extra large fetches)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentActivity = await ctx.db.query("activityEvents")
      .withIndex("by_timestamp", q => q.gte("timestamp", weekAgo))
      .take(50000);
    const activeUsers = new Set(recentActivity.map(e => e.userId.toString())).size;
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
    return await ctx.db.query("cohortMetrics").withIndex("by_cohort").order("desc").take(100);
  },
});

export const getFunnelAnalytics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    // M2 fix: Query per step using by_event index instead of loading 10K records
    const steps = ["signup", "onboarding_complete", "first_list", "first_receipt", "first_scan", "subscribed"];
    const funnel: { step: string; count: number; percentage: number; stepConversion: number }[] = [];

    // Parallel fetch per step using proper index
    const stepResults = await Promise.all(
      steps.map(step =>
        ctx.db.query("funnelEvents")
          .withIndex("by_event", q => q.eq("eventName", step))
          .take(50000)
          .then(events => ({
            step,
            uniqueUsers: new Set(events.map(e => e.userId.toString())).size,
          }))
      )
    );

    let baseCount = 0;
    let previousCount = 0;
    for (const { step, uniqueUsers } of stepResults) {
      if (step === "signup") {
        baseCount = uniqueUsers;
        previousCount = uniqueUsers;
      }

      funnel.push({
        step,
        count: uniqueUsers,
        percentage: baseCount > 0 ? (uniqueUsers / baseCount) * 100 : 0,
        stepConversion: previousCount > 0 ? (uniqueUsers / previousCount) * 100 : 0,
      });
      previousCount = uniqueUsers;
    }

    return funnel;
  },
});

export const getChurnMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db.query("churnMetrics").withIndex("by_month").order("desc").take(100);
  },
});

export const getLTVMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db.query("ltvMetrics").withIndex("by_cohort").order("desc").take(100);
  },
});

export const getUserSegmentSummary = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    const segments = await ctx.db.query("userSegments").withIndex("by_segment").take(5000);
    
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

    // H2 fix: Limit to prevent loading all 50K+ balances into memory
    const balances = await ctx.db.query("pointsBalance").withIndex("by_tier").take(10000);
    
    const totalPointsIssued = balances.reduce((sum, b) => sum + (b.totalPoints || 0), 0);
    const totalPointsRedeemed = balances.reduce((sum, b) => sum + (b.pointsUsed || 0), 0);
    const totalPointsOutstanding = balances.reduce((sum, b) => sum + (b.availablePoints || 0), 0);
    
    const liabilityGBP = totalPointsOutstanding / 1000;

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    // H3 audit fix: Add .take() to prevent unbounded memory usage
    const recentTxns = await ctx.db
      .query("pointsTransactions")
      .withIndex("by_created", (q) => q.gte("createdAt", thirtyDaysAgo))
      .take(50000);

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
    
    // H4 audit fix: Add .take() limits to prevent full table scans
    const [open, inProgress, resolved] = await Promise.all([
      ctx.db.query("supportTickets").withIndex("by_status", q => q.eq("status", "open")).take(10000).then(res => res.length),
      ctx.db.query("supportTickets").withIndex("by_status", q => q.eq("status", "in_progress")).take(10000).then(res => res.length),
      ctx.db.query("supportTickets").withIndex("by_status", q => q.eq("status", "resolved")).take(10000).then(res => res.length),
    ]);

    const unassignedTickets = await ctx.db
      .query("supportTickets")
      .filter(q => q.and(q.eq(q.field("assignedTo"), undefined), q.neq(q.field("status"), "resolved")))
      .take(10000);
    const unassigned = unassignedTickets.length;
    
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
      const status = args.status as "open" | "in_progress" | "resolved";
      ticketsQuery = ctx.db
        .query("supportTickets")
        .withIndex("by_status", q => q.eq("status", status));
    } else {
      ticketsQuery = ctx.db.query("supportTickets").withIndex("by_status");
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
