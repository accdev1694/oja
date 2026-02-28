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
