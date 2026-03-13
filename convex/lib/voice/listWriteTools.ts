import { api } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { cleanItemForStorage } from "../itemNameParser";

/**
 * Voice Assistant WRITE Tools - Shopping List Operations
 *
 * Handles: create_shopping_list, add_items_to_list, update_list_budget,
 * delete_list, remove_list_item, clear_checked_items, complete_shopping_list
 */

export async function executeListWriteTool(
  ctx: ActionCtx,
  functionName: string,
  args: Record<string, any>
): Promise<any> {
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
        success: true,
        listId,
        message: `Created your shopping list${args.budget ? ` with £${args.budget} budget` : ""}`,
      };
    }

    case "add_items_to_list": {
      let targetListId = args.listId as Id<"shoppingLists"> | undefined;
      let targetList: any = null;

      if (!targetListId && args.listName) {
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
        const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
        if (lists.length === 1) {
          targetListId = lists[0]._id;
          targetList = lists[0];
        } else if (lists.length === 0) {
          return { success: false, error: "No active lists found. Create a list first." };
        } else {
          return {
            success: false,
            error: "Multiple lists found. Please specify which list.",
            availableLists: lists.map((l: any) => l.name),
          };
        }
      }

      const storeId = targetList?.normalizedStoreId || targetList?.storeName || "";
      const addedItems: any[] = [];

      for (const item of args.items || []) {
        const quantity = item.quantity || 1;
        let size: string | undefined = item.size;
        let unit: string | undefined = item.unit;
        let estimatedPrice: number | undefined;
        let priceSource: "personal" | "crowdsourced" | "ai" | "manual" | undefined;

        if (!size && storeId) {
          try {
            const sizeData = await ctx.runQuery(api.itemVariants.getSizesForStore, {
              itemName: item.name,
              store: storeId,
            });

            if (sizeData && sizeData.defaultSize) {
              size = sizeData.defaultSize;
              const sizeInfo = sizeData.sizes.find((s: any) => s.size === size);
              if (sizeInfo) {
                estimatedPrice = sizeInfo.price ?? undefined;
                priceSource = sizeInfo.source as any;
                if (sizeInfo.sizeNormalized) {
                  const match = sizeInfo.sizeNormalized.match(/(\d+(?:\.\d+)?)\s*(.+)/);
                  if (match) unit = match[2];
                }
              }
            }
          } catch { /* ignore */ }
        }

        if (size && !estimatedPrice && storeId) {
          try {
            const sizeData = await ctx.runQuery(api.itemVariants.getSizesForStore, {
              itemName: item.name,
              store: storeId,
            });

            if (sizeData && sizeData.sizes.length > 0) {
              const normalizedInputSize = size.toLowerCase().replace(/\s+/g, "");
              const sizeInfo = sizeData.sizes.find((s: any) => {
                const normalizedSize = s.size?.toLowerCase().replace(/\s+/g, "") || "";
                const normalizedDisplay = s.sizeNormalized?.toLowerCase().replace(/\s+/g, "") || "";
                return normalizedSize === normalizedInputSize || normalizedDisplay === normalizedInputSize;
              });

              if (sizeInfo) {
                estimatedPrice = sizeInfo.price ?? undefined;
                priceSource = sizeInfo.source as any;
              }
            }
          } catch { /* ignore */ }
        }

        if (!estimatedPrice) {
          try {
            const currentUser = await ctx.runQuery(api.users.getCurrent, {});
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
          } catch { /* ignore */ }
        }

        const cleaned = cleanItemForStorage(item.name, size, unit);
        await ctx.runMutation(api.listItems.create, {
          listId: targetListId,
          name: cleaned.name,
          quantity,
          size: cleaned.size,
          unit: cleaned.unit,
          estimatedPrice,
          priceSource,
          force: true,
        });

        addedItems.push({
          name: cleaned.name,
          quantity,
          size: cleaned.size,
          price: estimatedPrice,
        });
      }

      const formatItemMessage = (itemInfo: any): string => {
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
        const itemNames = addedItems.map((i) => i.name);
        message = `Added ${itemNames.slice(0, -1).join(", ")} and ${itemNames[itemNames.length - 1]} to your list`;
      }

      return {
        success: true,
        message,
        itemsAdded: addedItems.length,
        items: addedItems,
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
        targetList = lists.find((l: any) => l.isInProgress) || lists[0];
      }

      if (!targetList) {
        return { success: false, error: "No active list found to update." };
      }

      await ctx.runMutation(api.shoppingLists.update, {
        id: targetList._id,
        budget: args.budget,
      });

      return {
        success: true,
        message: `Updated ${targetList.name} budget to £${args.budget}`,
        listName: targetList.name,
        newBudget: args.budget,
      };
    }

    case "delete_list": {
      const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
      const targetList = lists.find((l: any) =>
        l.name.toLowerCase().includes(args.listName.toLowerCase())
      );

      if (!targetList) {
        return { success: false, error: `Couldn't find a list named "${args.listName}".` };
      }

      if (!args.confirmed) {
        const listItems = await ctx.runQuery(api.listItems.getByList, {
          listId: targetList._id,
        });
        const itemCount = listItems.length;

        return {
          success: false,
          needsConfirmation: true,
          listName: targetList.name,
          itemCount,
          message: `Are you sure you want to delete "${targetList.name}"? It has ${itemCount} items.`,
        };
      }

      await ctx.runMutation(api.shoppingLists.remove, { id: targetList._id });

      return {
        success: true,
        message: `Deleted "${targetList.name}"`,
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
        targetList = lists.find((l: any) => l.isInProgress) || lists[0];
      }

      if (!targetList) {
        return { success: false, error: "No active list found." };
      }

      const listItems = await ctx.runQuery(api.listItems.getByList, {
        listId: targetList._id,
      });

      const itemToRemove = listItems.find((i: any) =>
        i.name.toLowerCase().includes(args.itemName.toLowerCase())
      );

      if (!itemToRemove) {
        return { success: false, error: `Couldn't find "${args.itemName}" on ${targetList.name}.` };
      }

      await ctx.runMutation(api.listItems.remove, { id: itemToRemove._id });

      return {
        success: true,
        message: `Removed ${itemToRemove.name} from ${targetList.name}`,
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
        targetList = lists.find((l: any) => l.isInProgress) || lists[0];
      }

      if (!targetList) {
        return { success: false, error: "No active list found." };
      }

      const listItems = await ctx.runQuery(api.listItems.getByList, {
        listId: targetList._id,
      });

      const checkedItems = listItems.filter((i: any) => i.isChecked);

      if (checkedItems.length === 0) {
        return { success: true, message: "No checked items to clear." };
      }

      for (const item of checkedItems) {
        await ctx.runMutation(api.listItems.remove, { id: item._id });
      }

      return {
        success: true,
        message: `Cleared ${checkedItems.length} checked items from ${targetList.name}`,
        itemsRemoved: checkedItems.length,
      };
    }

    case "complete_shopping_list": {
      const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
      if (lists.length === 0) return { success: false, message: "No active shopping lists to complete." };

      let targetList = lists[0];
      if (args.listName) {
        const match = lists.find((l: any) => l.name.toLowerCase().includes((args.listName as string).toLowerCase()));
        if (match) targetList = match;
      }

      await ctx.runMutation(api.shoppingLists.finishTrip, {
        id: targetList._id,
      });

      return {
        success: true,
        message: `Done! Marked "${targetList.name}" as completed.`,
      };
    }

    default:
      return null;
  }
}
