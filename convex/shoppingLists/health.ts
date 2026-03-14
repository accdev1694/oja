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
    const listsWithAnalysis = await ctx.db
      .query("shoppingLists")
      .filter((q) => q.neq(q.field("healthAnalysis"), undefined))
      .collect();

    let prunedCount = 0;
    for (const list of listsWithAnalysis) {
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
