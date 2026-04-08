import { v } from "convex/values";
import { query } from "../_generated/server";
import {
  getAllStores,
  getStoreInfoSafe,
  getStoresForCuisines,
  getMainstreamStores,
} from "../lib/storeNormalizer";

/**
 * Core Store Queries
 *
 * Basic store lookups using the storeNormalizer utility.
 */

/**
 * Get all UK stores sorted by market share.
 * Returns store metadata including display name, color, type, and market share.
 */
export const getAll = query({
  args: {},
  handler: async () => {
    return getAllStores();
  },
});

/**
 * Get stores split into cuisine-recommended specialty stores and mainstream stores.
 * Used by the onboarding store-selection screen.
 */
export const getForCuisines = query({
  args: { cuisines: v.array(v.string()) },
  handler: async (_ctx, args) => {
    const recommended = getStoresForCuisines(args.cuisines);
    const recommendedIds = new Set(recommended.map((s) => s.id));
    const mainstream = getMainstreamStores().filter(
      (s) => !recommendedIds.has(s.id)
    );
    return { recommended, mainstream };
  },
});

/**
 * Get a single store's info by its normalized ID.
 * Returns null if store ID is not recognized.
 */
export const getById = query({
  args: { storeId: v.string() },
  handler: async (_ctx, args) => {
    return getStoreInfoSafe(args.storeId);
  },
});
