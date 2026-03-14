import { api } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import type { StoreInfo } from "./types";
import type { Id, Doc } from "../../_generated/dataModel";

/** Enriched shopping list returned by getActive (includes computed fields) */
type EnrichedShoppingList = Doc<"shoppingLists"> & {
  itemCount: number;
  checkedCount: number;
  totalEstimatedCost: number | undefined;
  isInProgress: boolean;
};

/**
 * Voice Assistant READ Tools
 * 
 * Implementations for tools that query the database and return information.
 */

export async function executeReadTool(
  ctx: ActionCtx,
  functionName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (functionName) {
    case "get_pantry_items": {
      const items = await ctx.runQuery(api.pantryItems.getByUser, {});
      const filtered = (args.stockFilter as string)
        ? items.filter((i: Doc<"pantryItems">) => i.stockLevel === (args.stockFilter as string))
        : items;
      return filtered.map((i: Doc<"pantryItems">) => ({
        name: i.name,
        category: i.category,
        stockLevel: i.stockLevel,
        lastPrice: i.lastPrice,
        defaultSize: i.defaultSize,
        defaultUnit: i.defaultUnit,
      }));
    }

    case "get_active_lists": {
      const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
      return lists.map((l: EnrichedShoppingList) => ({
        id: l._id,
        name: l.name,
        status: l.status,
        budget: l.budget,
        storeName: l.storeName,
        itemCount: l.itemCount,
      }));
    }

    case "get_list_items": {
      const items = await ctx.runQuery(api.listItems.getByList, {
        listId: (args.listId as string) as Id<"shoppingLists">,
      });
      return items.map((i: Doc<"listItems">) => ({
        name: i.name,
        quantity: i.quantity,
        estimatedPrice: i.estimatedPrice,
        isChecked: i.isChecked,
        priority: i.priority,
      }));
    }

    case "get_price_estimate": {
      return await ctx.runQuery(api.currentPrices.getEstimate, {
        itemName: (args.itemName as string),
      });
    }

    case "get_price_stats": {
      return await ctx.runQuery(api.priceHistory.getPriceStats, {
        itemName: (args.itemName as string),
      });
    }

    case "get_price_trend": {
      return await ctx.runQuery(api.priceHistory.getPriceTrend, {
        itemName: (args.itemName as string),
      });
    }

    case "get_weekly_digest": {
      return await ctx.runQuery(api.insights.getWeeklyDigest, {});
    }

    case "get_savings_jar": {
      return await ctx.runQuery(api.insights.getSavingsJar, {});
    }

    case "get_streaks": {
      return await ctx.runQuery(api.insights.getStreaks, {});
    }

    case "get_achievements": {
      return await ctx.runQuery(api.insights.getAchievements, {});
    }

    case "get_item_variants": {
      return await ctx.runQuery(api.itemVariants.getWithPrices, {
        baseItem: (args.baseItem as string),
      });
    }

    case "get_monthly_trends": {
      return await ctx.runQuery(api.insights.getMonthlyTrends, {});
    }

    case "get_budget_status": {
      const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
      let targetList: EnrichedShoppingList | undefined = undefined;

      if ((args.listName as string)) {
        targetList = lists.find((l: EnrichedShoppingList) =>
          l.name.toLowerCase().includes((args.listName as string).toLowerCase())
        );
      } else if (lists.length === 1) {
        targetList = lists[0];
      } else if (lists.length > 1) {
        targetList = lists.find((l: EnrichedShoppingList) => l.isInProgress) || lists[0];
      }

      if (!targetList) {
        return { error: "No active list found. Create a list first." };
      }

      const budget = targetList.budget || 0;
      const spent = targetList.totalEstimatedCost || 0;
      const remaining = Math.max(0, budget - spent);
      const percentUsed = budget > 0 ? Math.round((spent / budget) * 100) : 0;

      return {
        listName: targetList.name,
        budget,
        spent,
        remaining,
        percentUsed,
        status: percentUsed >= 100 ? "over_budget" : percentUsed >= 80 ? "near_limit" : "healthy",
      };
    }

    case "get_list_details": {
      const allLists = await ctx.runQuery(api.shoppingLists.getActive, {});
      let list: EnrichedShoppingList | undefined = undefined;

      if ((args.listName as string)) {
        list = allLists.find((l: EnrichedShoppingList) =>
          l.name.toLowerCase().includes((args.listName as string).toLowerCase())
        );
      } else if (allLists.length === 1) {
        list = allLists[0];
      } else if (allLists.length > 1) {
        list = allLists.find((l: EnrichedShoppingList) => l.isInProgress) || allLists[0];
      }

      if (!list) {
        return { error: "No active list found." };
      }

      const listItems = await ctx.runQuery(api.listItems.getByList, {
        listId: list._id,
      });

      const budget = list.budget || 0;
      const spent = list.totalEstimatedCost || 0;
      const checkedCount = listItems.filter((i: Doc<"listItems">) => i.isChecked).length;

      return {
        name: list.name,
        status: list.status,
        budget,
        spent,
        remaining: Math.max(0, budget - spent),
        itemCount: listItems.length,
        checkedCount,
        uncheckedCount: listItems.length - checkedCount,
        storeName: list.storeName,
        items: listItems.slice(0, 10).map((i: Doc<"listItems">) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.estimatedPrice,
          checked: i.isChecked,
        })),
      };
    }

    case "get_app_summary": {
      const activeLists = await ctx.runQuery(api.shoppingLists.getActive, {});
      const pantryItems = await ctx.runQuery(api.pantryItems.getByUser, {});
      const savingsJar = await ctx.runQuery(api.insights.getSavingsJar, {});
      const weeklyDigest = await ctx.runQuery(api.insights.getWeeklyDigest, {});

      const lowStockItems = pantryItems.filter((i: Doc<"pantryItems">) => i.stockLevel === "low" || i.stockLevel === "out");
      const totalBudget = activeLists.reduce((sum: number, l: EnrichedShoppingList) => sum + (l.budget || 0), 0);
      const totalEstimated = activeLists.reduce((sum: number, l: EnrichedShoppingList) => sum + (l.totalEstimatedCost || 0), 0);

      return {
        activeListsCount: activeLists.length,
        activeListNames: activeLists.map((l: EnrichedShoppingList) => l.name),
        totalBudgetAcrossLists: totalBudget,
        totalEstimatedSpend: totalEstimated,
        pantryItemsCount: pantryItems.length,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.slice(0, 5).map((i: Doc<"pantryItems">) => i.name),
        totalSavings: savingsJar?.totalSaved || 0,
        thisWeekSpent: weeklyDigest?.thisWeekTotal || 0,
        thisWeekTrips: weeklyDigest?.tripsCount || 0,
      };
    }

    case "compare_store_prices": {
      const allStores = await ctx.runQuery(api.stores.getAll, {});
      const storeIds = allStores.map((s: StoreInfo) => s.id);

      const comparison = await ctx.runQuery(api.currentPrices.getComparisonByStores, {
        itemName: (args.itemName as string),
        size: (args.size as string),
        storeIds,
      });

      if (comparison.storesWithData === 0) {
        return {
          itemName: (args.itemName as string),
          size: (args.size as string),
          message: `I don't have price data for ${(args.itemName as string)} yet. Keep scanning receipts and I'll learn!`,
          noData: true,
        };
      }

      const pricesWithStores = Object.entries(comparison.byStore)
        .filter(([, data]) => data !== null)
        .map(([storeId, data]) => {
          const storeInfo = allStores.find((s: StoreInfo) => s.id === storeId);
          return {
            storeId,
            storeName: storeInfo?.displayName ?? storeId,
            price: (data as { price: number }).price,
            size: (data as { size: string }).size,
            unit: (data as { unit: string }).unit,
          };
        })
        .sort((a, b) => a.price - b.price);

      const cheapest = pricesWithStores[0];
      const mostExpensive = pricesWithStores[pricesWithStores.length - 1];
      const savings = mostExpensive.price - cheapest.price;

      return {
        itemName: (args.itemName as string),
        size: (args.size as string),
        cheapestStore: cheapest.storeName,
        cheapestPrice: cheapest.price,
        averagePrice: comparison.averagePrice,
        storesCompared: pricesWithStores.length,
        allPrices: pricesWithStores.slice(0, 5),
        potentialSavings: Math.round(savings * 100) / 100,
        message: `${(args.itemName as string)} is cheapest at ${cheapest.storeName} for £${cheapest.price.toFixed(2)}${savings > 0 ? ` — you could save £${savings.toFixed(2)} compared to ${mostExpensive.storeName}` : ""}`,
      };
    }

    case "get_store_savings": {
      const recommendation = await ctx.runQuery(api.stores.getStoreRecommendation, {});

      if (!recommendation) {
        return {
          message: "I need more shopping data to make recommendations. Keep scanning receipts!",
          noData: true,
        };
      }

      return {
        recommendedStore: recommendation.storeName,
        potentialMonthlySavings: recommendation.potentialMonthlySavings,
        itemCount: recommendation.itemCount,
        message: recommendation.message,
        alternatives: recommendation.alternativeStores?.slice(0, 2).map((s: { storeName: string; potentialSavings: number }) => ({
          store: s.storeName,
          savings: s.potentialSavings,
        })),
      };
    }

    default:
      return { error: `Unknown READ function: ${functionName}` };
  }
}
