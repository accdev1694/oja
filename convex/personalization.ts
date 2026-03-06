import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get personalized "Buy it again" suggestions based on past purchases.
 * Specifically looks for items bought roughly 7 days ago.
 */
export const getBuyItAgainSuggestions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    // Window: 5 to 9 days ago (centered around 7 days)
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const startWindow = now - 9 * DAY_MS;
    const endWindow = now - 5 * DAY_MS;

    // Get price history for the user in this window
    const history = await ctx.db
      .query("priceHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.and(
        q.gte(q.field("purchaseDate"), startWindow),
        q.lte(q.field("purchaseDate"), endWindow)
      ))
      .collect();

    if (history.length === 0) return [];

    // Aggregate by item name to find distinct purchases
    const itemMap = new Map<string, {
      name: string;
      normalizedName: string;
      quantity: number;
      storeName: string;
      lastPrice: number;
      purchaseDate: number;
      size?: string;
      unit?: string;
    }>();
    for (const h of history) {
      const key = h.normalizedName;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          name: h.itemName,
          normalizedName: h.normalizedName,
          quantity: h.quantity || 1,
          storeName: h.storeName,
          lastPrice: h.unitPrice,
          purchaseDate: h.purchaseDate,
          size: h.size,
          unit: h.unit,
        });
      }
    }

    // Get current active list items to filter out duplicates
    const activeLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "active"))
      .collect();
    
    const shoppingLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "shopping"))
      .collect();
    
    const allActiveLists = [...activeLists, ...shoppingLists];
    const activeItemNames = new Set<string>();

    for (const list of allActiveLists) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q) => q.eq("listId", list._id))
        .collect();
      for (const item of items) {
        activeItemNames.add(item.name.toLowerCase().trim());
      }
    }

    // Filter and return top suggestions
    return Array.from(itemMap.values())
      .filter(item => !activeItemNames.has(item.normalizedName))
      .sort((a, b) => b.purchaseDate - a.purchaseDate)
      .slice(0, 5);
  },
});
