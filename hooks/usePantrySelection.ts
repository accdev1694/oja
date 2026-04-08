import { useState, useCallback } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { useGlassAlert } from "@/components/ui/glass";
import { haptic } from "@/lib/haptics/safeHaptics";
import type { PantryItemData, PantryFilter } from "./usePantryCategorization";

interface SelectedItem {
  name: string;
  category?: string;
  size?: string;
  unit?: string;
  estimatedPrice?: number;
  quantity: number;
  source: "search" | "pantry" | "manual";
  pantryItemId?: Id<"pantryItems">;
}

interface UsePantrySelectionArgs {
  outOfStock: PantryItemData[];
  runningLow: PantryItemData[];
  fullyStocked: PantryItemData[];
  lowAddableCount: number;
  allAddableCount: number;
  isItemOnList: (name: string, size?: string) => boolean;
  addItemToList: (item: SelectedItem, force?: boolean) => Promise<void>;
  setIsAdding: (v: boolean) => void;
}

export function usePantrySelection({
  outOfStock, runningLow, fullyStocked,
  lowAddableCount, allAddableCount,
  isItemOnList, addItemToList, setIsAdding,
}: UsePantrySelectionArgs) {
  const [selectedPantryIds, setSelectedPantryIds] = useState<Set<Id<"pantryItems">>>(new Set());
  const [bulkAddingFilter, setBulkAddingFilter] = useState<PantryFilter | null>(null);
  const { alert } = useGlassAlert();

  const executeBulkAdd = useCallback(async (filter: PantryFilter) => {
    const itemsToProcess = filter === "low" ? [...outOfStock, ...runningLow] : [...outOfStock, ...runningLow, ...fullyStocked];
    const itemsToAdd = itemsToProcess.filter((item) => !isItemOnList(item.name));
    if (itemsToAdd.length === 0) return;
    haptic("medium");
    setBulkAddingFilter(filter);
    try {
      for (const item of itemsToAdd) {
        await addItemToList({ name: item.name, category: item.category, size: item.defaultSize, unit: item.defaultUnit, estimatedPrice: item.lastPrice, quantity: 1, source: "pantry", pantryItemId: item._id });
      }
      haptic("success");
    } catch (error) { console.error("Bulk add failed:", error); haptic("error"); }
    finally { setBulkAddingFilter(null); }
  }, [outOfStock, runningLow, fullyStocked, isItemOnList, addItemToList]);

  const addAllFilteredItems = useCallback((filter: PantryFilter) => {
    const count = filter === "low" ? lowAddableCount : allAddableCount;
    if (count === 0) return;
    haptic("light");
    const label = filter === "low" ? "low" : "pantry";
    alert(`Add ${count} item${count !== 1 ? "s" : ""}?`, `This will add all ${label} items to your shopping list.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Add All", onPress: () => executeBulkAdd(filter) },
    ]);
  }, [lowAddableCount, allAddableCount, alert, executeBulkAdd]);

  const togglePantrySelection = useCallback((id: Id<"pantryItems">) => {
    haptic("light");
    setSelectedPantryIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleSelectAllPantry = useCallback((filter: PantryFilter) => {
    const items = filter === "low" ? [...outOfStock, ...runningLow] : [...outOfStock, ...runningLow, ...fullyStocked];
    const addable = items.filter((item) => !isItemOnList(item.name));
    const allSelected = addable.length > 0 && addable.every((item) => selectedPantryIds.has(item._id));
    haptic("light");
    setSelectedPantryIds((prev) => {
      const next = new Set(prev);
      if (allSelected) { for (const item of addable) next.delete(item._id); }
      else { for (const item of addable) next.add(item._id); }
      return next;
    });
  }, [outOfStock, runningLow, fullyStocked, isItemOnList, selectedPantryIds]);

  const handleAddSelected = useCallback(async () => {
    if (selectedPantryIds.size === 0) return;
    const allPantry = [...outOfStock, ...runningLow, ...fullyStocked];
    const itemsToAdd = allPantry.filter((item) => selectedPantryIds.has(item._id));
    if (itemsToAdd.length === 0) return;
    haptic("medium");
    setIsAdding(true);
    try {
      for (const item of itemsToAdd) {
        await addItemToList({ name: item.name, category: item.category, size: item.defaultSize, unit: item.defaultUnit, estimatedPrice: item.lastPrice, quantity: 1, source: "pantry", pantryItemId: item._id });
      }
      haptic("success");
      setSelectedPantryIds(new Set());
    } catch (error) { console.error("Add selected failed:", error); haptic("error"); }
    finally { setIsAdding(false); }
  }, [selectedPantryIds, outOfStock, runningLow, fullyStocked, addItemToList, setIsAdding]);

  const clearSelection = useCallback(() => {
    setSelectedPantryIds(new Set());
  }, []);

  return {
    selectedPantryIds,
    bulkAddingFilter,
    togglePantrySelection,
    toggleSelectAllPantry,
    handleAddSelected,
    addAllFilteredItems,
    clearSelection,
  };
}
