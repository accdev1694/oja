import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useLocalSearchParams, router } from "expo-router";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  impactAsync,
  notificationAsync,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from "expo-haptics";
import { useGlassAlert } from "@/components/ui/glass";
import { STOCK_SORT_ORDER, type FlatItem } from "./types";

export function usePantryPickData() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { alert } = useGlassAlert();
  const items = useQuery(api.pantryItems.getByUser);
  const addFromPantryBulk = useMutation(api.listItems.addFromPantryBulk);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [pickCategoryFilter, setPickCategoryFilter] = useState<string | null>(null);

  // Derive categories for filter chips
  const { pickCategories, pickCategoryCounts } = useMemo(() => {
    if (!items) return { pickCategories: [], pickCategoryCounts: {} };
    const countMap: Record<string, number> = {};
    items.forEach(item => {
      countMap[item.category] = (countMap[item.category] || 0) + 1;
    });
    return { pickCategories: Object.keys(countMap).sort(), pickCategoryCounts: countMap };
  }, [items]);

  // Flatten items into a flat array with category headers interleaved
  const flatData = useMemo(() => {
    if (!items) return [];
    const filtered = pickCategoryFilter
      ? items.filter(item => item.category === pickCategoryFilter)
      : items;
    const sorted = [...filtered].sort(
      (a, b) =>
        (STOCK_SORT_ORDER[a.stockLevel] ?? 4) -
        (STOCK_SORT_ORDER[b.stockLevel] ?? 4)
    );
    const groups: Record<string, typeof sorted> = {};
    sorted.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    const result: FlatItem[] = [];
    Object.entries(groups).forEach(([category, categoryItems]) => {
      result.push({ _id: `cat-${category}`, isCategoryHeader: true, category, count: categoryItems.length });
      categoryItems.forEach(item => result.push(item));
    });
    return result;
  }, [items, pickCategoryFilter]);

  const allItemIds = useMemo(() => {
    if (!items) return [];
    return items.map((i) => i._id as string);
  }, [items]);

  const lowItemIds = useMemo(() => {
    if (!items) return [];
    return items
      .filter((i) => i.stockLevel === "low" || i.stockLevel === "out")
      .map((i) => i._id as string);
  }, [items]);

  const allSelected = allItemIds.length > 0 && selectedIds.size === allItemIds.length;
  const allLowSelected = lowItemIds.length > 0 && lowItemIds.every((id) => selectedIds.has(id));

  const toggleItem = useCallback(
    (id: string) => {
      impactAsync(ImpactFeedbackStyle.Light);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    []
  );

  const toggleAll = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium);
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allItemIds));
    }
  }, [allSelected, allItemIds]);

  const toggleLow = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium);
    if (allLowSelected) {
      // Deselect only the low/out items, keep any other selections
      setSelectedIds((prev) => {
        const next = new Set(prev);
        lowItemIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Add all low/out items to selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        lowItemIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [allLowSelected, lowItemIds]);

  const handleConfirm = async () => {
    if (selectedIds.size === 0 || !listId) return;
    setIsAdding(true);
    try {
      const pantryItemIds = Array.from(selectedIds) as Id<"pantryItems">[];
      await addFromPantryBulk({
        listId: listId as Id<"shoppingLists">,
        pantryItemIds,
      });
      notificationAsync(NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error("Failed to add items:", error);
      alert("Error", "Failed to add items to list");
    } finally {
      setIsAdding(false);
    }
  };

  return {
    items,
    selectedIds,
    isAdding,
    pickCategoryFilter,
    setPickCategoryFilter,
    pickCategories,
    pickCategoryCounts,
    flatData,
    allSelected,
    allLowSelected,
    lowItemIds,
    toggleItem,
    toggleAll,
    toggleLow,
    handleConfirm,
  };
}
