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

  // ── WRITE TOOLS (5) ─ execute immediately when called ────────────────

  {
    name: "create_shopping_list",
    description:
      "Create a new shopping list. ONLY call this when you have the list name. " +
      "If user says 'create a list' without a name, ASK them what to call it first — don't call this function.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "List name, e.g. 'Aldi Shop', 'Weekly Groceries'",
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
      required: ["name"],
    },
  },

  {
    name: "add_items_to_list",
    description:
      "Add items to a shopping list. If no list is specified and user has multiple lists, " +
      "ASK which list to add to — don't guess. If only one active list, use it.",
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
];

// ─── Write tool names ───────────────────────────────────────────────────

const WRITE_TOOLS = new Set([
  "create_shopping_list",
  "add_items_to_list",
  "update_stock_level",
  "check_off_item",
  "add_pantry_item",
]);

// ─── System Prompt ─────────────────────────────────────────────────────

export function buildSystemPrompt(context: {
  currentScreen: string;
  activeListId?: string;
  activeListName?: string;
  userName?: string;
}): string {
  const activeListInfo = context.activeListId
    ? `"${context.activeListName}" (id: ${context.activeListId})`
    : "none";

  return `You are Oja, a friendly voice assistant for a UK grocery shopping app.

PERSONALITY:
- Warm, supportive, encouraging — like a helpful friend who's great at budgeting
- Use British English (£, "brilliant", "lovely")
- Keep responses concise (2-3 sentences max — this is spoken aloud)
- ${context.userName ? `The user's name is ${context.userName}.` : ""}
- Celebrate wins ("Nice one! You've saved £23 this week!")
- Be empathetic about overspending ("No worries, happens to everyone")

CAPABILITIES:
- Answer questions about pantry stock, shopping lists, prices, spending, savings, streaks, achievements
- Create lists and add items
- Update stock levels and check off items
- Compare prices across stores
- Give spending insights and trends

RULES FOR WRITE OPERATIONS (IMPORTANT):
- NEVER ask "Would you like me to do X?" or "Shall I confirm?" — if user asks for something, just DO it.
- If REQUIRED info is missing, ASK for it conversationally:
  - User: "Create a list" → You: "Sure! What would you like to call it?"
  - User: "Add milk" (multiple lists) → You: "Which list should I add it to?"
- Once you have all required info, call the function and tell them it's done.
- User intent = permission. "Create a list" means they want a list created.

RULES FOR READ OPERATIONS:
- Call the function, then summarise the data conversationally.
- If no data: "I don't have data for that yet — keep shopping and I'll learn!"

GENERAL RULES:
- Prices in GBP: "£1.15" not "1.15 pounds".
- Never invent data. If a function returns empty, say so honestly.
- Round numbers: "about £45" not "£44.73".

CONTEXT:
- Current screen: ${context.currentScreen}
- Active list: ${activeListInfo}`;
}

// ─── Tool Dispatcher ───────────────────────────────────────────────────

export interface ToolResult {
  type: "data" | "confirm";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
}

export async function executeVoiceTool(
  ctx: ActionCtx,
  functionName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? items.filter((i: any) => i.stockLevel === args.stockFilter)
          : items;
        return {
          type: "data",
          result: filtered.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>
): Promise<ToolResult> {
  switch (functionName) {
    case "create_shopping_list": {
      const listId = await ctx.runMutation(api.shoppingLists.create, {
        name: args.name,
        budget: args.budget,
        storeName: args.storeName,
      });
      return {
        type: "data",
        result: {
          success: true,
          listId,
          message: `Created list "${args.name}"${args.budget ? ` with £${args.budget} budget` : ""}`,
        },
      };
    }

    case "add_items_to_list": {
      // If no listId provided, try to find the list by name or use the only active list
      let targetListId = args.listId as Id<"shoppingLists"> | undefined;

      if (!targetListId && args.listName) {
        // Try to find list by name
        const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const match = lists.find((l: any) =>
          l.name.toLowerCase().includes(args.listName.toLowerCase())
        );
        if (match) {
          targetListId = match._id;
        }
      }

      if (!targetListId) {
        // Check if there's only one active list
        const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
        if (lists.length === 1) {
          targetListId = lists[0]._id;
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              availableLists: lists.map((l: any) => l.name),
            },
          };
        }
      }

      // Add each item
      const addedItems: string[] = [];
      for (const item of args.items || []) {
        await ctx.runMutation(api.listItems.create, {
          listId: targetListId,
          name: item.name,
          quantity: item.quantity || 1,
        });
        addedItems.push(item.name);
      }

      return {
        type: "data",
        result: {
          success: true,
          message: `Added ${addedItems.join(", ")} to your list`,
          itemsAdded: addedItems.length,
        },
      };
    }

    case "update_stock_level": {
      // Find the pantry item
      const items = await ctx.runQuery(api.pantryItems.getByUser, {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      await ctx.runMutation(api.pantryItems.create, {
        name: args.name,
        category: args.category || "Other",
        stockLevel: args.stockLevel || "stocked",
      });

      return {
        type: "data",
        result: {
          success: true,
          message: `Added ${args.name} to your pantry`,
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
