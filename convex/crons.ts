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

export default crons;
