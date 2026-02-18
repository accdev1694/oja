/**
 * Voice Assistant Tool Definitions & Dispatcher
 *
 * Defines Gemini function declarations for the Oja voice assistant,
 * the system prompt, and a dispatcher that routes tool calls to Convex queries.
 */

import {
  SchemaType,
  type FunctionDeclaration,
} from "@google/generative-ai";
import { api } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// ─── Function Declarations ─────────────────────────────────────────────

export const voiceFunctionDeclarations: FunctionDeclaration[] = [
  // ── READ TOOLS (12) ──────────────────────────────────────────────────

  {
    name: "get_pantry_items",
    description:
      "Get the user's pantry items with stock levels, prices, and categories. " +
      "Use when the user asks what they have, what's running low, or what they need to buy.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        stockFilter: {
          type: SchemaType.STRING,
          description: "Filter by stock level: 'stocked', 'low', or 'out'. Omit for all items.",
          format: "enum",
          enum: ["stocked", "low", "out"],
        },
      },
    },
  },

  {
    name: "get_active_lists",
    description:
      "Get all active and in-progress shopping lists. " +
      "Use when the user asks about their current lists or what they're planning to shop for.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },

  {
    name: "get_list_items",
    description:
      "Get all items on a specific shopping list with prices, quantities, and checked status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listId: {
          type: SchemaType.STRING,
          description: "The ID of the shopping list",
        },
      },
      required: ["listId"],
    },
  },

  {
    name: "get_price_estimate",
    description:
      "Get the current best price estimate for a grocery item. " +
      "Use when the user asks 'how much is X?' or 'what does X cost?'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        itemName: {
          type: SchemaType.STRING,
          description: "The grocery item name, e.g. 'milk', 'chicken breast'",
        },
      },
      required: ["itemName"],
    },
  },

  {
    name: "get_price_stats",
    description:
      "Get personal price history stats for an item (average, min, max, cheapest store). " +
      "Use for 'where is X cheapest?' or 'how much have I been paying for X?'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        itemName: {
          type: SchemaType.STRING,
          description: "The grocery item name",
        },
      },
      required: ["itemName"],
    },
  },

  {
    name: "get_price_trend",
    description:
      "Get whether an item's price is increasing, decreasing, or stable based on purchase history.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        itemName: {
          type: SchemaType.STRING,
          description: "The grocery item name",
        },
      },
      required: ["itemName"],
    },
  },

  {
    name: "get_weekly_digest",
    description:
      "Get this week's spending summary: total spent, comparison to last week, " +
      "number of trips, budget saved, top categories.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },

  {
    name: "get_savings_jar",
    description:
      "Get cumulative savings data: total saved, trips count, average saved per trip, " +
      "next milestone progress.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },

  {
    name: "get_streaks",
    description: "Get the user's activity streaks (shopping streaks, scanning streaks, etc.).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },

  {
    name: "get_achievements",
    description: "Get all unlocked achievements and badges.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },

  {
    name: "get_item_variants",
    description:
      "Get size variants with prices for an item (e.g., milk: 1pt, 2pt, 4pt with different prices).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        baseItem: {
          type: SchemaType.STRING,
          description: "Base item name, e.g. 'milk', 'rice'",
        },
      },
      required: ["baseItem"],
    },
  },

  {
    name: "get_monthly_trends",
    description:
      "Get spending trends over the last 6 months with category breakdown and budget adherence.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },

  {
    name: "get_budget_status",
    description:
      "Get budget status for a shopping list: spent amount, remaining amount, and percentage used. " +
      "Use when user asks 'how much room is left in my budget?' or 'how much have I spent?'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listName: {
          type: SchemaType.STRING,
          description: "Optional list name. If not provided, uses the current/only active list.",
        },
      },
    },
  },

  {
    name: "get_list_details",
    description:
      "Get comprehensive details about a shopping list: items, budget, spent, remaining, status, item count. " +
      "Use when user asks about a specific list or wants full details.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listName: {
          type: SchemaType.STRING,
          description: "List name to get details for. If not provided, uses current/only active list.",
        },
      },
    },
  },

  {
    name: "get_app_summary",
    description:
      "Get a summary of the entire app state: active lists count, total budget across lists, " +
      "pantry items running low, receipts scanned this week, savings jar total. " +
      "Use when user asks 'what's going on?' or 'give me an overview'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },

  // ── WRITE TOOLS (9) ─ execute immediately when called ────────────────

  {
    name: "create_shopping_list",
    description:
      "Create a new shopping list. Name is OPTIONAL — if user doesn't specify a name, " +
      "just create it as 'Shopping List'. Don't ask for a name — the footer date+time differentiates lists.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Optional list name. If not provided, defaults to 'Shopping List'",
        },
        budget: {
          type: SchemaType.NUMBER,
          description: "Optional budget in GBP",
        },
        storeName: {
          type: SchemaType.STRING,
          description: "Optional store name, e.g. 'Aldi', 'Tesco'",
        },
      },
      required: [],
    },
  },

  {
    name: "add_items_to_list",
    description:
      "Add items to a shopping list with size and price. If no list is specified and user has multiple lists, " +
      "ASK which list to add to — don't guess. If only one active list, use it. " +
      "Examples: 'add 2 pints of milk', 'add 500g butter', 'add 4 pack of eggs'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listId: {
          type: SchemaType.STRING,
          description: "Target list ID if known from context",
        },
        listName: {
          type: SchemaType.STRING,
          description: "Target list name for fuzzy matching if no ID",
        },
        items: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING, description: "Item name" },
              quantity: { type: SchemaType.NUMBER, description: "Quantity, default 1" },
              size: { type: SchemaType.STRING, description: "Size variant, e.g. '2pt', '500g', '6pk'. Omit to use user's usual size." },
              unit: { type: SchemaType.STRING, description: "Optional unit, e.g. 'pint', 'kg'" },
            },
            required: ["name"],
          },
        },
      },
      required: ["items"],
    },
  },

  {
    name: "update_stock_level",
    description:
      "Update a pantry item's stock level immediately. " +
      "Use when user says 'I'm out of milk' or 'mark eggs as low'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        itemName: {
          type: SchemaType.STRING,
          description: "Pantry item name",
        },
        stockLevel: {
          type: SchemaType.STRING,
          description: "New stock level",
          format: "enum",
          enum: ["stocked", "low", "out"],
        },
      },
      required: ["itemName", "stockLevel"],
    },
  },

  {
    name: "check_off_item",
    description:
      "Check off an item on a shopping list immediately. " +
      "Use when user says 'got the milk' or 'check off bread'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listId: {
          type: SchemaType.STRING,
          description: "List ID",
        },
        itemName: {
          type: SchemaType.STRING,
          description: "Item name to check off",
        },
      },
      required: ["itemName"],
    },
  },

  {
    name: "add_pantry_item",
    description:
      "Add a new item to the pantry immediately. " +
      "Use when user says 'add rice to my pantry'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Item name",
        },
        category: {
          type: SchemaType.STRING,
          description: "Category, e.g. 'Dairy', 'Meat', 'Grains'",
        },
        stockLevel: {
          type: SchemaType.STRING,
          description: "Initial stock level",
          format: "enum",
          enum: ["stocked", "low", "out"],
        },
      },
      required: ["name"],
    },
  },

  {
    name: "update_list_budget",
    description:
      "Update the budget for a shopping list. " +
      "Use when user says 'change the budget to £60' or 'set budget to 75 pounds'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listName: {
          type: SchemaType.STRING,
          description: "List name. If not provided, uses current/only active list.",
        },
        budget: {
          type: SchemaType.NUMBER,
          description: "New budget amount in GBP",
        },
      },
      required: ["budget"],
    },
  },

  {
    name: "delete_list",
    description:
      "Delete a shopping list. ALWAYS confirm with user before deleting. " +
      "Use when user says 'delete my Aldi list' or 'remove that list'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listName: {
          type: SchemaType.STRING,
          description: "Name of the list to delete",
        },
        confirmed: {
          type: SchemaType.BOOLEAN,
          description: "Whether user has confirmed deletion. Must be true to proceed.",
        },
      },
      required: ["listName", "confirmed"],
    },
  },

  {
    name: "remove_list_item",
    description:
      "Remove an item from a shopping list. " +
      "Use when user says 'remove eggs from my list' or 'take off the bread'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listName: {
          type: SchemaType.STRING,
          description: "List name. If not provided, uses current/only active list.",
        },
        itemName: {
          type: SchemaType.STRING,
          description: "Item name to remove",
        },
      },
      required: ["itemName"],
    },
  },

  {
    name: "remove_pantry_item",
    description:
      "Remove an item from the pantry. " +
      "Use when user says 'delete milk from pantry' or 'remove rice from my stock'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        itemName: {
          type: SchemaType.STRING,
          description: "Pantry item name to remove",
        },
      },
      required: ["itemName"],
    },
  },

  {
    name: "clear_checked_items",
    description:
      "Clear all checked/completed items from a shopping list. " +
      "Use when user says 'clear checked items' or 'remove completed items'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listName: {
          type: SchemaType.STRING,
          description: "List name. If not provided, uses current/only active list.",
        },
      },
    },
  },

  // ── STORE + SIZE TOOLS (3) ─────────────────────────────────────────────

  {
    name: "compare_store_prices",
    description:
      "Compare prices for an item across different UK stores. " +
      "Use when user asks 'where is X cheapest?' or 'compare prices for X' or 'compare Tesco and Aldi for butter'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        itemName: {
          type: SchemaType.STRING,
          description: "The item to compare (e.g., 'milk', 'bread', 'butter')",
        },
        size: {
          type: SchemaType.STRING,
          description: "Optional size variant (e.g., '2pt', '500ml', '1kg'). Omit to compare all sizes.",
        },
      },
      required: ["itemName"],
    },
  },

  {
    name: "get_store_savings",
    description:
      "Get personalized store recommendations and potential savings. " +
      "Use when user asks 'where should I shop?' or 'how can I save money?' or 'which store is cheapest for me?'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },

  {
    name: "set_preferred_stores",
    description:
      "Set user's preferred/favorite stores. " +
      "Use when user says 'I shop at Tesco and Aldi' or 'my favorite store is Lidl' or 'set my stores to Aldi and Lidl'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        stores: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "List of store names (e.g., 'Tesco', 'Aldi', 'Lidl')",
        },
      },
      required: ["stores"],
    },
  },

  // ── SIZE/PRICE EDITING TOOLS (Phase 6.4, 6.5) ────────────────────────────

  {
    name: "change_item_size",
    description:
      "Change the size of an item in the shopping list. " +
      "Use when user says things like 'change milk to 4 pints' or 'make the butter 500g' or 'switch eggs to 12 pack'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listId: {
          type: SchemaType.STRING,
          description: "The ID of the shopping list",
        },
        itemName: {
          type: SchemaType.STRING,
          description: "The name of the item to change (e.g., 'milk', 'butter')",
        },
        newSize: {
          type: SchemaType.STRING,
          description: "The new size (e.g., '4pt', '500g', '1L', '12pk')",
        },
      },
      required: ["listId", "itemName", "newSize"],
    },
  },

  {
    name: "edit_last_item",
    description:
      "Edit the most recently added item in the shopping list. " +
      "Use when user says 'actually make that 2' or 'change quantity to 3' or 'make it 4 pints instead' or 'update the last one'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listId: {
          type: SchemaType.STRING,
          description: "The ID of the shopping list",
        },
        quantity: {
          type: SchemaType.NUMBER,
          description: "New quantity (optional)",
        },
        size: {
          type: SchemaType.STRING,
          description: "New size (optional, e.g., '4pt', '500g')",
        },
      },
      required: ["listId"],
    },
  },
];

