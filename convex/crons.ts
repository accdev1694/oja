import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Expire trials that have passed their trialEndsAt date — runs daily at 3am UTC
crons.daily(
  "expire-trials",
  { hourUTC: 3, minuteUTC: 0 },
  internal.subscriptions.expireTrials
);

export default crons;
