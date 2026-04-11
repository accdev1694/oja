import { query } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { optionalUser } from "./helpers";

/**
 * Get weekly spending digest with sparkline data
 */
export const getWeeklyDigest = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    const allReceipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    const thisWeek = allReceipts.filter(r => r.purchaseDate >= weekAgo);
    const lastWeek = allReceipts.filter(
      r => r.purchaseDate >= twoWeeksAgo && r.purchaseDate < weekAgo
    );

    const thisWeekTotal = thisWeek.reduce((sum, r) => sum + r.total, 0);
    const lastWeekTotal = lastWeek.reduce((sum, r) => sum + r.total, 0);
    const percentChange = lastWeekTotal > 0
      ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
      : 0;

    // Sparkline: daily totals for the last 7 days
    const dailyTotals: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
      const dayEnd = now - i * 24 * 60 * 60 * 1000;
      const dayTotal = thisWeek
        .filter(r => r.purchaseDate >= dayStart && r.purchaseDate < dayEnd)
        .reduce((sum, r) => sum + r.total, 0);
      dailyTotals.push(Math.round(dayTotal * 100) / 100);
    }

    // Completed lists this week for budget tracking
    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    const completedThisWeek = lists.filter(
      l => l.status === "completed" && l.completedAt && l.completedAt >= weekAgo
    );

    let totalBudget = 0;
    let totalSpent = 0;

    // Fetch listItems per completed list using the `by_list` index. Previously
    // this used `.withIndex("by_list")` with no equality filter, which falls
    // back to a full-table scan of `listItems` — expensive now that
    // ProfileInsightsCard calls this query whenever the Profile tab renders.
    const listIds = completedThisWeek.map(l => l._id);
    const allListItems: Doc<"listItems">[] = [];
    for (const listId of listIds) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", q => q.eq("listId", listId))
        .collect();
      allListItems.push(...items);
    }

    for (const list of completedThisWeek) {
      if (list.budget) totalBudget += list.budget;
      const items = allListItems.filter(item => item.listId === list._id);
      totalSpent += items.reduce(
        (sum, item) => sum + (item.actualPrice || item.estimatedPrice || 0) * item.quantity,
        0
      );
    }

    const budgetSaved = totalBudget - totalSpent;

    return {
      thisWeekTotal: Math.round(thisWeekTotal * 100) / 100,
      lastWeekTotal: Math.round(lastWeekTotal * 100) / 100,
      percentChange: Math.round(percentChange * 10) / 10,
      tripsCount: thisWeek.length,
      completedLists: completedThisWeek.length,
      budgetSaved: budgetSaved > 0 ? Math.round(budgetSaved * 100) / 100 : 0,
      topCategories: getTopCategories(thisWeek),
      dailySparkline: dailyTotals,
    };
  },
});

function getTopCategories(receipts: Doc<"receipts">[]) {
  const categoryTotals: Record<string, number> = {};
  for (const receipt of receipts) {
    for (const item of receipt.items || []) {
      const cat = item.category || "Uncategorized";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (item.totalPrice || 0);
    }
  }
  return Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }));
}
