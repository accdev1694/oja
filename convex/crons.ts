import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Expire loyalty points older than 12 months — runs daily at 3am UTC
crons.daily(
  "expire-old-loyalty-points",
  { hourUTC: 3, minuteUTC: 0 },
  internal.cronHandlers.expireOldPoints,
);

export default crons;
