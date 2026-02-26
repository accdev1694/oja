import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Expire trials that have passed their trialEndsAt date — runs daily at 3am UTC
crons.daily(
  "expire-trials",
  { hourUTC: 3, minuteUTC: 0 },
  internal.subscriptions.expireTrials
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

crons.monthly(
  "compute-monthly-metrics",
  { day: 1, hourUTC: 4, minuteUTC: 0 },
  internal.analytics_advanced.computeChurnMetrics
);

crons.monthly(
  "compute-monthly-ltv",
  { day: 1, hourUTC: 4, minuteUTC: 30 },
  internal.analytics_advanced.computeLTVMetrics
);

export default crons;