// ─── Write tool names ───────────────────────────────────────────────────

const WRITE_TOOLS = new Set([
  "create_shopping_list",
  "add_items_to_list",
  "update_stock_level",
  "check_off_item",
  "add_pantry_item",
  "update_list_budget",
  "delete_list",
  "remove_list_item",
  "remove_pantry_item",
  "clear_checked_items",
  "set_preferred_stores",
  "change_item_size",
  "edit_last_item",
]);

// ─── System Prompt ─────────────────────────────────────────────────────

export interface VoiceContext {
  currentScreen: string;
  activeListId?: string;
  activeListName?: string;
  activeListBudget?: number;
  activeListSpent?: number;
  activeListsCount?: number;
  lowStockCount?: number;
  userName?: string;
}

export function buildSystemPrompt(context: VoiceContext): string {
  const activeListInfo = context.activeListId
    ? `"${context.activeListName}" (id: ${context.activeListId})`
    : "none";

  const budgetInfo = context.activeListBudget
    ? `Budget: £${context.activeListBudget}, Spent: £${context.activeListSpent || 0}, Remaining: £${Math.max(0, (context.activeListBudget || 0) - (context.activeListSpent || 0))}`
    : "No budget set";

  return `You are Tobi, the friendly voice assistant for Oja, a UK grocery shopping app.

PERSONALITY:
- Your name is Tobi — use it when introducing yourself or when relevant
- Warm, supportive, encouraging — like a helpful British-Nigerian friend who's great at budgeting
- Use British English (£, "brilliant", "lovely", "mate")
- Keep responses concise (2-3 sentences max — this is spoken aloud)
- ${context.userName ? `The user's name is ${context.userName}. Use it occasionally to be friendly.` : ""}
- Celebrate wins ("Nice one! You've saved £23 this week!")
- Be empathetic about overspending ("No worries, happens to everyone")

FULL CAPABILITIES (you can do ALL of these):

READ Operations:
- get_pantry_items: Check pantry stock (filter by: stocked, low, out)
- get_active_lists: See all active shopping lists
- get_list_items: See items on a specific list
- get_list_details: Get full details about a list (items, budget, spent, remaining)
- get_budget_status: Check budget status (spent, remaining, percentage)
- get_app_summary: Get overview of entire app (lists count, low stock items, savings)
- get_price_estimate: Check current price for any item
- get_price_stats: Get price history and cheapest store for an item
- get_price_trend: See if an item's price is rising or falling
- get_item_variants: Get size options and prices (e.g., milk 1pt, 2pt, 4pt)
- get_weekly_digest: This week's spending summary
- get_savings_jar: Total cumulative savings
- get_streaks: Activity streaks
- get_achievements: Unlocked badges
- get_monthly_trends: 6-month spending trends
- compare_store_prices: Compare prices across UK stores for an item (optionally by size)
- get_store_savings: Get personalized store recommendation and potential monthly savings

WRITE Operations:
- create_shopping_list: Create a new list (with optional name and budget)
- add_items_to_list: Add items to a list (accepts size like "2pt" or "500g")
- update_list_budget: Change a list's budget
- update_stock_level: Mark pantry items as stocked/low/out
- check_off_item: Check off items while shopping
- add_pantry_item: Add new items to pantry
- delete_list: Delete a shopping list (requires confirmation)
- remove_list_item: Remove an item from a list
- remove_pantry_item: Remove an item from pantry
- clear_checked_items: Clear all checked items from a list
- set_preferred_stores: Set user's favorite stores (e.g., "Tesco and Aldi")
- change_item_size: Change the size of an item (e.g., "change milk to 2 pints")
- edit_last_item: Edit the most recently added item (size, quantity, or price)

RULES FOR WRITE OPERATIONS (IMPORTANT):
- NEVER ask "Would you like me to do X?" or "Shall I confirm?" — if user asks for something, just DO it.
- If REQUIRED info is missing, ASK for it conversationally:
  - User: "Create a list" → Just create it with default name "Shopping List"
  - User: "Add milk" (multiple lists) → You: "Which list should I add it to?"
- Once you have all required info, call the function and tell them it's done.
- User intent = permission. "Create a list" means they want a list created.
- For DELETE operations: Always confirm before deleting ("Are you sure you want to delete X?")

RULES FOR READ OPERATIONS:
- Call the function, then summarise the data conversationally.
- If no data: "I don't have data for that yet — keep shopping and I'll learn!"

SIZE & PRICE INTELLIGENCE:
- When you add items, I'll use your usual size from past purchases (e.g., if you always buy 2pt milk, that's what I'll add)
- You can specify sizes like "add 4 pints of milk" or "add 500g butter"
- I'll tell you the price at your selected store for that size
- Say "change milk to 2 pints" or "make the butter 500g" to adjust sizes
- Say "edit last item" or "change that to 2" to modify what you just added
- I remember your usual sizes so you don't have to repeat them

CONTEXT AWARENESS:
- When user says "this list" or "my list" or "the budget" — use the active list context below
- When user says "my pantry" or "what am I running low on" — use get_pantry_items
- When user asks "how many lists" — use get_active_lists or get_app_summary

GENERAL RULES:
- Prices in GBP: "£1.15" not "1.15 pounds".
- Never invent data. If a function returns empty, say so honestly.
- Round numbers: "about £45" not "£44.73".

CURRENT CONTEXT:
- Screen: ${context.currentScreen}
- Active list: ${activeListInfo}
- ${budgetInfo}
- Active lists count: ${context.activeListsCount ?? "unknown"}
- Items running low: ${context.lowStockCount ?? "unknown"}`;
}

// ─── Tool Dispatcher ───────────────────────────────────────────────────

export interface ToolResult {
  type: "data" | "confirm";
   
  result: any;
}

export async function executeVoiceTool(
  ctx: ActionCtx,
  functionName: string,
   
  args: Record<string, any>
): Promise<ToolResult> {
  // ── Execute operations and return results ──
  try {
    // ── WRITE operations → execute immediately ──
    if (WRITE_TOOLS.has(functionName)) {
      return await executeWriteTool(ctx, functionName, args);
    }

    // ── READ operations → execute query and return data ──
    switch (functionName) {
      case "get_pantry_items": {
        const items = await ctx.runQuery(api.pantryItems.getByUser, {});
        const filtered = args.stockFilter
           
          ? items.filter((i: any) => i.stockLevel === args.stockFilter)
          : items;
        return {
          type: "data",
          result: filtered.map(
             
            (i: any) => ({
              name: i.name,
              category: i.category,
              stockLevel: i.stockLevel,
              lastPrice: i.lastPrice,
              defaultSize: i.defaultSize,
              defaultUnit: i.defaultUnit,
            })
          ),
        };
      }

      case "get_active_lists": {
        const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
        return {
          type: "data",
           
          result: lists.map((l: any) => ({
            id: l._id,
            name: l.name,
            status: l.status,
            budget: l.budget,
            storeName: l.storeName,
            itemCount: l.itemCount,
          })),
        };
      }

      case "get_list_items": {
        const items = await ctx.runQuery(api.listItems.getByList, {
          listId: args.listId as Id<"shoppingLists">,
        });
        return {
          type: "data",
           
          result: items.map((i: any) => ({
            name: i.name,
            quantity: i.quantity,
            estimatedPrice: i.estimatedPrice,
            isChecked: i.isChecked,
            priority: i.priority,
          })),
        };
      }

      case "get_price_estimate": {
        const estimate = await ctx.runQuery(api.currentPrices.getEstimate, {
          itemName: args.itemName,
        });
        return { type: "data", result: estimate };
      }

      case "get_price_stats": {
        const stats = await ctx.runQuery(api.priceHistory.getPriceStats, {
          itemName: args.itemName,
        });
        return { type: "data", result: stats };
      }

      case "get_price_trend": {
        const trend = await ctx.runQuery(api.priceHistory.getPriceTrend, {
          itemName: args.itemName,
        });
        return { type: "data", result: trend };
      }

      case "get_weekly_digest": {
        const digest = await ctx.runQuery(api.insights.getWeeklyDigest, {});
        return { type: "data", result: digest };
      }

      case "get_savings_jar": {
        const jar = await ctx.runQuery(api.insights.getSavingsJar, {});
        return { type: "data", result: jar };
      }

      case "get_streaks": {
        const streaks = await ctx.runQuery(api.insights.getStreaks, {});
        return { type: "data", result: streaks };
      }

      case "get_achievements": {
        const achievements = await ctx.runQuery(
          api.insights.getAchievements,
          {}
        );
        return { type: "data", result: achievements };
      }

      case "get_item_variants": {
        const variants = await ctx.runQuery(api.itemVariants.getWithPrices, {
          baseItem: args.baseItem,
        });
        return { type: "data", result: variants };
      }

      case "get_monthly_trends": {
        const trends = await ctx.runQuery(api.insights.getMonthlyTrends, {});
        return { type: "data", result: trends };
      }

      case "get_budget_status": {
        const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
         
        let targetList: any = null;

        if (args.listName) {
           
          targetList = lists.find((l: any) =>
            l.name.toLowerCase().includes(args.listName.toLowerCase())
          );
        } else if (lists.length === 1) {
          targetList = lists[0];
        } else if (lists.length > 1) {
          // Find in-progress list first, then most recent
           
          targetList = lists.find((l: any) => l.status === "shopping") || lists[0];
        }

        if (!targetList) {
          return {
            type: "data",
            result: { error: "No active list found. Create a list first." },
          };
        }

        const budget = targetList.budget || 0;
        const spent = targetList.totalEstimatedCost || 0;
        const remaining = Math.max(0, budget - spent);
        const percentUsed = budget > 0 ? Math.round((spent / budget) * 100) : 0;

        return {
          type: "data",
          result: {
            listName: targetList.name,
            budget,
            spent,
            remaining,
            percentUsed,
            status: percentUsed >= 100 ? "over_budget" : percentUsed >= 80 ? "near_limit" : "healthy",
          },
        };
      }

      case "get_list_details": {
        const allLists = await ctx.runQuery(api.shoppingLists.getActive, {});
         
        let list: any = null;

        if (args.listName) {
           
          list = allLists.find((l: any) =>
            l.name.toLowerCase().includes(args.listName.toLowerCase())
          );
        } else if (allLists.length === 1) {
          list = allLists[0];
        } else if (allLists.length > 1) {
           
          list = allLists.find((l: any) => l.status === "shopping") || allLists[0];
        }

        if (!list) {
          return {
            type: "data",
            result: { error: "No active list found." },
          };
        }

        const listItems = await ctx.runQuery(api.listItems.getByList, {
          listId: list._id,
        });

        const budget = list.budget || 0;
        const spent = list.totalEstimatedCost || 0;
         
        const checkedCount = listItems.filter((i: any) => i.isChecked).length;

        return {
          type: "data",
          result: {
            name: list.name,
            status: list.status,
            budget,
            spent,
            remaining: Math.max(0, budget - spent),
            itemCount: listItems.length,
            checkedCount,
            uncheckedCount: listItems.length - checkedCount,
            storeName: list.storeName,
             
            items: listItems.slice(0, 10).map((i: any) => ({
              name: i.name,
              quantity: i.quantity,
              price: i.estimatedPrice,
              checked: i.isChecked,
            })),
          },
        };
      }

      case "get_app_summary": {
        const activeLists = await ctx.runQuery(api.shoppingLists.getActive, {});
        const pantryItems = await ctx.runQuery(api.pantryItems.getByUser, {});
        const savingsJar = await ctx.runQuery(api.insights.getSavingsJar, {});
        const weeklyDigest = await ctx.runQuery(api.insights.getWeeklyDigest, {});

         
        const lowStockItems = pantryItems.filter((i: any) => i.stockLevel === "low" || i.stockLevel === "out");
         
        const totalBudget = activeLists.reduce((sum: number, l: any) => sum + (l.budget || 0), 0);
         
        const totalEstimated = activeLists.reduce((sum: number, l: any) => sum + (l.totalEstimatedCost || 0), 0);

        return {
          type: "data",
          result: {
            activeListsCount: activeLists.length,
             
            activeListNames: activeLists.map((l: any) => l.name),
            totalBudgetAcrossLists: totalBudget,
            totalEstimatedSpend: totalEstimated,
            pantryItemsCount: pantryItems.length,
            lowStockCount: lowStockItems.length,
             
            lowStockItems: lowStockItems.slice(0, 5).map((i: any) => i.name),
            totalSavings: savingsJar?.totalSaved || 0,
            thisWeekSpent: weeklyDigest?.thisWeekTotal || 0,
            thisWeekTrips: weeklyDigest?.tripsCount || 0,
          },
        };
      }

      // ── STORE + SIZE COMPARISON TOOLS ──────────────────────────────────

      case "compare_store_prices": {
        // Get all stores to compare
        const allStores = await ctx.runQuery(api.stores.getAll, {});
         
        const storeIds = allStores.map((s: any) => s.id);

        const comparison = await ctx.runQuery(api.currentPrices.getComparisonByStores, {
          itemName: args.itemName,
          size: args.size,
          storeIds,
        });

        if (comparison.storesWithData === 0) {
          return {
            type: "data",
            result: {
              itemName: args.itemName,
              size: args.size,
              message: `I don't have price data for ${args.itemName} yet. Keep scanning receipts and I'll learn!`,
              noData: true,
            },
          };
        }

        // Build a list of stores with prices, sorted cheapest first
        const pricesWithStores = Object.entries(comparison.byStore)
          .filter(([, data]) => data !== null)
          .map(([storeId, data]) => {
             
            const storeInfo = allStores.find((s: any) => s.id === storeId);
            return {
              storeId,
              storeName: storeInfo?.displayName ?? storeId,
               
              price: (data as any).price,
               
              size: (data as any).size,
               
              unit: (data as any).unit,
            };
          })
          .sort((a, b) => a.price - b.price);

        const cheapest = pricesWithStores[0];
        const mostExpensive = pricesWithStores[pricesWithStores.length - 1];
        const savings = mostExpensive.price - cheapest.price;

        return {
          type: "data",
          result: {
            itemName: args.itemName,
            size: args.size,
            cheapestStore: cheapest.storeName,
            cheapestPrice: cheapest.price,
            averagePrice: comparison.averagePrice,
            storesCompared: pricesWithStores.length,
            allPrices: pricesWithStores.slice(0, 5), // Top 5 stores
            potentialSavings: Math.round(savings * 100) / 100,
            message: `${args.itemName} is cheapest at ${cheapest.storeName} for £${cheapest.price.toFixed(2)}${savings > 0 ? ` — you could save £${savings.toFixed(2)} compared to ${mostExpensive.storeName}` : ""}`,
          },
        };
      }

      case "get_store_savings": {
        const recommendation = await ctx.runQuery(api.stores.getStoreRecommendation, {});

        if (!recommendation) {
          return {
            type: "data",
            result: {
              message: "I need more shopping data to make recommendations. Keep scanning receipts!",
              noData: true,
            },
          };
        }

        return {
          type: "data",
          result: {
            recommendedStore: recommendation.storeName,
            potentialMonthlySavings: recommendation.potentialMonthlySavings,
            itemCount: recommendation.itemCount,
            message: recommendation.message,
            alternatives: recommendation.alternativeStores?.slice(0, 2).map((s) => ({
              store: s.storeName,
              savings: s.potentialSavings,
            })),
          },
        };
      }

      default:
        return { type: "data", result: { error: `Unknown function: ${functionName}` } };
    }
  } catch (error) {
    console.error(`[voiceTool] Error executing ${functionName}:`, error);
    return {
      type: "data",
      result: { error: `Failed to fetch data for ${functionName}` },
    };
  }
}

// ─── Write Tool Executor ────────────────────────────────────────────────

async function executeWriteTool(
  ctx: ActionCtx,
  functionName: string,
   
  args: Record<string, any>
): Promise<ToolResult> {
  switch (functionName) {
    case "create_shopping_list": {
      // Default name: "18th Feb '26 Shopping List"
      let listName = args.name;
      if (!listName) {
        const now = new Date();
        const day = now.getDate();
        const ord = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
        const mon = now.toLocaleDateString("en-GB", { month: "short" });
        const yr = `'${String(now.getFullYear()).slice(-2)}`;
        listName = `${day}${ord} ${mon} ${yr} Shopping List`;
      }

      const listId = await ctx.runMutation(api.shoppingLists.create, {
        name: listName,
        budget: args.budget ?? 50,
        storeName: args.storeName,
      });
      return {
        type: "data",
        result: {
          success: true,
          listId,
          message: `Created your shopping list${args.budget ? ` with £${args.budget} budget` : ""}`,
        },
      };
    }

    case "add_items_to_list": {
      // If no listId provided, try to find the list by name or use the only active list
      let targetListId = args.listId as Id<"shoppingLists"> | undefined;
       
      let targetList: any = null;

      if (!targetListId && args.listName) {
        // Try to find list by name
        const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
         
        const match = lists.find((l: any) =>
          l.name.toLowerCase().includes(args.listName.toLowerCase())
        );
        if (match) {
          targetListId = match._id;
          targetList = match;
        }
      }

      if (!targetListId) {
        // Check if there's only one active list
        const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
        if (lists.length === 1) {
          targetListId = lists[0]._id;
          targetList = lists[0];
        } else if (lists.length === 0) {
          return {
            type: "data",
            result: { success: false, error: "No active lists found. Create a list first." },
          };
        } else {
          // Multiple lists - Gemini should have asked which one
          return {
            type: "data",
            result: {
              success: false,
              error: "Multiple lists found. Please specify which list.",
               
              availableLists: lists.map((l: any) => l.name),
            },
          };
        }
      }

      // Get store from target list for price lookups
      const storeId = targetList?.normalizedStoreId || targetList?.storeName || "";

      // Add each item with size and price (Zero-Blank rule + Smart Size Selection)
      interface AddedItemInfo {
        name: string;
        quantity: number;
        size?: string;
        price?: number;
      }
      const addedItems: AddedItemInfo[] = [];

      for (const item of args.items || []) {
        const quantity = item.quantity || 1;
        let size: string | undefined = item.size;
        let unit: string | undefined = item.unit;
        let estimatedPrice: number | undefined;
        let priceSource: "personal" | "crowdsourced" | "ai" | undefined;

        // Smart default size selection if size not provided and store is set
        if (!size && storeId) {
          try {
            const sizeData = await ctx.runQuery(api.itemVariants.getSizesForStore, {
              itemName: item.name,
              store: storeId,
            });

            if (sizeData && sizeData.defaultSize) {
              // Use the default size (user's usual or most common)
              size = sizeData.defaultSize;

              // Find the price for this size
               
              const sizeInfo = sizeData.sizes.find((s: any) => s.size === size);
              if (sizeInfo) {
                estimatedPrice = sizeInfo.price ?? undefined;
                priceSource = sizeInfo.source;
                // Extract unit from parsed size if available
                if (sizeInfo.sizeNormalized) {
                  // Parse unit from normalized size (e.g., "2pt" -> "pt")
                  const match = sizeInfo.sizeNormalized.match(/(\d+(?:\.\d+)?)\s*(.+)/);
                  if (match) {
                    unit = match[2];
                  }
                }
              }
            }
          } catch {
            console.warn(`[Voice] Could not get sizes for "${item.name}" at "${storeId}"`);
          }
        }

        // If size was provided explicitly, look up the price for that size
        if (size && !estimatedPrice && storeId) {
          try {
            const sizeData = await ctx.runQuery(api.itemVariants.getSizesForStore, {
              itemName: item.name,
              store: storeId,
            });

            if (sizeData && sizeData.sizes.length > 0) {
              // Find the matching size (normalize for comparison)
              const normalizedInputSize = size.toLowerCase().replace(/\s+/g, "");
               
              const sizeInfo = sizeData.sizes.find((s: any) => {
                const normalizedSize = s.size?.toLowerCase().replace(/\s+/g, "") || "";
                const normalizedDisplay = s.sizeNormalized?.toLowerCase().replace(/\s+/g, "") || "";
                return normalizedSize === normalizedInputSize || normalizedDisplay === normalizedInputSize;
              });

              if (sizeInfo) {
                estimatedPrice = sizeInfo.price ?? undefined;
                priceSource = sizeInfo.source;
              }
            }
          } catch {
            console.warn(`[Voice] Could not get price for "${item.name}" size "${size}"`);
          }
        }

        // Fallback to AI price estimation if we still don't have a price
        if (!estimatedPrice) {
          try {
            const identity = await ctx.auth.getUserIdentity();
            const currentUser = identity
              ? await ctx.runQuery(api.users.getCurrent, {})
              : null;
            if (currentUser) {
              const priceResult = await ctx.runAction(api.ai.estimateItemPrice, {
                itemName: item.name,
                userId: currentUser._id,
              });
              if (priceResult) {
                estimatedPrice = priceResult.estimatedPrice;
                priceSource = "ai";
              }
            }
          } catch {
            console.warn(`[Voice] Could not estimate price for "${item.name}"`);
          }
        }

        // Create the list item with size and price
        await ctx.runMutation(api.listItems.create, {
          listId: targetListId,
          name: item.name,
          quantity,
          size,
          unit,
          estimatedPrice,
          priceSource,
          force: true,
        });

        addedItems.push({
          name: item.name,
          quantity,
          size,
          price: estimatedPrice,
        });
      }

      // Build voice-friendly response message with size and price
      // Format: "Added 2 pints of milk at £1.45" or "Added milk and bread to your list"
      const formatItemMessage = (itemInfo: AddedItemInfo): string => {
        const qty = itemInfo.quantity > 1 ? `${itemInfo.quantity} ` : "";
        const sizeText = itemInfo.size ? `${qty}${itemInfo.size} of ` : (itemInfo.quantity > 1 ? `${itemInfo.quantity} ` : "");
        const priceText = itemInfo.price ? ` at £${itemInfo.price.toFixed(2)}` : "";
        return `${sizeText}${itemInfo.name}${priceText}`;
      };

      let message: string;
      if (addedItems.length === 1) {
        message = `Added ${formatItemMessage(addedItems[0])}`;
      } else if (addedItems.length === 2) {
        message = `Added ${formatItemMessage(addedItems[0])} and ${formatItemMessage(addedItems[1])}`;
      } else {
        // For 3+ items, list first few with prices, then summarize
        const itemNames = addedItems.map((i) => i.name);
        message = `Added ${itemNames.slice(0, -1).join(", ")} and ${itemNames[itemNames.length - 1]} to your list`;
      }

      return {
        type: "data",
        result: {
          success: true,
          message,
          itemsAdded: addedItems.length,
          items: addedItems, // Include detailed info for potential follow-up
        },
      };
    }

    case "update_stock_level": {
      // Find the pantry item
      const items = await ctx.runQuery(api.pantryItems.getByUser, {});
       
      const match = items.find((i: any) =>
        i.name.toLowerCase().includes(args.itemName.toLowerCase())
      );

      if (!match) {
        return {
          type: "data",
          result: { success: false, error: `Couldn't find "${args.itemName}" in your pantry.` },
        };
      }

      await ctx.runMutation(api.pantryItems.updateStockLevel, {
        id: match._id,
        stockLevel: args.stockLevel,
      });

      return {
        type: "data",
        result: {
          success: true,
          message: `Marked ${match.name} as ${args.stockLevel}`,
        },
      };
    }

    case "check_off_item": {
      // Need listId - use active list context or find it
      let targetListId = args.listId as Id<"shoppingLists"> | undefined;

      if (!targetListId) {
        const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
         
        const inProgress = lists.find((l: any) => l.status === "in_progress");
        if (inProgress) {
          targetListId = inProgress._id;
        } else if (lists.length === 1) {
          targetListId = lists[0]._id;
        } else {
          return {
            type: "data",
            result: { success: false, error: "Please specify which list." },
          };
        }
      }

      // Find and check off the item
      const listItems = await ctx.runQuery(api.listItems.getByList, { listId: targetListId });
       
      const itemMatch = listItems.find((i: any) =>
        i.name.toLowerCase().includes(args.itemName.toLowerCase())
      );

      if (!itemMatch) {
        return {
          type: "data",
          result: { success: false, error: `Couldn't find "${args.itemName}" on your list.` },
        };
      }

      await ctx.runMutation(api.listItems.toggleChecked, { id: itemMatch._id });

      return {
        type: "data",
        result: {
          success: true,
          message: `Checked off ${itemMatch.name}`,
        },
      };
    }

    case "add_pantry_item": {
      // Get current user for price estimation
      const pantryIdentity = await ctx.auth.getUserIdentity();
      const pantryUser = pantryIdentity
        ? await ctx.runQuery(api.users.getCurrent, {})
        : null;

      // Get price estimate for the item (Zero-Blank rule)
      let lastPrice: number | undefined;
      if (pantryUser) {
        try {
          const priceResult = await ctx.runAction(api.ai.estimateItemPrice, {
            itemName: args.name,
            userId: pantryUser._id,
          });
          if (priceResult) {
            lastPrice = priceResult.estimatedPrice;
          }
        } catch {
          console.warn(`[Voice] Could not estimate price for pantry item "${args.name}"`);
        }
      }

      await ctx.runMutation(api.pantryItems.create, {
        name: args.name,
        category: args.category || "Other",
        stockLevel: args.stockLevel || "low",
        lastPrice,
        priceSource: lastPrice ? "ai_estimate" : undefined,
      });

      return {
        type: "data",
        result: {
          success: true,
          message: `Added ${args.name} to your pantry`,
        },
      };
    }

    case "update_list_budget": {
      const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
       
      let targetList: any = null;

      if (args.listName) {
         
        targetList = lists.find((l: any) =>
          l.name.toLowerCase().includes(args.listName.toLowerCase())
        );
      } else if (lists.length === 1) {
        targetList = lists[0];
      } else if (lists.length > 1) {
         
        targetList = lists.find((l: any) => l.status === "shopping") || lists[0];
      }

      if (!targetList) {
        return {
          type: "data",
          result: { success: false, error: "No active list found to update." },
        };
      }

      await ctx.runMutation(api.shoppingLists.update, {
        id: targetList._id,
        budget: args.budget,
      });

      return {
        type: "data",
        result: {
          success: true,
          message: `Updated ${targetList.name} budget to £${args.budget}`,
          listName: targetList.name,
          newBudget: args.budget,
        },
      };
    }

    case "delete_list": {
      if (!args.confirmed) {
        // Return info for confirmation - Gemini should ask user to confirm
        const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
         
        const targetList = lists.find((l: any) =>
          l.name.toLowerCase().includes(args.listName.toLowerCase())
        );

        if (!targetList) {
          return {
            type: "data",
            result: { success: false, error: `Couldn't find a list named "${args.listName}".` },
          };
        }

        // Get item count for confirmation message
        const listItems = await ctx.runQuery(api.listItems.getByList, {
          listId: targetList._id,
        });
        const itemCount = listItems.length;

        return {
          type: "data",
          result: {
            success: false,
            needsConfirmation: true,
            listName: targetList.name,
            itemCount,
            message: `Are you sure you want to delete "${targetList.name}"? It has ${itemCount} items.`,
          },
        };
      }

      // User confirmed - proceed with deletion
      const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
       
      const targetList = lists.find((l: any) =>
        l.name.toLowerCase().includes(args.listName.toLowerCase())
      );

      if (!targetList) {
        return {
          type: "data",
          result: { success: false, error: `Couldn't find a list named "${args.listName}".` },
        };
      }

      await ctx.runMutation(api.shoppingLists.remove, { id: targetList._id });

      return {
        type: "data",
        result: {
          success: true,
          message: `Deleted "${targetList.name}"`,
        },
      };
    }

    case "remove_list_item": {
      const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
       
      let targetList: any = null;

      if (args.listName) {
         
        targetList = lists.find((l: any) =>
          l.name.toLowerCase().includes(args.listName.toLowerCase())
        );
      } else if (lists.length === 1) {
        targetList = lists[0];
      } else if (lists.length > 1) {
         
        targetList = lists.find((l: any) => l.status === "shopping") || lists[0];
      }

      if (!targetList) {
        return {
          type: "data",
          result: { success: false, error: "No active list found." },
        };
      }

      const listItems = await ctx.runQuery(api.listItems.getByList, {
        listId: targetList._id,
      });

       
      const itemToRemove = listItems.find((i: any) =>
        i.name.toLowerCase().includes(args.itemName.toLowerCase())
      );

      if (!itemToRemove) {
        return {
          type: "data",
          result: { success: false, error: `Couldn't find "${args.itemName}" on ${targetList.name}.` },
        };
      }

      await ctx.runMutation(api.listItems.remove, { id: itemToRemove._id });

      return {
        type: "data",
        result: {
          success: true,
          message: `Removed ${itemToRemove.name} from ${targetList.name}`,
        },
      };
    }

    case "remove_pantry_item": {
      const items = await ctx.runQuery(api.pantryItems.getByUser, {});
       
      const itemToRemove = items.find((i: any) =>
        i.name.toLowerCase().includes(args.itemName.toLowerCase())
      );

      if (!itemToRemove) {
        return {
          type: "data",
          result: { success: false, error: `Couldn't find "${args.itemName}" in your pantry.` },
        };
      }

      await ctx.runMutation(api.pantryItems.remove, { id: itemToRemove._id });

      return {
        type: "data",
        result: {
          success: true,
          message: `Removed ${itemToRemove.name} from your pantry`,
        },
      };
    }

    case "clear_checked_items": {
      const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
       
      let targetList: any = null;

      if (args.listName) {
         
        targetList = lists.find((l: any) =>
          l.name.toLowerCase().includes(args.listName.toLowerCase())
        );
      } else if (lists.length === 1) {
        targetList = lists[0];
      } else if (lists.length > 1) {
         
        targetList = lists.find((l: any) => l.status === "shopping") || lists[0];
      }

      if (!targetList) {
        return {
          type: "data",
          result: { success: false, error: "No active list found." },
        };
      }

      const listItems = await ctx.runQuery(api.listItems.getByList, {
        listId: targetList._id,
      });

       
      const checkedItems = listItems.filter((i: any) => i.isChecked);

      if (checkedItems.length === 0) {
        return {
          type: "data",
          result: { success: true, message: "No checked items to clear." },
        };
      }

      // Remove all checked items
      for (const item of checkedItems) {
        await ctx.runMutation(api.listItems.remove, { id: item._id });
      }

      return {
        type: "data",
        result: {
          success: true,
          message: `Cleared ${checkedItems.length} checked item${checkedItems.length !== 1 ? "s" : ""} from ${targetList.name}`,
          itemsRemoved: checkedItems.length,
        },
      };
    }

    case "set_preferred_stores": {
      // Normalize store names to store IDs
      const allStores = await ctx.runQuery(api.stores.getAll, {});
      const validStoreIds: string[] = [];
      const unrecognizedStores: string[] = [];

      for (const storeName of args.stores || []) {
        // Find matching store by name (case-insensitive fuzzy match)
        const normalizedInput = storeName.toLowerCase().trim();
         
        const match = allStores.find((s: any) => {
          const displayLower = s.displayName.toLowerCase();
          const idLower = s.id.toLowerCase();
          return (
            displayLower === normalizedInput ||
            idLower === normalizedInput ||
            displayLower.includes(normalizedInput) ||
            normalizedInput.includes(displayLower)
          );
        });

        if (match) {
           
          validStoreIds.push((match as any).id);
        } else {
          unrecognizedStores.push(storeName);
        }
      }

      if (validStoreIds.length === 0) {
        return {
          type: "data",
          result: {
            success: false,
            error: `I didn't recognise any of those stores. Try UK stores like Tesco, Aldi, Lidl, Sainsbury's, or Morrisons.`,
            unrecognizedStores,
          },
        };
      }

      // Save the preferences
      await ctx.runMutation(api.stores.setUserPreferences, {
        favorites: validStoreIds,
      });

      // Get display names for response
       
      const savedStoreNames = validStoreIds.map((id) => {
         
        const store = allStores.find((s: any) => s.id === id);
         
        return store ? (store as any).displayName : id;
      });

      let message = `Lovely! I've set ${savedStoreNames.join(" and ")} as your preferred ${validStoreIds.length === 1 ? "store" : "stores"}.`;
      if (unrecognizedStores.length > 0) {
        message += ` (I didn't recognise: ${unrecognizedStores.join(", ")})`;
      }

      return {
        type: "data",
        result: {
          success: true,
          message,
          savedStores: savedStoreNames,
          unrecognizedStores: unrecognizedStores.length > 0 ? unrecognizedStores : undefined,
        },
      };
    }

    // ── SIZE/PRICE EDITING TOOLS (Phase 6.4, 6.5) ────────────────────────────

    case "change_item_size": {
      // Find the list
      const list = await ctx.runQuery(api.shoppingLists.getById, {
        id: args.listId as Id<"shoppingLists">,
      });

      if (!list) {
        return {
          type: "data",
          result: { success: false, error: "List not found." },
        };
      }

      // Get all items on the list
      const listItems = await ctx.runQuery(api.listItems.getByList, {
        listId: args.listId as Id<"shoppingLists">,
      });

      // Find the item by name (fuzzy match)
       
      const itemMatch = listItems.find((i: any) =>
        i.name.toLowerCase().includes(args.itemName.toLowerCase())
      );

      if (!itemMatch) {
        return {
          type: "data",
          result: { success: false, error: `Couldn't find "${args.itemName}" on your list.` },
        };
      }

      // Parse the new size
      const normalizedItem = itemMatch.name.toLowerCase().trim();
      const storeName = list.normalizedStoreId || list.storeName || "tesco";

      // Get available sizes for this item at this store
      const sizesResult = await ctx.runQuery(api.itemVariants.getSizesForStore, {
        itemName: normalizedItem,
        store: storeName,
      });

      // Find matching size from available sizes
      const newSizeLower = args.newSize.toLowerCase().replace(/\s+/g, "");
       
      const matchingSize = sizesResult.sizes.find((s: any) => {
        const sizeLower = (s.size || "").toLowerCase().replace(/\s+/g, "");
        const sizeNormLower = (s.sizeNormalized || "").toLowerCase().replace(/\s+/g, "");
        return sizeLower === newSizeLower ||
               sizeNormLower === newSizeLower ||
               sizeLower.includes(newSizeLower) ||
               newSizeLower.includes(sizeLower);
      });

      // Get price for the new size
      let newPrice = itemMatch.estimatedPrice;
      let sizeDisplay = args.newSize;

      if (matchingSize) {
        newPrice = matchingSize.price ?? itemMatch.estimatedPrice;
        sizeDisplay = matchingSize.sizeNormalized || matchingSize.size || args.newSize;
      }

      // Update the item
      await ctx.runMutation(api.listItems.update, {
        id: itemMatch._id,
        size: sizeDisplay,
        estimatedPrice: newPrice,
        sizeOverride: true,
      });

      const priceStr = newPrice ? `at £${newPrice.toFixed(2)}` : "";
      return {
        type: "data",
        result: {
          success: true,
          message: `Changed ${itemMatch.name} to ${sizeDisplay} ${priceStr}`.trim(),
          itemName: itemMatch.name,
          newSize: sizeDisplay,
          newPrice,
        },
      };
    }

    case "edit_last_item": {
      // Get all items on the list, sorted by creation time
      const listItems = await ctx.runQuery(api.listItems.getByList, {
        listId: args.listId as Id<"shoppingLists">,
      });

      if (listItems.length === 0) {
        return {
          type: "data",
          result: { success: false, error: "No items on this list to edit." },
        };
      }

      // Find the most recently added item (by _creationTime)
       
      const sortedItems = [...listItems].sort((a: any, b: any) =>
        (b._creationTime || 0) - (a._creationTime || 0)
      );
      const lastItem = sortedItems[0];

      // Check if at least one update field is provided
      if (args.quantity === undefined && args.size === undefined) {
        return {
          type: "data",
          result: { success: false, error: "Please specify what to change (quantity or size)." },
        };
      }

      // Build update object
       
      const updates: Record<string, any> = {};
      const changes: string[] = [];

      if (args.quantity !== undefined) {
        updates.quantity = args.quantity;
        changes.push(`quantity to ${args.quantity}`);
      }

      // Handle size change with price lookup
      if (args.size !== undefined) {
        // Get the list to find store
        const list = await ctx.runQuery(api.shoppingLists.getById, {
          id: args.listId as Id<"shoppingLists">,
        });
        const storeName = list?.normalizedStoreId || list?.storeName || "tesco";

        // Get available sizes for this item at this store
        const sizesResult = await ctx.runQuery(api.itemVariants.getSizesForStore, {
          itemName: lastItem.name.toLowerCase().trim(),
          store: storeName,
        });

        // Find matching size from available sizes
        const newSizeLower = args.size.toLowerCase().replace(/\s+/g, "");
         
        const matchingSize = sizesResult.sizes.find((s: any) => {
          const sizeLower = (s.size || "").toLowerCase().replace(/\s+/g, "");
          const sizeNormLower = (s.sizeNormalized || "").toLowerCase().replace(/\s+/g, "");
          return sizeLower === newSizeLower ||
                 sizeNormLower === newSizeLower ||
                 sizeLower.includes(newSizeLower) ||
                 newSizeLower.includes(sizeLower);
        });

        if (matchingSize) {
          updates.size = matchingSize.sizeNormalized || matchingSize.size;
          updates.estimatedPrice = matchingSize.price;
          updates.sizeOverride = true;
          changes.push(`${matchingSize.sizeNormalized || matchingSize.size} at £${(matchingSize.price || 0).toFixed(2)}`);
        } else {
          // Use the size as-is if no match found
          updates.size = args.size;
          updates.sizeOverride = true;
          changes.push(args.size);
        }
      }

      // Apply updates
      await ctx.runMutation(api.listItems.update, {
        id: lastItem._id,
        ...updates,
      });

      return {
        type: "data",
        result: {
          success: true,
          message: `Updated ${lastItem.name} to ${changes.join(", ")}`,
          itemName: lastItem.name,
          ...updates,
        },
      };
    }

    default:
      return {
        type: "data",
        result: { success: false, error: `Unknown write operation: ${functionName}` },
      };
  }
}
