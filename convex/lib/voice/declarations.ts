import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

/**
 * Voice Assistant Tool Declarations
 * 
 * Defines the capabilities of Tobi (the voice assistant) for the Gemini model.
 */
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
  // Gap 8: Complete/finish a shopping list
  {
    name: "complete_shopping_list",
    description:
      "Mark a shopping list as completed. Use when user says 'I'm done shopping', 'finish my list', or 'complete the list'. Calculates actual total from checked items.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        listName: {
          type: SchemaType.STRING,
          description:
            "The name of the list to complete (optional — uses active list if not specified)",
        },
      },
    },
  },
  // Gap 9: Edit any item on a list by name
  {
    name: "edit_list_item",
    description:
      "Edit any item on a shopping list by name. Use when user says 'change eggs to 12', 'make the butter 500g', 'update the milk quantity to 3'. Can change quantity, size, or item name.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        itemName: {
          type: SchemaType.STRING,
          description: "The name of the item to edit (fuzzy match)",
        },
        listId: {
          type: SchemaType.STRING,
          description:
            "The ID of the list (optional — uses active list context)",
        },
        newQuantity: {
          type: SchemaType.NUMBER,
          description: "New quantity for the item (optional)",
        },
        newSize: {
          type: SchemaType.STRING,
          description:
            "New size for the item (optional, e.g., '4pt', '500g', '2kg')",
        },
        newName: {
          type: SchemaType.STRING,
          description:
            "New name for the item (optional, e.g., rename 'eggs' to 'free range eggs')",
        },
      },
      required: ["itemName"],
    },
  },
];

export const WRITE_TOOLS = new Set([
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
  "complete_shopping_list",
  "edit_list_item",
]);
