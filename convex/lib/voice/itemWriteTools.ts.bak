import { api } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";

/**
 * Voice Assistant WRITE Tools - Item Edit Operations
 *
 * Handles: check_off_item, change_item_size, edit_last_item, edit_list_item
 */

export async function executeItemWriteTool(
  ctx: ActionCtx,
  functionName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (functionName) {
    case "check_off_item": {
      let targetListId = (args.listId as string) as Id<"shoppingLists"> | undefined;

      if (!targetListId) {
        const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
        const inProgress = lists.find((l) => l.status === "in_progress");
        if (inProgress) {
          targetListId = inProgress._id;
        } else if (lists.length === 1) {
          targetListId = lists[0]._id;
        } else {
          return { success: false, error: "Please specify which list." };
        }
      }

      const listItems = await ctx.runQuery(api.listItems.getByList, { listId: targetListId });
      const itemMatch = listItems.find((i) =>
        i.name.toLowerCase().includes((args.itemName as string).toLowerCase())
      );

      if (!itemMatch) {
        return { success: false, error: `Couldn't find "${(args.itemName as string)}" on your list.` };
      }

      await ctx.runMutation(api.listItems.toggleChecked, { id: itemMatch._id });

      return {
        success: true,
        message: `Checked off ${itemMatch.name}`,
      };
    }

    case "change_item_size": {
      const list = await ctx.runQuery(api.shoppingLists.getById, {
        id: (args.listId as string) as Id<"shoppingLists">,
      });

      if (!list) return { success: false, error: "List not found." };

      const listItems = await ctx.runQuery(api.listItems.getByList, {
        listId: (args.listId as string) as Id<"shoppingLists">,
      });

      const itemMatch = listItems.find((i) =>
        i.name.toLowerCase().includes((args.itemName as string).toLowerCase())
      );

      if (!itemMatch) return { success: false, error: `Couldn't find "${(args.itemName as string)}" on your list.` };

      const storeName = list.normalizedStoreId || list.storeName || "tesco";
      const sizesResult = await ctx.runQuery(api.itemVariants.getSizesForStore, {
        itemName: itemMatch.name.toLowerCase().trim(),
        store: storeName,
      });

      const newSizeLower = (args.newSize as string).toLowerCase().replace(/\s+/g, "");
      const matchingSize = sizesResult.sizes.find((s) => {
        const sizeLower = (s.size || "").toLowerCase().replace(/\s+/g, "");
        const sizeNormLower = (s.sizeNormalized || "").toLowerCase().replace(/\s+/g, "");
        return sizeLower === newSizeLower || sizeNormLower === newSizeLower || sizeLower.includes(newSizeLower) || newSizeLower.includes(sizeLower);
      });

      let newPrice = itemMatch.estimatedPrice;
      let sizeDisplay = (args.newSize as string);

      if (matchingSize) {
        newPrice = matchingSize.price ?? itemMatch.estimatedPrice;
        sizeDisplay = matchingSize.sizeNormalized || matchingSize.size || (args.newSize as string);
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
        listId: (args.listId as string) as Id<"shoppingLists">,
      });

      if (listItems.length === 0) return { success: false, error: "No items on this list to edit." };

      const sortedItems = [...listItems].sort((a, b) =>
        (b._creationTime || 0) - (a._creationTime || 0)
      );
      const lastItem = sortedItems[0];

      if ((args.quantity as number | undefined) === undefined && (args.size as string | undefined) === undefined) {
        return { success: false, error: "Please specify what to change (quantity or size)." };
      }

      const updates: Record<string, unknown> = {};
      const changes: string[] = [];

      if ((args.quantity as number | undefined) !== undefined) {
        updates.quantity = (args.quantity as number | undefined);
        changes.push(`quantity to ${(args.quantity as number | undefined)}`);
      }

      if ((args.size as string | undefined) !== undefined) {
        const list = await ctx.runQuery(api.shoppingLists.getById, {
          id: (args.listId as string) as Id<"shoppingLists">,
        });
        const storeName = list?.normalizedStoreId || list?.storeName || "tesco";
        const sizesResult = await ctx.runQuery(api.itemVariants.getSizesForStore, {
          itemName: lastItem.name.toLowerCase().trim(),
          store: storeName,
        });

        const newSizeLower = (args.size as string).toLowerCase().replace(/\s+/g, "");
        const matchingSize = sizesResult.sizes.find((s) => {
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
          updates.size = args.size as string;
          updates.sizeOverride = true;
          changes.push(args.size as string);
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

    case "edit_list_item": {
      if (!(args.itemName as string)) return { success: false, message: "Which item do you want to edit?" };
      let listId = (args.listId as string) as Id<"shoppingLists"> | undefined;
      const lists = await ctx.runQuery(api.shoppingLists.getActive, {});
      if (lists.length === 0) return { success: false, message: "No active lists to edit items from." };

      const targetList = listId ? lists.find((l) => l._id === listId) : (lists.find((l) => l.status === 'active') || lists[0]);
      if (!targetList) return { success: false, message: "List not found." };

      const listItems = await ctx.runQuery(api.listItems.getByList, { listId: targetList._id });
      const itemMatch = listItems.find(i => i.name.toLowerCase().includes((args.itemName as string).toLowerCase()));
      if (!itemMatch) return { success: false, message: `Couldn't find "${(args.itemName as string)}" on your list.` };

      const updates: Record<string, unknown> = {};
      if ((args.newQuantity as number | undefined) !== undefined) updates.quantity = (args.newQuantity as number | undefined);
      if ((args.newName as string | undefined) !== undefined) updates.name = (args.newName as string | undefined);
      if ((args.newSize as string) !== undefined) {
        updates.size = (args.newSize as string);
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
      return null;
  }
}
