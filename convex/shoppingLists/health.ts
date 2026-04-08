import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const updateHealthAnalysis = internalMutation({
  args: {
    listId: v.id("shoppingLists"),
    healthAnalysis: v.object({
      score: v.number(),
      summary: v.string(),
      strengths: v.array(v.string()),
      weaknesses: v.array(v.string()),
      swaps: v.array(v.object({
        originalName: v.string(),
        originalId: v.optional(v.id("listItems")),
        suggestedName: v.string(),
        suggestedCategory: v.optional(v.string()),
        suggestedSize: v.optional(v.string()),
        suggestedUnit: v.optional(v.string()),
        priceDelta: v.optional(v.number()),
        scoreImpact: v.optional(v.number()),
        reason: v.string()
      })),
      itemCountAtAnalysis: v.optional(v.number()),
      updatedAt: v.number()
    })
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.listId, {
      healthAnalysis: args.healthAnalysis
    });
  }
});

export const pruneStaleHealthAnalyses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    // Use by_status index to only scan active lists (archived/completed lists
    // will be cleaned up naturally when they expire). This avoids a full table scan.
    const activeLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let prunedCount = 0;
    for (const list of activeLists) {
      if (list.healthAnalysis && list.healthAnalysis.updatedAt < thirtyDaysAgo) {
        await ctx.db.patch(list._id, {
          healthAnalysis: undefined,
        });
        prunedCount++;
      }
    }
    return { prunedCount };
  },
});
