import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Compute cohort retention metrics
 * Runs weekly via cron
 */
export const computeCohortRetention = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Get all users
    const allUsers = await ctx.db.query("users").collect();
    
    // Group users by signup month (cohort)
    const cohorts: Record<string, Id<"users">[]> = {};
    for (const user of allUsers) {
      const date = new Date(user.createdAt);
      const cohortMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!cohorts[cohortMonth]) cohorts[cohortMonth] = [];
      cohorts[cohortMonth].push(user._id);
    }
    
    // For each cohort, calculate retention at different intervals
    for (const [month, userIds] of Object.entries(cohorts)) {
      const cohortSignupCount = userIds.length;
      
      // Calculate retention at Day 7, 14, 30, 60, 90
      const calculateRetention = (days: number) => {
        const threshold = days * oneDayMs;
        let retainedCount = 0;
        
        for (const userId of userIds) {
          const user = allUsers.find(u => u._id === userId);
          if (!user || !user.lastActiveAt) continue;
          
          // User is "retained" if they were active AT OR AFTER 'days' since their signup
          const activeAfterSignup = user.lastActiveAt - user.createdAt;
          if (activeAfterSignup >= threshold) {
            retainedCount++;
          }
        }
        
        return cohortSignupCount > 0 ? (retainedCount / cohortSignupCount) * 100 : 0;
      };
      
      const metrics = {
        cohortMonth: month,
        totalUsers: cohortSignupCount,
        retentionDay7: calculateRetention(7),
        retentionDay14: calculateRetention(14),
        retentionDay30: calculateRetention(30),
        retentionDay60: calculateRetention(60),
        retentionDay90: calculateRetention(90),
        computedAt: now,
      };
      
      // Upsert into cohortMetrics
      const existing = await ctx.db
        .query("cohortMetrics")
        .withIndex("by_cohort", (q) => q.eq("cohortMonth", month))
        .unique();
        
      if (existing) {
        await ctx.db.patch(existing._id, metrics);
      } else {
        await ctx.db.insert("cohortMetrics", metrics);
      }
    }
    
    return { success: true, cohortsProcessed: Object.keys(cohorts).length };
  },
});

/**
 * Compute churn metrics
 * Runs monthly via cron
 */
export const computeChurnMetrics = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    
    // Get all users
    const allUsers = await ctx.db.query("users").collect();
    
    // Define active users (active in last 30 days)
    const activeThreshold = now - thirtyDaysMs;
    const atRiskThreshold = now - fourteenDaysMs;
    
    const activeUsers = allUsers.filter(u => (u.lastActiveAt ?? 0) >= activeThreshold);
    const atRiskUsers = allUsers.filter(u => 
      (u.lastActiveAt ?? 0) < atRiskThreshold && (u.lastActiveAt ?? 0) >= activeThreshold
    );
    const churnedUsers = allUsers.filter(u => 
      u.lastActiveAt && u.lastActiveAt < activeThreshold
    );
    
    // In a real scenario, we'd compare with the previous month's metrics
    // For now, we'll just compute the current state
    const metrics = {
      month: currentMonth,
      totalActiveStart: allUsers.length, // Fallback
      totalActiveEnd: activeUsers.length,
      churnedUsers: churnedUsers.length,
      churnRate: allUsers.length > 0 ? (churnedUsers.length / allUsers.length) * 100 : 0,
      reactivatedUsers: 0, // Would need historical data to compute properly
      atRiskCount: atRiskUsers.length,
      computedAt: now,
    };
    
    const existing = await ctx.db
      .query("churnMetrics")
      .withIndex("by_month", (q) => q.eq("month", currentMonth))
      .unique();
      
    if (existing) {
      await ctx.db.patch(existing._id, metrics);
    } else {
      await ctx.db.insert("churnMetrics", metrics);
    }
    
    return metrics;
  },
});

/**
 * Compute LTV metrics by cohort
 * Runs monthly via cron
 */
