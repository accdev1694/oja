import { internalMutation } from "../_generated/server";

/**
 * Migration: Backfill status field for pantryItems
 * Sets status to "active" for all items that don't have a status field.
 * This enables efficient indexing by user + status.
 */
export const backfillPantryStatus = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("pantryItems").collect();
    let updated = 0;

    for (const item of items) {
      if (item.status === undefined) {
        await ctx.db.patch(item._id, {
          status: "active",
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    console.log(`[pantryStatusBackfill] Updated ${updated}/${items.length} items`);
    return { updated, total: items.length };
  },
});
