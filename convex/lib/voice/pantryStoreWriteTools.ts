import { api } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import type { Doc } from "../../_generated/dataModel";
import type { StoreInfo } from "./types";

/**
 * Voice Assistant WRITE Tools - Pantry & Store Operations
 *
 * Handles: update_stock_level, add_pantry_item, remove_pantry_item, set_preferred_stores
 */

export async function executePantryStoreWriteTool(
  ctx: ActionCtx,
  functionName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (functionName) {
    case "update_stock_level": {
      const items = await ctx.runQuery(api.pantryItems.getByUser, {});
      const match = items.find((i: Doc<"pantryItems">) =>
        i.name.toLowerCase().includes((args.itemName as string).toLowerCase())
      );

      if (!match) {
        return { success: false, error: `Couldn't find "${(args.itemName as string)}" in your pantry.` };
      }

      await ctx.runMutation(api.pantryItems.updateStockLevel, {
        id: match._id,
        stockLevel: (args.stockLevel as "stocked" | "low" | "out"),
      });

      return {
        success: true,
        message: `Marked ${match.name} as ${(args.stockLevel as "stocked" | "low" | "out")}`,
      };
    }

    case "add_pantry_item": {
      const pantryUser = await ctx.runQuery(api.users.getCurrent, {});
      let lastPrice: number | undefined;
      if (pantryUser) {
        try {
          const priceResult = await ctx.runAction(api.ai.estimateItemPrice, {
            itemName: (args.name as string),
            userId: pantryUser._id,
          });
          if (priceResult) {
            lastPrice = priceResult.estimatedPrice;
          }
        } catch { /* ignore */ }
      }

      await ctx.runMutation(api.pantryItems.create, {
        name: (args.name as string),
        category: (args.category as string | undefined) || "Other",
        stockLevel: (args.stockLevel as "stocked" | "low" | "out") || "low",
        lastPrice,
        priceSource: lastPrice ? "ai_estimate" : undefined,
      });

      return {
        success: true,
        message: `Added ${(args.name as string)} to your pantry`,
      };
    }

    case "remove_pantry_item": {
      const items = await ctx.runQuery(api.pantryItems.getByUser, {});
      const itemToRemove = items.find((i: Doc<"pantryItems">) =>
        i.name.toLowerCase().includes((args.itemName as string).toLowerCase())
      );

      if (!itemToRemove) {
        return { success: false, error: `Couldn't find "${(args.itemName as string)}" in your pantry.` };
      }

      await ctx.runMutation(api.pantryItems.remove, { id: itemToRemove._id });

      return {
        success: true,
        message: `Removed ${itemToRemove.name} from your pantry`,
      };
    }

    case "set_preferred_stores": {
      const allStores = await ctx.runQuery(api.stores.getAll, {});
      const validStoreIds: string[] = [];
      const unrecognizedStores: string[] = [];

      for (const storeName of (args.stores as string[] | undefined) || []) {
        const normalizedInput = storeName.toLowerCase().trim();
        const match = allStores.find((s: StoreInfo) => {
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
          validStoreIds.push(match.id);
        } else {
          unrecognizedStores.push(storeName);
        }
      }

      if (validStoreIds.length === 0) {
        return {
          success: false,
          error: `I didn't recognise any of those stores. Try UK stores like Tesco, Aldi, Lidl, Sainsbury's, or Morrisons.`,
          unrecognizedStores,
        };
      }

      await ctx.runMutation(api.stores.setUserPreferences, {
        favorites: validStoreIds,
      });

      const savedStoreNames = validStoreIds.map((id) => {
        const store = allStores.find((s: StoreInfo) => s.id === id);
        return store ? store.displayName : id;
      });

      let message = `Lovely! I've set ${savedStoreNames.join(" and ")} as your preferred ${validStoreIds.length === 1 ? "store" : "stores"}.`;
      if (unrecognizedStores.length > 0) {
        message += ` (I didn't recognise: ${unrecognizedStores.join(", ")})`;
      }

      return {
        success: true,
        message,
        savedStores: savedStoreNames,
      };
    }

    default:
      return null;
  }
}
