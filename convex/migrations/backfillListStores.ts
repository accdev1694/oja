import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Backfill normalizedStoreId for existing shopping lists that don't have one.
 * Uses the user's default store preference if available.
 *
 * Run via Convex dashboard: npx convex run migrations/backfillListStores:run
 */
export const run = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    // Get all lists without a normalizedStoreId
    const listsWithoutStore = await ctx.db
      .query("shoppingLists")
      .filter((q) => q.eq(q.field("normalizedStoreId"), undefined))
      .collect();

    console.log(`Found ${listsWithoutStore.length} lists without normalizedStoreId`);

    let updated = 0;
    for (const list of listsWithoutStore) {
      // Get the user's default store
      const user = await ctx.db.get(list.userId);
      const defaultStore = user?.storePreferences?.defaultStore;

      if (defaultStore) {
        if (!dryRun) {
          await ctx.db.patch(list._id, {
            normalizedStoreId: defaultStore,
            updatedAt: Date.now(),
          });
        }
        console.log(`${dryRun ? "[DRY RUN] Would update" : "Updated"} list ${list._id} with store ${defaultStore}`);
        updated++;
      } else {
        console.log(`Skipping list ${list._id} - user has no default store`);
      }
    }

    return {
      total: listsWithoutStore.length,
      updated,
      skipped: listsWithoutStore.length - updated,
      dryRun,
    };
  },
});
