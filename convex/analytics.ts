import { internalMutation } from "./_generated/server";

/**
 * Compute daily platform metrics for admin dashboard
 *
 * Runs daily at 2am UTC via cron job
 * Precomputes expensive analytics to avoid full table scans
 */
export const computeDailyMetrics = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const today = new Date(now).toISOString().split("T")[0]; // "2025-02-25"

    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

    console.log(`[Analytics] Computing daily metrics for ${today}...`);

    // === USER METRICS ===
    const totalUsers = await ctx.db.query("users").collect().then(u => u.length); // count() not available in some versions, but at least we don't hold the whole array
    
    const newUsersToday = await ctx.db
      .query("users")
      .withIndex("by_created", q => q.gte("createdAt", oneDayAgo))
      .collect()
      .then(u => u.length);
      
    const newUsersThisWeek = await ctx.db
      .query("users")
      .withIndex("by_created", q => q.gte("createdAt", oneWeekAgo))
      .collect()
      .then(u => u.length);
      
    const newUsersThisMonth = await ctx.db
      .query("users")
      .withIndex("by_created", q => q.gte("createdAt", oneMonthAgo))
      .collect()
      .then(u => u.length);

    // Active users: created or updated a list in the last 7 days
    const recentActiveLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_updated", q => q.gte("updatedAt", oneWeekAgo))
      .collect();

    const activeUsersThisWeek = new Set(
      recentActiveLists.map((l) => l.userId.toString())
    ).size;

    // === LIST METRICS ===
    const totalLists = await ctx.db.query("shoppingLists").collect().then(l => l.length);
    
    const completedLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_status", q => q.eq("status", "completed"))
      .collect()
      .then(l => l.length);
      
    const listsCreatedToday = await ctx.db
      .query("shoppingLists")
      .withIndex("by_created", q => q.gte("createdAt", oneDayAgo))
      .collect()
      .then(l => l.length);

    // === RECEIPT METRICS ===
    const totalReceipts = await ctx.db.query("receipts").collect().then(r => r.length);
    
    const receiptsToday = await ctx.db
      .query("receipts")
      .withIndex("by_created", q => q.gte("createdAt", oneDayAgo))
      .collect()
      .then(r => r.length);
      
    const receiptsThisWeek = await ctx.db
      .query("receipts")
      .withIndex("by_created", q => q.gte("createdAt", oneWeekAgo))
      .collect()
      .then(r => r.length);
      
    const receiptsThisMonth = await ctx.db
      .query("receipts")
      .withIndex("by_created", q => q.gte("createdAt", oneMonthAgo))
      .collect()
      .then(r => r.length);

    // === GMV (Gross Merchandise Value) ===
    // For GMV we still need to collect and sum, but let's use indexed queries
    const allR = await ctx.db.query("receipts").withIndex("by_created").collect();
    const totalGMV = allR.reduce((sum, r) => sum + r.total, 0);
    
    const rToday = await ctx.db.query("receipts").withIndex("by_created", q => q.gte("createdAt", oneDayAgo)).collect();
    const gmvToday = rToday.reduce((sum, r) => sum + r.total, 0);
    
    const rWeek = await ctx.db.query("receipts").withIndex("by_created", q => q.gte("createdAt", oneWeekAgo)).collect();
    const gmvThisWeek = rWeek.reduce((sum, r) => sum + r.total, 0);
    
    const rMonth = await ctx.db.query("receipts").withIndex("by_created", q => q.gte("createdAt", oneMonthAgo)).collect();
    const gmvThisMonth = rMonth.reduce((sum, r) => sum + r.total, 0);
    
    const rYear = await ctx.db.query("receipts").withIndex("by_created", q => q.gte("createdAt", oneYearAgo)).collect();
    const gmvThisYear = rYear.reduce((sum, r) => sum + r.total, 0);

    // === STORE METRICS ===
    // Check if today's metrics already exist
    const existing = await ctx.db
      .query("platformMetrics")
      .withIndex("by_date", (q) => q.eq("date", today))
      .unique();

    const metrics = {
      date: today,
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      activeUsersThisWeek,
      totalLists,
      completedLists,
      listsCreatedToday,
      totalReceipts,
      receiptsToday,
      receiptsThisWeek,
      receiptsThisMonth,
      totalGMV: Math.round(totalGMV * 100) / 100,
      gmvToday: Math.round(gmvToday * 100) / 100,
      gmvThisWeek: Math.round(gmvThisWeek * 100) / 100,
      gmvThisMonth: Math.round(gmvThisMonth * 100) / 100,
      gmvThisYear: Math.round(gmvThisYear * 100) / 100,
      computedAt: now,
    };

    if (existing) {
      // Update existing metrics
      await ctx.db.patch(existing._id, metrics);
      console.log(`[Analytics] Updated metrics for ${today}`);
    } else {
      // Create new metrics record
      await ctx.db.insert("platformMetrics", metrics);
      console.log(`[Analytics] Created new metrics for ${today}`);
    }

    // Clean up old metrics (keep last 90 days)
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const oldMetrics = await ctx.db
      .query("platformMetrics")
      .withIndex("by_date")
      .filter((q) => q.lt(q.field("date"), ninetyDaysAgo))
      .collect();

    for (const old of oldMetrics) {
      await ctx.db.delete(old._id);
    }

    if (oldMetrics.length > 0) {
      console.log(`[Analytics] Deleted ${oldMetrics.length} old metric records`);
    }

    console.log(`[Analytics] ✅ Daily metrics computed successfully`);
    console.log(`[Analytics] Total Users: ${totalUsers}, New Today: ${newUsersToday}, Active (Week): ${activeUsersThisWeek}`);
    console.log(`[Analytics] Total GMV: £${metrics.totalGMV}, Today: £${metrics.gmvToday}`);

    return { success: true, date: today };
  },
});

