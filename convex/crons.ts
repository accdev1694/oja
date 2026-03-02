import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Expire trials that have passed their trialEndsAt date — runs daily at 3am UTC
crons.daily(
  "expire-trials",
  { hourUTC: 3, minuteUTC: 0 },
  internal.subscriptions.expireTrials
);

// Cleanup expired admin sessions — runs hourly
crons.interval(
  "cleanup-admin-sessions",
  { minutes: 60 },
  internal.admin.cleanupExpiredSessions
);

// Process nurture sequence for new users — runs daily at 10am UTC (good for UK)
// Sends day 1-5 welcome nudges, trial ending reminders, re-engagement messages
crons.daily(
  "nurture-sequence",
  { hourUTC: 10, minuteUTC: 0 },
  internal.nurture.processNurtureSequence
);

// Prune notifications older than 30 days — runs daily at 4am UTC
crons.daily(
  "prune-old-notifications",
  { hourUTC: 4, minuteUTC: 0 },
  internal.notifications.pruneOld
);

// Auto-archive stale pantry items — runs daily at 3am UTC
// Archives items that are out-of-stock, not pinned, with no purchase in 90 days
crons.daily(
  "archive stale pantry items",
  { hourUTC: 3, minuteUTC: 0 },
  internal.pantryItems.archiveStaleItems,
);

// Compute daily platform metrics — runs daily at 2am UTC
// Precomputes analytics to avoid full table scans in admin dashboard
crons.daily(
  "compute-daily-metrics",
  { hourUTC: 2, minuteUTC: 0 },
  internal.analytics.computeDailyMetrics
);

// Advanced Analytics — Phase 2
crons.daily(
  "compute-user-segments",
  { hourUTC: 2, minuteUTC: 30 },
  internal.analytics_advanced.computeUserSegments
);

crons.daily(
  "compute-cohort-retention",
  { hourUTC: 3, minuteUTC: 0 },
  internal.analytics_advanced.computeCohortRetention
);

crons.daily(
  "compute-churn-risk",
  { hourUTC: 3, minuteUTC: 30 },
  internal.analytics_advanced.computeChurnRisk
);

crons.monthly(
  "compute-monthly-analytics",
  { day: 1, hourUTC: 4, minuteUTC: 0 },
  internal.analytics_advanced.runMonthlyAnalytics
);

// Automated Workflows — Phase 4
crons.daily(
  "process-workflows",
  { hourUTC: 5, minuteUTC: 0 },
  internal.workflows.processWorkflows
);

// Real-time Monitoring — Phase 4
crons.interval(
  "check-receipt-health",
  { minutes: 30 },
  internal.monitoring.checkReceiptFailures
);

crons.interval(
  "check-api-latency",
  { minutes: 15 },
  internal.monitoring.checkApiLatency
);

crons.interval(
  "check-security-anomalies",
  { minutes: 15 },
  internal.monitoring.checkSecurityAnomalies
);

crons.interval(
  "check-price-anomalies",
  { minutes: 30 },
  internal.monitoring.checkPriceAnomalies
);

crons.daily(
  "prune-old-alerts",
  { hourUTC: 5, minuteUTC: 0 },
  internal.monitoring.pruneAlerts
);

// Maintenance: Move old admin logs to archive weekly (Sunday at 2am UTC)
// Uses dayOfWeek parameter required by Convex crons.weekly()
crons.weekly(
  "archive-old-admin-logs",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 },
  internal.admin.archiveOldAdminLogs
);

// Scheduled Reports: Weekly Summary (Monday at 6am)
crons.weekly(
  "weekly-admin-summary-report",
  { dayOfWeek: "monday", hourUTC: 6, minuteUTC: 0 },
  internal.admin.runScheduledReports,
  { type: "weekly_summary" }
);

// Scheduled Reports: Monthly Financial (1st of month at 7am)
crons.monthly(
  "monthly-financial-report",
  { day: 1, hourUTC: 7, minuteUTC: 0 },
  internal.admin.runScheduledReports,
  { type: "monthly_financial" }
);

// Points System — Phase 2
crons.monthly(
  "expire-old-points",
  { day: 1, hourUTC: 1, minuteUTC: 0 },
  internal.points.expireOldPoints
);

crons.daily(
  "reconcile-stripe-points",
  { hourUTC: 2, minuteUTC: 30 },
  internal.stripe.reconcilePointRedemptions
);

crons.hourly(
  "check-fraud-alerts",
  { minuteUTC: 0 },
  internal.points.checkFraudAlerts
);

export default crons;
