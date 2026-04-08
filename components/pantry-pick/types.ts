import type { Doc } from "@/convex/_generated/dataModel";

/** A pantry item as returned by the getByUser query */
export type PantryPickPantryItem = Doc<"pantryItems">;

/** A category header row in the flat list */
export type CategoryHeader = {
  _id: string;
  isCategoryHeader: true;
  category: string;
  count: number;
};

/** Union type for FlashList items: either a category header or a pantry item */
export type FlatItem = CategoryHeader | PantryPickPantryItem;

/** Stock level color mapping */
export const STOCK_COLORS: Record<string, string> = {
  out: "#FF6B6B",
  low: "#F59E0B",
  stocked: "#10B981",
};

/** Sort priority: out first, stocked last */
export const STOCK_SORT_ORDER: Record<string, number> = {
  out: 0,
  low: 1,
  stocked: 2,
};
