import { api } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { cleanItemForStorage } from "../itemNameParser";

/**
 * Voice Assistant WRITE Tools
 * 
 * Implementations for tools that modify the database.
 */

export async function executeWriteTool(
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

    case "update_stock_level": {
      const items = await ctx.runQuery(api.pantryItems.getByUser, {});
      const match = items.find((i: any) =>
        i.name.toLowerCase().includes(args.itemName.toLowerCase())
      );

      if (!match) {
        return { success: false, error: `Couldn't find "${args.itemName}" in your pantry.` };
      }

      await ctx.runMutation(api.pantryItems.updateStockLevel, {
        id: match._id,
        stockLevel: args.stockLevel,
      });

      return {
        success: true,
        message: `Marked ${match.name} as ${args.stockLevel}`,
      };
    }

    case "check_off_item": {
      let targetListId = args.listId as Id<"shoppingLists"> | undefined;

      if (!targetListId) {
        const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
        const inProgress = lists.find((l: any) => l.status === "in_progress");
        if (inProgress) {
          targetListId = inProgress._id;
        } else if (lists.length === 1) {
          targetListId = lists[0]._id;
        } else {
          return { success: false, error: "Please specify which list." };
        }
      }

      const listItems = await ctx.runQuery(api.listItems.getByList, { listId: targetListId });
      const itemMatch = listItems.find((i: any) =>
        i.name.toLowerCase().includes(args.itemName.toLowerCase())
      );

      if (!itemMatch) {
        return { success: false, error: `Couldn't find "${args.itemName}" on your list.` };
      }

      await ctx.runMutation(api.listItems.toggleChecked, { id: itemMatch._id });

      return {
        success: true,
        message: `Checked off ${itemMatch.name}`,
      };
    }

    case "add_pantry_item": {
      const pantryUser = await ctx.runQuery(api.users.getCurrent, {});
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
        } catch { /* ignore */ }
      }

      await ctx.runMutation(api.pantryItems.create, {
        name: args.name,
        category: args.category || "Other",
        stockLevel: args.stockLevel || "low",
        lastPrice,
        priceSource: lastPrice ? "ai_estimate" : undefined,
      });

      return {
        success: true,
        message: `Added ${args.name} to your pantry`,
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

    case "remove_pantry_item": {
      const items = await ctx.runQuery(api.pantryItems.getByUser, {});
      const itemToRemove = items.find((i: any) =>
        i.name.toLowerCase().includes(args.itemName.toLowerCase())
      );

      if (!itemToRemove) {
        return { success: false, error: `Couldn't find "${args.itemName}" in your pantry.` };
      }

      await ctx.runMutation(api.pantryItems.remove, { id: itemToRemove._id });

      return {
        success: true,
        message: `Removed ${itemToRemove.name} from your pantry`,
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

    case "set_preferred_stores": {
      const allStores = await ctx.runQuery(api.stores.getAll, {});
      const validStoreIds: string[] = [];
      const unrecognizedStores: string[] = [];

      for (const storeName of args.stores || []) {
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
          success: false,
          error: `I didn't recognise any of those stores. Try UK stores like Tesco, Aldi, Lidl, Sainsbury's, or Morrisons.`,
          unrecognizedStores,
        };
      }

      await ctx.runMutation(api.stores.setUserPreferences, {
        favorites: validStoreIds,
      });

      const savedStoreNames = validStoreIds.map((id) => {
        const store = allStores.find((s: any) => s.id === id);
        return store ? (store as any).displayName : id;
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

    case "change_item_size": {
      const list = await ctx.runQuery(api.shoppingLists.getById, {
        id: args.listId as Id<"shoppingLists">,
      });

      if (!list) return { success: false, error: "List not found." };

      const listItems = await ctx.runQuery(api.listItems.getByList, {
        listId: args.listId as Id<"shoppingLists">,
      });

      const itemMatch = listItems.find((i: any) =>
        i.name.toLowerCase().includes(args.itemName.toLowerCase())
      );

      if (!itemMatch) return { success: false, error: `Couldn't find "${args.itemName}" on your list.` };

      const storeName = list.normalizedStoreId || list.storeName || "tesco";
      const sizesResult = await ctx.runQuery(api.itemVariants.getSizesForStore, {
        itemName: itemMatch.name.toLowerCase().trim(),
        store: storeName,
      });

      const newSizeLower = args.newSize.toLowerCase().replace(/\s+/g, "");
      const matchingSize = sizesResult.sizes.find((s: any) => {
        const sizeLower = (s.size || "").toLowerCase().replace(/\s+/g, "");
        const sizeNormLower = (s.sizeNormalized || "").toLowerCase().replace(/\s+/g, "");
        return sizeLower === newSizeLower || sizeNormLower === newSizeLower || sizeLower.includes(newSizeLower) || newSizeLower.includes(sizeLower);
      });

      let newPrice = itemMatch.estimatedPrice;
      let sizeDisplay = args.newSize;

      if (matchingSize) {
        newPrice = matchingSize.price ?? itemMatch.estimatedPrice;
        sizeDisplay = matchingSize.sizeNormalized || matchingSize.size || args.newSize;
      }

      await ctx.runMutation(api.listItems.update, {
        id: itemMatch._id,
        size: sizeDisplay,
        estimatedPrice: newPrice,
        sizeOverride: true,
      });

      return {
        success: true,
        message: `Changed ${itemMatch.name} to ${sizeDisplay}${newPrice ? ` at £${newPrice.toFixed(2)}` : ""}`,
      };
    }

    case "edit_last_item": {
      const listItems = await ctx.runQuery(api.listItems.getByList, {
        listId: args.listId as Id<"shoppingLists">,
      });

      if (listItems.length === 0) return { success: false, error: "No items on this list to edit." };

      const sortedItems = [...listItems].sort((a: any, b: any) =>
        (b._creationTime || 0) - (a._creationTime || 0)
      );
      const lastItem = sortedItems[0];

      if (args.quantity === undefined && args.size === undefined) {
        return { success: false, error: "Please specify what to change (quantity or size)." };
      }

      const updates: any = {};
      const changes: string[] = [];

      if (args.quantity !== undefined) {
        updates.quantity = args.quantity;
        changes.push(`quantity to ${args.quantity}`);
      }

      if (args.size !== undefined) {
        const list = await ctx.runQuery(api.shoppingLists.getById, {
          id: args.listId as Id<"shoppingLists">,
        });
        const storeName = list?.normalizedStoreId || list?.storeName || "tesco";
        const sizesResult = await ctx.runQuery(api.itemVariants.getSizesForStore, {
          itemName: lastItem.name.toLowerCase().trim(),
          store: storeName,
        });

        const newSizeLower = args.size.toLowerCase().replace(/\s+/g, "");
        const matchingSize = sizesResult.sizes.find((s: any) => {
          const sizeLower = (s.size || "").toLowerCase().replace(/\s+/g, "");
          const sizeNormLower = (s.sizeNormalized || "").toLowerCase().replace(/\s+/g, "");
          return sizeLower === newSizeLower || sizeNormLower === newSizeLower || sizeLower.includes(newSizeLower) || newSizeLower.includes(sizeLower);
        });

        if (matchingSize) {
          updates.size = matchingSize.sizeNormalized || matchingSize.size;
          updates.estimatedPrice = matchingSize.price;
          updates.sizeOverride = true;
          changes.push(`${updates.size} at £${(matchingSize.price || 0).toFixed(2)}`);
        } else {
          updates.size = args.size;
          updates.sizeOverride = true;
          changes.push(args.size);
        }
      }

      await ctx.runMutation(api.listItems.update, {
        id: lastItem._id,
        ...updates,
      });

      return {
        success: true,
        message: `Updated ${lastItem.name} to ${changes.join(", ")}`,
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

    case "edit_list_item": {
      if (!args.itemName) return { success: false, message: "Which item do you want to edit?" };
      let listId = args.listId as Id<"shoppingLists"> | undefined;
      const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
      if (lists.length === 0) return { success: false, message: "No active lists to edit items from." };
      
      const targetList = listId ? lists.find((l: any) => l._id === listId) : (lists.find((l: any) => l.status === 'active') || lists[0]);
      if (!targetList) return { success: false, message: "List not found." };
      
      const listItems = await ctx.runQuery(api.listItems.getByList, { listId: targetList._id });
      const itemMatch = listItems.find(i => i.name.toLowerCase().includes(args.itemName.toLowerCase()));
      if (!itemMatch) return { success: false, message: `Couldn't find "${args.itemName}" on your list.` };

      const updates: any = {};
      if (args.newQuantity !== undefined) updates.quantity = args.newQuantity;
      if (args.newName !== undefined) updates.name = args.newName;
      if (args.newSize !== undefined) {
        updates.size = args.newSize;
        updates.sizeOverride = true;
      }

      await ctx.runMutation(api.listItems.update, {
        id: itemMatch._id,
        ...updates,
      });

      return {
        success: true,
        message: `Updated ${itemMatch.name} on your "${targetList.name}" list.`,
      };
    }

    default:
      return { error: `Unknown WRITE function: ${functionName}` };
  }
}
