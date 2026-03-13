import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

/**
 * Voice Assistant Tool Declarations - Store, Size & Edit Tools
 *
 * Declarations for store comparison, preferred stores, size/price editing,
 * list completion, and general item editing tools.
 * Also exports the WRITE_TOOLS set used by the dispatcher.
 */
export const storeSizeFunctionDeclarations: FunctionDeclaration[] = [
  // ── STORE + SIZE TOOLS ─────────────────────────────────────────────

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

  // ── SIZE/PRICE EDITING TOOLS ────────────────────────────────────────

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
