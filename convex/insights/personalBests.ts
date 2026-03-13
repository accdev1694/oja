import { query } from "../_generated/server";
import { optionalUser } from "./helpers";

export const getPersonalBests = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const completedLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    const completed = completedLists.filter(l => l.status === "completed");

    let biggestSaving = 0;
    let longestStreak = 0;
    let mostItemsInTrip = 0;
    let cheapestTrip = Infinity;

    for (const list of completed) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", q => q.eq("listId", list._id))
        .collect();

      const spent = items.reduce(
        (sum, item) => sum + (item.actualPrice || item.estimatedPrice || 0) * item.quantity,
        0
      );

      if (list.budget) {
        const saved = list.budget - spent;
        if (saved > biggestSaving) biggestSaving = saved;
      }

      if (items.length > mostItemsInTrip) mostItemsInTrip = items.length;
      if (spent > 0 && spent < cheapestTrip) cheapestTrip = spent;
    }

    const streaks = await ctx.db
      .query("streaks")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    for (const s of streaks) {
      if (s.longestCount > longestStreak) longestStreak = s.longestCount;
    }

    return {
      biggestSaving: Math.round(biggestSaving * 100) / 100,
      longestStreak,
      mostItemsInTrip,
      cheapestTrip: cheapestTrip === Infinity ? 0 : Math.round(cheapestTrip * 100) / 100,
      totalTrips: completed.length,
    };
  },
});
