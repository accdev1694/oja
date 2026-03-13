import { query } from "../_generated/server";
import { optionalUser } from "./helpers";

/**
 * Get monthly spending trends (last 6 months) with category breakdown + budget adherence
 */
export const getMonthlyTrends = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return { months: [], categoryBreakdown: [], budgetAdherence: { underBudget: 0, overBudget: 0, total: 0 } };

    const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;

    // Receipts for monthly totals + categories
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();
    const recentReceipts = receipts.filter(r => r.purchaseDate >= sixMonthsAgo);

    const monthlyData: Record<string, { total: number; count: number }> = {};
    const categoryTotals: Record<string, number> = {};

    for (const r of recentReceipts) {
      const date = new Date(r.purchaseDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[key]) monthlyData[key] = { total: 0, count: 0 };
      monthlyData[key].total += r.total;
      monthlyData[key].count++;

      // Category aggregation
      for (const item of r.items || []) {
        const cat = item.category || "Other";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (item.totalPrice || 0);
      }
    }

    const months = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        label: formatMonthLabel(month),
        total: Math.round(data.total * 100) / 100,
        trips: data.count,
      }));

    // Add month-over-month change
    const monthsWithChange = months.map((m, i) => ({
      ...m,
      change: i > 0 && months[i - 1].total > 0
        ? Math.round(((m.total - months[i - 1].total) / months[i - 1].total) * 1000) / 10
        : 0,
    }));

    const categoryBreakdown = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 6)
      .map(([category, total]) => ({
        category,
        total: Math.round((total as number) * 100) / 100,
      }));

    // Budget adherence from completed lists
    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();
    const completedWithBudget = lists.filter(
      (l: any) => l.status === "completed" && l.budget && l.completedAt && l.completedAt >= sixMonthsAgo
    );

    let underBudget = 0;
    let overBudget = 0;
    for (const list of completedWithBudget) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", q => q.eq("listId", list._id))
        .collect();
      const spent = items.reduce(
        (sum: number, item: any) => sum + (item.actualPrice || item.estimatedPrice || 0) * item.quantity,
        0
      );
      if (spent <= (list.budget ?? 0)) underBudget++;
      else overBudget++;
    }

    return {
      months: monthsWithChange,
      categoryBreakdown,
      budgetAdherence: {
        underBudget,
        overBudget,
        total: completedWithBudget.length,
      },
    };
  },
});

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(month) - 1]} ${year.slice(2)}`;
}