export const computeLTVMetrics = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get all users and subscriptions
    const allUsers = await ctx.db.query("users").collect();
    const allSubs = await ctx.db.query("subscriptions").collect();
    
    // Group users by signup month
    const cohorts: Record<string, Id<"users">[]> = {};
    for (const user of allUsers) {
      const date = new Date(user.createdAt);
      const cohortMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!cohorts[cohortMonth]) cohorts[cohortMonth] = [];
      cohorts[cohortMonth].push(user._id);
    }
    
    for (const [month, userIds] of Object.entries(cohorts)) {
      let totalRevenue = 0;
      let paidUserCount = 0;
      
      for (const userId of userIds) {
        const sub = allSubs.find(s => s.userId === userId);
        if (!sub || sub.status === "trial") continue;
        
        // Estimate revenue based on plan and how long they've been subscribed
        // Since we don't have a payments table, we'll estimate:
        // Premium Monthly: £2.99/mo
        // Premium Annual: £21.99/yr
        
        const subDurationMonths = Math.max(1, Math.ceil((now - sub.createdAt) / (30 * 24 * 60 * 60 * 1000)));
        
        if (sub.plan === "premium_monthly") {
          totalRevenue += subDurationMonths * 2.99;
          paidUserCount++;
        } else if (sub.plan === "premium_annual") {
          const subDurationYears = Math.max(1, Math.ceil((now - sub.createdAt) / (365 * 24 * 60 * 60 * 1000)));
          totalRevenue += subDurationYears * 21.99;
          paidUserCount++;
        }
      }
      
      const metrics = {
        cohortMonth: month,
        avgLTV: userIds.length > 0 ? totalRevenue / userIds.length : 0,
        avgRevenuePerUser: userIds.length > 0 ? totalRevenue / userIds.length : 0,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        paidUsers: paidUserCount,
        conversionRate: userIds.length > 0 ? (paidUserCount / userIds.length) * 100 : 0,
        computedAt: now,
      };
      
      const existing = await ctx.db
        .query("ltvMetrics")
        .withIndex("by_cohort", (q) => q.eq("cohortMonth", month))
        .unique();
        
      if (existing) {
        await ctx.db.patch(existing._id, metrics);
      } else {
        await ctx.db.insert("ltvMetrics", metrics);
      }
    }
    
    return { success: true, cohortsProcessed: Object.keys(cohorts).length };
  },
});

/**
 * Segment users based on behavior
 * Runs daily via cron
 */
export const computeUserSegments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    
    const allUsers = await ctx.db.query("users").collect();
    const allSubs = await ctx.db.query("subscriptions").collect();
    
    let segmentsProcessed = 0;
    
    for (const user of allUsers) {
      let segment = "new_user";
      const daysSinceSignup = (now - user.createdAt) / (24 * 60 * 60 * 1000);
      const daysSinceActive = (now - (user.lastActiveAt ?? 0)) / (24 * 60 * 60 * 1000);
      
      const sub = allSubs.find(s => s.userId === user._id);
      
      // Logic for segmentation
      if (daysSinceActive > 60) {
        segment = "dormant";
      } else if (daysSinceActive > 30) {
        segment = "churned";
      } else if (daysSinceActive > 14) {
        segment = "at_risk";
      } else if (user.sessionCount && user.sessionCount > 20 && daysSinceActive < 3) {
        segment = "power_user";
      } else if (sub?.status === "trial" && sub.trialEndsAt && (sub.trialEndsAt - now) < (3 * 24 * 60 * 60 * 1000)) {
        segment = "trial_ending";
      } else if (daysSinceSignup < 7) {
        segment = "new_user";
      } else {
        segment = "active_user";
      }
      
      // Update user segment
      const existing = await ctx.db
        .query("userSegments")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first(); // Just get the latest one
        
      if (existing) {
        if (existing.segment !== segment) {
          await ctx.db.patch(existing._id, {
            segment,
            assignedAt: now,
          });
        }
      } else {
        await ctx.db.insert("userSegments", {
          userId: user._id,
          segment,
          assignedAt: now,
        });
      }
      segmentsProcessed++;
    }
    
    return { success: true, segmentsProcessed };
  },
});
