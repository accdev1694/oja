/**
 * Store Queries & Mutations (Barrel File)
 *
 * Provides access to UK store data and user store preferences.
 * Uses the storeNormalizer utility for store metadata.
 *
 * H1 fix: Split from 592 lines into subdirectory files:
 * - stores/core.ts (~50 lines) - basic store lookups
 * - stores/preferences.ts (~120 lines) - user preferences
 * - stores/analytics.ts (~350 lines) - spending analysis
 */

// Core store queries
export { getAll, getForCuisines, getById } from "./stores/core";

// User preferences
export { getUserPreferences, setUserPreferences, setDefaultStore } from "./stores/preferences";

// Analytics
export {
  getReceiptCountByStore,
  getSpendingByStore,
  getBestDealsFound,
  getStoreRecommendation,
} from "./stores/analytics";
