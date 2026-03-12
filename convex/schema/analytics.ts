import { defineTable } from "convex/server";
import { v } from "convex/values";

export const analyticsTables = {
  // Precomputed platform metrics (Phase 1 Performance Optimization)
  // Updated daily by cron job to avoid full table scans in getAnalytics
  platformMetrics: defineTable({
    date: v.string(), // "2025-02-25" (ISO date for easy querying)

    // User metrics
    totalUsers: v.number(),
    newUsersToday: v.number(),
    newUsersThisWeek: v.number(),
    newUsersThisMonth: v.number(),
    activeUsersThisWeek: v.number(),

    // List metrics
    totalLists: v.number(),
    completedLists: v.number(),
    listsCreatedToday: v.number(),

    // Receipt metrics
    totalReceipts: v.number(),
    receiptsToday: v.number(),
    receiptsThisWeek: v.number(),
    receiptsThisMonth: v.number(),

    // GMV (Gross Merchandise Value)
    totalGMV: v.number(),
    gmvToday: v.number(),
    gmvThisWeek: v.number(),
    gmvThisMonth: v.number(),
    gmvThisYear: v.optional(v.number()), // Optional for backward compatibility with existing records

    computedAt: v.number(), // Timestamp when metrics were computed
  })
    .index("by_date", ["date"]),

  // Cohort retention metrics - computed weekly
  cohortMetrics: defineTable({
    cohortMonth: v.string(), // "2025-01" format
    totalUsers: v.number(), // Users who signed up that month
    retentionDay7: v.number(), // % still active after 7 days
    retentionDay14: v.number(),
    retentionDay30: v.number(),
    retentionDay60: v.number(),
    retentionDay90: v.number(),
    computedAt: v.number(),
  })
    .index("by_cohort", ["cohortMonth"]),

  // Funnel events - track user journey milestones
  funnelEvents: defineTable({
    userId: v.id("users"),
    eventName: v.string(), // signup, onboarding_complete, first_list, first_receipt, first_scan, subscribed
    eventData: v.optional(v.any()), // Additional context
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventName"])
    .index("by_event_date", ["eventName", "createdAt"]),

  // Churn metrics - computed monthly
  churnMetrics: defineTable({
    month: v.string(), // "2025-02" format
    totalActiveStart: v.number(), // Active users at month start
    totalActiveEnd: v.number(), // Active users at month end
    churnedUsers: v.number(), // Users who became inactive
    churnRate: v.number(), // Percentage
    reactivatedUsers: v.number(), // Previously churned who came back
    atRiskCount: v.number(), // No activity 14-30 days
    computedAt: v.number(),
  })
    .index("by_month", ["month"]),

  // LTV metrics by cohort
  ltvMetrics: defineTable({
    cohortMonth: v.string(), // "2025-01" format
    avgLTV: v.number(), // Average lifetime value in £
    avgRevenuePerUser: v.number(), // ARPU
    totalRevenue: v.number(), // Sum of all revenue from cohort
    paidUsers: v.number(), // Users who ever paid
    conversionRate: v.number(), // % who converted to paid
    computedAt: v.number(),
  })
    .index("by_cohort", ["cohortMonth"]),

  // User segments - computed daily
  userSegments: defineTable({
    userId: v.id("users"),
    segment: v.string(), // power_user, at_risk, dormant, new_user, trial_ending, churned
    assignedAt: v.number(),
    expiresAt: v.optional(v.number()), // For time-limited segments like trial_ending
    metadata: v.optional(v.any()), // Additional segment data
  })
    .index("by_user", ["userId"])
    .index("by_segment", ["segment"])
    .index("by_user_segment", ["userId", "segment"]),

  // Activity events for timeline (Phase 3.4)
  activityEvents: defineTable({
    userId: v.id("users"),
    eventType: v.string(), // login, create_list, scan_receipt, subscribe, etc.
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_type", ["eventType"]),

  // Monthly AI usage per user (voice, estimates, etc.)
  aiUsage: defineTable({
    userId: v.id("users"),
    feature: v.string(), // "voice" | "price_estimate" | "list_suggestions"
    periodStart: v.number(), // Start of billing month
    periodEnd: v.number(), // End of billing month
    requestCount: v.number(),
    tokenCount: v.optional(v.number()), // Estimated tokens used
    limit: v.number(), // Monthly limit for this feature
    lastNotifiedAt: v.optional(v.number()), // Last usage notification sent
    lastNotifiedThreshold: v.optional(v.number()), // 50, 80, or 100
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_feature", ["userId", "feature"])
    .index("by_user_feature_period", ["userId", "feature", "periodEnd"]),
};
