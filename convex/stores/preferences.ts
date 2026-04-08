import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  isValidStoreId,
  type UKStoreId,
} from "../lib/storeNormalizer";

// M1 fix: Maximum number of favorite stores allowed
const MAX_FAVORITES = 50;

/**
 * User Store Preferences
 *
 * Queries and mutations for user's favorite stores and default store.
 */

/**
 * Get the current user's store preferences.
 * Returns favorites array and optional default store.
 */
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    return user.storePreferences ?? { favorites: [], defaultStore: undefined };
  },
});

/**
 * Set the user's favorite stores.
 * Validates that all store IDs are valid UK store IDs.
 */
export const setUserPreferences = mutation({
  args: {
    favorites: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // M1 fix: Validate array length to prevent unbounded input
    if (args.favorites.length > MAX_FAVORITES) {
      throw new Error(`Maximum ${MAX_FAVORITES} favorite stores allowed`);
    }

    // Validate all store IDs
    const invalidStores = args.favorites.filter((id) => !isValidStoreId(id));
    if (invalidStores.length > 0) {
      throw new Error(`Invalid store IDs: ${invalidStores.join(", ")}`);
    }

    // Get current preferences to preserve defaultStore
    const currentPrefs = user.storePreferences ?? {
      favorites: [],
      defaultStore: undefined,
    };

    await ctx.db.patch(user._id, {
      storePreferences: {
        favorites: args.favorites as UKStoreId[],
        defaultStore: currentPrefs.defaultStore,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Set the user's default/primary store.
 * Validates that the store ID is a valid UK store ID.
 */
export const setDefaultStore = mutation({
  args: {
    storeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Validate store ID if provided
    if (args.storeId && !isValidStoreId(args.storeId)) {
      throw new Error(`Invalid store ID: ${args.storeId}`);
    }

    // Get current preferences to preserve favorites
    const currentPrefs = user.storePreferences ?? {
      favorites: [],
      defaultStore: undefined,
    };

    await ctx.db.patch(user._id, {
      storePreferences: {
        favorites: currentPrefs.favorites,
        defaultStore: args.storeId as UKStoreId | undefined,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