/**
 * Aggregate yesterday's AI usage into aiUsageDaily for historical trends.
 * Runs daily at 1am UTC via cron job.
 */
export const aggregateAIUsageDaily = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
    const dateStr = yesterday.toISOString().split("T")[0];
    const dayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    console.log(`[AI Aggregation] Computing AI usage for ${dateStr}...`);

    // Check if already aggregated
    const existing = await ctx.db
      .query("aiUsageDaily")
      .withIndex("by_date", (q) => q.eq("date", dateStr))
      .collect();

    if (existing.length > 0) {
      console.log(`[AI Aggregation] Already aggregated for ${dateStr}, skipping`);
      return { success: true, date: dateStr, skipped: true };
    }

    // Get all aiUsage records that overlap with yesterday
    // Records are monthly, so we check if the period covers yesterday
    const monthStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1).getTime();
    const usageRecords = await ctx.db
      .query("aiUsage")
      .withIndex("by_period", (q) => q.eq("periodStart", monthStart))
      .collect();

    // Aggregate by feature
    const featureAgg: Record<string, {
      requestCount: number;
      inputTokens: number;
      outputTokens: number;
      estimatedCostUsd: number;
      visionRequests: number;
      fallbackRequests: number;
      userIds: Set<string>;
    }> = {};

    let totalRequests = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    let totalVision = 0;
    let totalFallback = 0;
    const allUserIds = new Set<string>();

    for (const record of usageRecords) {
      // Use daily delta fields for accurate per-day data (not monthly cumulative)
      // Records track which day their deltas belong to via dailyDate
      if (record.dailyDate !== dateStr) continue;

      const feature = record.feature;
      if (!featureAgg[feature]) {
        featureAgg[feature] = {
          requestCount: 0,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: 0,
          visionRequests: 0,
          fallbackRequests: 0,
          userIds: new Set(),
        };
      }

      const agg = featureAgg[feature];
      agg.requestCount += record.dailyRequestCount ?? 0;
      agg.inputTokens += record.dailyInputTokens ?? 0;
      agg.outputTokens += record.dailyOutputTokens ?? 0;
      agg.estimatedCostUsd += record.dailyCostUsd ?? 0;
      agg.visionRequests += record.dailyVisionRequests ?? 0;
      agg.fallbackRequests += record.dailyFallbackRequests ?? 0;
      agg.userIds.add(record.userId.toString());

      totalRequests += record.dailyRequestCount ?? 0;
      totalInputTokens += record.dailyInputTokens ?? 0;
      totalOutputTokens += record.dailyOutputTokens ?? 0;
      totalCost += record.dailyCostUsd ?? 0;
      totalVision += record.dailyVisionRequests ?? 0;
      totalFallback += record.dailyFallbackRequests ?? 0;
      allUserIds.add(record.userId.toString());
    }

    // Insert per-feature records
    for (const [feature, agg] of Object.entries(featureAgg)) {
      await ctx.db.insert("aiUsageDaily", {
        date: dateStr,
        feature,
        provider: "all",
        requestCount: agg.requestCount,
        inputTokens: agg.inputTokens,
        outputTokens: agg.outputTokens,
        estimatedCostUsd: agg.estimatedCostUsd,
        visionRequests: agg.visionRequests,
        fallbackRequests: agg.fallbackRequests,
        uniqueUsers: agg.userIds.size,
        computedAt: now,
      });
    }

    // Insert aggregate "all" record
    await ctx.db.insert("aiUsageDaily", {
      date: dateStr,
      feature: "all",
      provider: "all",
      requestCount: totalRequests,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      estimatedCostUsd: totalCost,
      visionRequests: totalVision,
      fallbackRequests: totalFallback,
      uniqueUsers: allUserIds.size,
      computedAt: now,
    });

    console.log(`[AI Aggregation] ✅ Aggregated ${dateStr}: ${totalRequests} requests, ${allUserIds.size} users, $${totalCost.toFixed(4)} est. cost`);

    return { success: true, date: dateStr, totalRequests, uniqueUsers: allUserIds.size };
  },
});
