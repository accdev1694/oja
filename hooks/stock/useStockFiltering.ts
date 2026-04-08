import { useMemo } from "react";
import type { StockLevel } from "@/components/pantry";
import { ESSENTIALS_SECTION_TITLE, getItemTier } from "@/components/stock/stockStyles";
import type { PantryViewMode, PantryItem } from "./types";

/**
 * Derives categories and attention count from raw pantry items.
 * These depend only on items, not on UI state.
 */
export function useStockCategories(items: PantryItem[] | undefined) {
  const categories = useMemo(() => {
    if (!items) return [];
    const cats = new Set<string>(items.map((item: PantryItem) => item.category));
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const attentionCount = useMemo(() => {
    if (!items) return 0;
    return items.filter(
      (item: PantryItem) =>
        item.stockLevel === "low" || item.stockLevel === "out"
    ).length;
  }, [items]);

  return { categories, attentionCount };
}

/**
 * Derives filtered items, grouped sections, and expansion state
 * from raw pantry data and current UI state.
 */
export function useStockFiltering(
  items: PantryItem[] | undefined,
  archivedItems: PantryItem[] | undefined,
  viewMode: PantryViewMode,
  searchQuery: string,
  stockFilters: Set<StockLevel>,
  collapsedCategories: Set<string>
) {
  // ── Filtered items ─────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!items) return [];
    const isSearching = searchQuery.trim().length > 0;
    const searchLower = searchQuery.toLowerCase();

    const activeResults = items.filter((item: PantryItem) => {
      if (item.status === "archived") return false;
      const level = item.stockLevel as StockLevel;
      if (viewMode === "attention") {
        if (level !== "low" && level !== "out") return false;
        if (stockFilters.size > 0 && !stockFilters.has(level)) return false;
      } else {
        if (stockFilters.size > 0 && !stockFilters.has(level)) return false;
      }
      if (isSearching) {
        return item.name.toLowerCase().includes(searchLower);
      }
      return true;
    });

    if (isSearching && archivedItems) {
      const archivedResults = archivedItems.filter((item: PantryItem) =>
        item.name.toLowerCase().includes(searchLower)
      );
      return [...activeResults, ...archivedResults];
    }

    return activeResults;
  }, [items, archivedItems, searchQuery, stockFilters, viewMode]);

  // ── Sections (essentials + categories) ─────────────────────────────────
  const sections = useMemo(() => {
    const essentials: typeof filteredItems = [];
    const regular: typeof filteredItems = [];

    filteredItems.forEach((item: PantryItem) => {
      const tier = getItemTier(item);
      if (tier === 1) {
        essentials.push(item);
      } else {
        regular.push(item);
      }
    });

    const grouped: Record<string, typeof filteredItems> = {};
    regular.forEach((item: PantryItem) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });

    const result: {
      title: string;
      data: typeof filteredItems;
      sectionDelay: number;
    }[] = [];

    if (essentials.length > 0) {
      result.push({
        title: ESSENTIALS_SECTION_TITLE,
        data: essentials,
        sectionDelay: 300,
      });
    }

    Object.entries(grouped).forEach(([category, data]) => {
      result.push({
        title: category,
        data,
        sectionDelay: 300 + result.length * 50,
      });
    });

    return result;
  }, [filteredItems]);

  // ── Has any expanded category ──────────────────────────────────────────
  const hasExpandedCategory = useMemo(
    () => sections.some((s) => !collapsedCategories.has(s.title)),
    [sections, collapsedCategories]
  );

  return {
    filteredItems,
    sections,
    hasExpandedCategory,
  };
}
