import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";

export const recordView = mutation({
  args: {
    hintId: v.string(),
  },
  handler: async (ctx, { hintId }) => {
    const user = await requireCurrentUser(ctx);

    // Check if already recorded
    const existing = await ctx.db
      .query("tutorialHints")
      .withIndex("by_user_hint", (q) =>
        q.eq("userId", user._id).eq("hintId", hintId)
      )
      .first();

    if (!existing) {
      await ctx.db.insert("tutorialHints", {
        userId: user._id,
        hintId,
        viewedAt: Date.now(),
        dismissedAt: Date.now(),
      });
    }
  },
});

export const hasViewedHint = query({
  args: {
    hintId: v.string(),
  },
  handler: async (ctx, { hintId }) => {
    const user = await requireCurrentUser(ctx);

    const hint = await ctx.db
      .query("tutorialHints")
      .withIndex("by_user_hint", (q) =>
        q.eq("userId", user._id).eq("hintId", hintId)
      )
      .first();

    return !!hint;
  },
});
