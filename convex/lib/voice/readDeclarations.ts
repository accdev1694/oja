import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

/**
 * Voice Assistant Tool Declarations - READ Tools
 *
 * Defines the read-only capabilities of Tobi for the Gemini model.
 * These tools query data without modifying anything.
 */
export const readFunctionDeclarations: FunctionDeclaration[] = [
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
];
