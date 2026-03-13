import { query } from "../_generated/server";
import { optionalUser } from "./helpers";

export const getSavingsJar = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return { totalSaved: 0, tripsCount: 0, averageSaved: 0, nextMilestone: 50, milestoneProgress: 0 };

    const completedLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const completed = completedLists.filter((l) => l.status === "completed" && l.budget);

    let totalSaved = 0;
    let tripsCount = 0;

    for (const list of completed) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q) => q.eq("listId", list._id))
        .collect();

      const spent = items.reduce(
        (sum, item) => sum + (item.actualPrice || item.estimatedPrice || 0) * item.quantity,
        0
      );

      const saved = (list.budget || 0) - spent;
      if (saved > 0) {
        totalSaved += saved;
        tripsCount++;
      }
    }

    const milestones = [50, 100, 200, 500, 1000];
    const nextMilestone = milestones.find((m) => m > totalSaved) || milestones[milestones.length - 1];
    const prevMilestone = milestones.filter((m) => m <= totalSaved).pop() || 0;
    const milestoneProgress = nextMilestone > prevMilestone
      ? Math.min(((totalSaved - prevMilestone) / (nextMilestone - prevMilestone)) * 100, 100)
      : 100;

    return {
      totalSaved: Math.round(totalSaved * 100) / 100,
      tripsCount,
      averageSaved: tripsCount > 0 ? Math.round((totalSaved / tripsCount) * 100) / 100 : 0,
      nextMilestone,
      milestoneProgress: Math.round(milestoneProgress),
    };
  },
});
