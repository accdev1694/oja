import { cronJobs } from "convex/server";

const crons = cronJobs();

// No cron jobs currently active.
// (Old loyalty point expiry cron removed — unified scan rewards don't expire.)

export default crons;
