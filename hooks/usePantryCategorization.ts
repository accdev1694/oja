import { useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isDuplicateItem } from "@/convex/lib/fuzzyMatch";

export interface PantryItemData {
  _id: Id<"pantryItems">;
  name: string;
  category: string;
  icon?: string;
  stockLevel: string;
  lastPrice?: number;
  defaultSize?: string;
  defaultUnit?: string;
}

export type PantryFilter = "low" | "all";

export function usePantryCategorization(existingItems?: { name: string; size?: string }[]) {
  const pantryItems = useQuery(api.pantryItems.getByUser);

  const isItemOnList = useCallback(
    (name: string, size?: string) => {
      if (!existingItems) return false;
      return existingItems.some((item) => isDuplicateItem(name, size, item.name, item.size));
    },
    [existingItems]
  );

  const { outOfStock, runningLow, fullyStocked } = useMemo(() => {
    if (!pantryItems) return { outOfStock: [], runningLow: [], fullyStocked: [] };
    const out: PantryItemData[] = [];
    const low: PantryItemData[] = [];
    const stocked: PantryItemData[] = [];
    for (const item of pantryItems) {
      const data: PantryItemData = {
        _id: item._id,
        name: item.name,
        category: item.category,
        icon: item.icon,
        stockLevel: item.stockLevel,
        lastPrice: item.lastPrice,
        defaultSize: item.defaultSize,
        defaultUnit: item.defaultUnit,
      };
      if (item.stockLevel === "out") out.push(data);
      else if (item.stockLevel === "low") low.push(data);
      else stocked.push(data);
    }
    return { outOfStock: out, runningLow: low, fullyStocked: stocked };
  }, [pantryItems]);

  const isPantryLoading = pantryItems === undefined;
  const pantryNeedCount = outOfStock.length + runningLow.length;
  const totalPantryCount = pantryItems?.length ?? 0;

  const lowAddableCount = useMemo(() => {
    return [...outOfStock, ...runningLow].filter((item) => !isItemOnList(item.name)).length;
  }, [outOfStock, runningLow, isItemOnList]);

  const allAddableCount = useMemo(() => {
    return [...outOfStock, ...runningLow, ...fullyStocked].filter((item) => !isItemOnList(item.name)).length;
  }, [outOfStock, runningLow, fullyStocked, isItemOnList]);

  const getPantryListData = useCallback(
    (filter: PantryFilter) => {
      if (filter === "low") return [...outOfStock, ...runningLow];
      return [...outOfStock, ...runningLow, ...fullyStocked];
    },
    [outOfStock, runningLow, fullyStocked]
  );

  return {
    pantryItems,
    outOfStock,
    runningLow,
    fullyStocked,
    isPantryLoading,
    pantryNeedCount,
    totalPantryCount,
    lowAddableCount,
    allAddableCount,
    isItemOnList,
    getPantryListData,
  };
}
