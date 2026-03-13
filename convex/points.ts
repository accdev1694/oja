// Barrel file - re-exports all points functionality
// Convex maps convex/points.ts to api.points.* so this must remain the entry point.

// Shared helpers (processEarnPoints, processExpirePoints used by other modules)
export { processEarnPoints, processExpirePoints } from "./points/helpers";

// Queries
export { getPointsBalance, getPointsHistory, getExpiringPoints } from "./points/queries";

// Core mutations
export { initializePointsBalance, earnPointsInternal, redeemPoints, awardBonusPoints, refundPoints, expirePoints } from "./points/mutations";

// Admin & scheduled mutations
export { expireOldPoints, checkFraudAlerts, adjustUserPoints } from "./points/admin";
