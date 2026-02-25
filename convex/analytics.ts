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

    console.log(`[Analytics] Computing daily metrics for ${today}...`);

    // === USER METRICS ===
    const allUsers = await ctx.db.query("users").collect();
    const totalUsers = allUsers.length;
    const newUsersToday = allUsers.filter((u) => u.createdAt >= oneDayAgo).length;
    const newUsersThisWeek = allUsers.filter((u) => u.createdAt >= oneWeekAgo).length;
    const newUsersThisMonth = allUsers.filter((u) => u.createdAt >= oneMonthAgo).length;

    // Active users: created or updated a list in the last 7 days
    const recentLists = await ctx.db
      .query("shoppingLists")
      .order("desc")
      .take(10000); // Limit for performance

    const activeUsersThisWeek = new Set(
      recentLists
        .filter((l) => l.updatedAt >= oneWeekAgo)
        .map((l) => l.userId.toString())
    ).size;

    // === LIST METRICS ===
    const allLists = await ctx.db.query("shoppingLists").collect();
    const totalLists = allLists.length;
    const completedLists = allLists.filter((l) => l.status === "completed").length;
    const listsCreatedToday = allLists.filter((l) => l.createdAt >= oneDayAgo).length;

    // === RECEIPT METRICS ===
    const allReceipts = await ctx.db.query("receipts").collect();
    const totalReceipts = allReceipts.length;
    const receiptsToday = allReceipts.filter((r) => r.createdAt >= oneDayAgo).length;
    const receiptsThisWeek = allReceipts.filter((r) => r.createdAt >= oneWeekAgo).length;
    const receiptsThisMonth = allReceipts.filter((r) => r.createdAt >= oneMonthAgo).length;

    // === GMV (Gross Merchandise Value) ===
    const totalGMV = allReceipts.reduce((sum, r) => sum + r.total, 0);
    const gmvToday = allReceipts
      .filter((r) => r.createdAt >= oneDayAgo)
      .reduce((sum, r) => sum + r.total, 0);
    const gmvThisWeek = allReceipts
      .filter((r) => r.createdAt >= oneWeekAgo)
      .reduce((sum, r) => sum + r.total, 0);
    const gmvThisMonth = allReceipts
      .filter((r) => r.createdAt >= oneMonthAgo)
      .reduce((sum, r) => sum + r.total, 0);

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
