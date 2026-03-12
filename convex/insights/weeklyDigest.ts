import { query } from "../_generated/server";
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
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const thisWeek = allReceipts.filter((r: any) => r.purchaseDate >= weekAgo);
    const lastWeek = allReceipts.filter(
      (r: any) => r.purchaseDate >= twoWeeksAgo && r.purchaseDate < weekAgo
    );

    const thisWeekTotal = thisWeek.reduce((sum: number, r: any) => sum + r.total, 0);
    const lastWeekTotal = lastWeek.reduce((sum: number, r: any) => sum + r.total, 0);
    const percentChange = lastWeekTotal > 0
      ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
      : 0;

    // Sparkline: daily totals for the last 7 days
    const dailyTotals: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
      const dayEnd = now - i * 24 * 60 * 60 * 1000;
      const dayTotal = thisWeek
        .filter((r: any) => r.purchaseDate >= dayStart && r.purchaseDate < dayEnd)
        .reduce((sum: number, r: any) => sum + r.total, 0);
      dailyTotals.push(Math.round(dayTotal * 100) / 100);
    }

    // Completed lists this week for budget tracking
    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const completedThisWeek = lists.filter(
      (l: any) => l.status === "completed" && l.completedAt && l.completedAt >= weekAgo
    );

    let totalBudget = 0;
    let totalSpent = 0;
    for (const list of completedThisWeek) {
      if (list.budget) totalBudget += list.budget;
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q: any) => q.eq("listId", list._id))
        .collect();
      totalSpent += items.reduce(
        (sum: number, item: any) => sum + (item.actualPrice || item.estimatedPrice || 0) * item.quantity,
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

function getTopCategories(receipts: any[]) {
  const categoryTotals: Record<string, number> = {};
  for (const receipt of receipts) {
    for (const item of receipt.items || []) {
      const cat = item.category || "Uncategorized";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (item.totalPrice || 0);
    }
  }
  return Object.entries(categoryTotals)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6)
    .map(([category, total]) => ({ category, total: Math.round((total as number) * 100) / 100 }));
}
