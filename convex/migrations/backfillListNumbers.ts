import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Backfill listNumber for all existing shopping lists.
 * Assigns sequential numbers per user, ordered by createdAt ascending.
 *
 * Run via: npx convex run migrations/backfillListNumbers:run '{"dryRun": false}'
 * Dry run: npx convex run migrations/backfillListNumbers:run
 */
export const run = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    // Get all lists without a listNumber
    const allLists = await ctx.db
      .query("shoppingLists")
      .filter((q) => q.eq(q.field("listNumber"), undefined))
      .collect();

    console.log(`Found ${allLists.length} lists without listNumber`);

    // Group by userId
    const byUser = new Map<string, typeof allLists>();
    for (const list of allLists) {
      const key = list.userId as string;
      const existing = byUser.get(key) ?? [];
      existing.push(list);
      byUser.set(key, existing);
    }

    let updated = 0;

    for (const [userId, userLists] of byUser) {
      // Sort by createdAt ascending — oldest list gets the lowest number
      userLists.sort((a, b) => a.createdAt - b.createdAt);

      // Find current max listNumber for this user (in case some already have one)
      const existingLists = await ctx.db
        .query("shoppingLists")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect();

      let maxNumber = 0;
      for (const el of existingLists) {
        if (el.listNumber != null && el.listNumber > maxNumber) {
          maxNumber = el.listNumber;
        }
      }

      // Assign sequential numbers starting after current max
      for (const list of userLists) {
        maxNumber++;
        if (!dryRun) {
          await ctx.db.patch(list._id, {
            listNumber: maxNumber,
          });
        }
        console.log(
          `${dryRun ? "[DRY RUN]" : "Assigned"} list ${list._id} → #${maxNumber} (user ${userId})`
        );
        updated++;
      }
    }

    return { total: allLists.length, updated, users: byUser.size, dryRun };
  },
});
