import type { ActionCtx } from "../../_generated/server";
import { executeListWriteTool } from "./listWriteTools";
import { executeItemWriteTool } from "./itemWriteTools";
import { executePantryStoreWriteTool } from "./pantryStoreWriteTools";

/**
 * Voice Assistant WRITE Tools - Barrel
 *
 * Delegates to sub-modules:
 *   listWriteTools      - create_shopping_list, add_items_to_list, update_list_budget,
 *                         delete_list, remove_list_item, clear_checked_items, complete_shopping_list
 *   itemWriteTools      - check_off_item, change_item_size, edit_last_item, edit_list_item
 *   pantryStoreWriteTools - update_stock_level, add_pantry_item, remove_pantry_item, set_preferred_stores
 */

export async function executeWriteTool(
  ctx: ActionCtx,
  functionName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  // Try each sub-module in turn; they return null for unrecognised names
  const listResult = await executeListWriteTool(ctx, functionName, args);
  if (listResult !== null) return listResult;

  const itemResult = await executeItemWriteTool(ctx, functionName, args);
  if (itemResult !== null) return itemResult;

  const pantryResult = await executePantryStoreWriteTool(ctx, functionName, args);
  if (pantryResult !== null) return pantryResult;

  return { error: `Unknown WRITE function: ${functionName}` };
}

// Re-export sub-modules for direct access if needed
export { executeListWriteTool } from "./listWriteTools";
export { executeItemWriteTool } from "./itemWriteTools";
export { executePantryStoreWriteTool } from "./pantryStoreWriteTools";
