import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration: Collapse shopping and paused modes into "active".
 * Part of the Single Mode List Implementation Plan.
 *
 * This migration:
 * 1. Converts status "shopping" -> "active"
 * 2. Converts status "paused" -> "active"
 * 3. Clears pausedAt field for all lists
 *
 * Run via: npx convex run migrations/collapseShoppingModes:run '{"dryRun": false}'
 */
export const run = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    // We fetch all lists because we need to clear pausedAt regardless of status
    const allLists = await ctx.db.query("shoppingLists").collect();
    
    let updatedCount = 0;
    let statusChanges = 0;
    let pausedAtCleared = 0;

    for (const list of allLists) {
      const updates: any = {};
      let needsUpdate = false;

      // 1. Status conversion
      if (list.status === ("shopping" as any) || list.status === ("paused" as any)) {
        updates.status = "active";
        needsUpdate = true;
        statusChanges++;
      }

      // 2. Clear pausedAt if it exists
      if ((list as any).pausedAt !== undefined) {
        updates.pausedAt = undefined;
        needsUpdate = true;
        pausedAtCleared++;
      }

      if (needsUpdate) {
        if (!dryRun) {
          await ctx.db.patch(list._id, updates);
        }
        updatedCount++;
      }
    }

    console.log(`[${dryRun ? "DRY RUN" : "LIVE"}] Processed ${allLists.length} lists.`);
    console.log(`- Status changes: ${statusChanges}`);
    console.log(`- pausedAt cleared: ${pausedAtCleared}`);
    console.log(`- Total lists updated: ${updatedCount}`);

    return {
      total: allLists.length,
      updated: updatedCount,
      statusChanges,
      pausedAtCleared,
      dryRun
    };
  },
});
