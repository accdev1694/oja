import type { Id } from "../_generated/dataModel";

/**
 * Backward-compatible helper to get receipt IDs from a shopping list.
 * Handles both legacy `receiptId` (single) and new `receiptIds` (array) fields.
 */
export function getReceiptIds(list: {
  receiptId?: Id<"receipts">;
  receiptIds?: Id<"receipts">[];
}): Id<"receipts">[] {
  return list.receiptIds ?? (list.receiptId ? [list.receiptId] : []);
}

/**
 * Push a receipt ID to a list's receiptIds array, handling the legacy field.
 * Returns the updated array to be written to `receiptIds`.
 */
export function pushReceiptId(
  list: {
    receiptId?: Id<"receipts">;
    receiptIds?: Id<"receipts">[];
  },
  newReceiptId: Id<"receipts">
): Id<"receipts">[] {
  const existing = getReceiptIds(list);
  // Avoid duplicates
  if (existing.some((id) => id === newReceiptId)) {
    return existing;
  }
  return [...existing, newReceiptId];
}
