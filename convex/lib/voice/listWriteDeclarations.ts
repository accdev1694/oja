import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

/**
 * Voice Assistant Tool Declarations - List & Pantry WRITE Tools
 *
 * Declarations for tools that create, update, or delete shopping lists,
 * list items, and pantry items.
 */
export const listWriteFunctionDeclarations: FunctionDeclaration[] = [
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
];
