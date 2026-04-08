/**
 * useStockScreen -- primary hook for the Stock tab.
 *
 * Composed from smaller, focused hooks in `hooks/stock/`:
 *   - useStockData       -- Convex queries & mutations
 *   - useStockCategories -- categories + attention count (items-only)
 *   - useStockFiltering  -- filtered items, sections, expansion state
 *   - useStockUI         -- view mode, search, filters, modals, toast, hints
 *   - useStockActions    -- swipe, remove, add-to-list, merge, long-press
 */

import { useStockData } from "./stock/useStockData";
import { useStockCategories, useStockFiltering } from "./stock/useStockFiltering";
import { useStockUI } from "./stock/useStockUI";
import { useStockActions } from "./stock/useStockActions";

export type { PantryViewMode, PantryItem, ShoppingList } from "./stock/types";

export function useStockScreen() {
  // 1. Data layer -- queries, mutations, icon migration
  const data = useStockData();

  // 2. Categories + attention count (depend only on items, no UI state)
  const { categories, attentionCount } = useStockCategories(data.items);

  // 3. UI layer -- view mode, search, filters, modals, toast, hints, refs
  const ui = useStockUI(data.items, categories);

  // 4. Filtering -- needs raw items + UI state from step 3
  const { filteredItems, sections, hasExpandedCategory } = useStockFiltering(
    data.items,
    data.archivedItems,
    ui.viewMode,
    ui.searchQuery,
    ui.stockFilters,
    ui.collapsedCategories
  );

  // 5. Actions -- swipe, remove, add-to-list, merge, long-press
  const actions = useStockActions({
    items: data.items,
    archivedItems: data.archivedItems,
    activeLists: data.activeLists,
    duplicateGroups: data.duplicateGroups,
    updateStockLevel: data.updateStockLevel,
    createList: data.createList,
    addListItem: data.addListItem,
    removePantryItem: data.removePantryItem,
    mergeDuplicatesMut: data.mergeDuplicatesMut,
    togglePin: data.togglePin,
    archiveItemMut: data.archiveItemMut,
    unarchiveItemMut: data.unarchiveItemMut,
    alert: ui.alert,
    showToast: ui.showToast,
    setFlyStartPosition: ui.setFlyStartPosition,
    setAddToListItem: ui.setAddToListItem,
    setDedupDismissed: data.setDedupDismissed,
    showGestureOnboarding: ui.showGestureOnboarding,
    dismissGestureOnboarding: ui.dismissGestureOnboarding,
    lowHint: ui.lowHint,
  });

  return {
    // Refs
    headerRef: ui.headerRef,
    tabsRef: ui.tabsRef,
    itemRef: ui.itemRef,

    // User info
    firstName: ui.firstName,
    insets: ui.insets,

    // Hints
    levelsHint: ui.levelsHint,
    lowHint: ui.lowHint,

    // Data
    items: data.items,
    activeLists: data.activeLists,
    duplicateGroups: data.duplicateGroups,
    archivedCount: data.archivedCount,

    // Derived data
    filteredItems,
    sections,
    attentionCount,
    activeFilterCount: ui.activeFilterCount,
    hasExpandedCategory,
    capsuleActiveIndex: ui.capsuleActiveIndex,

    // UI state
    viewMode: ui.viewMode,
    collapsedCategories: ui.collapsedCategories,
    searchQuery: ui.searchQuery,
    setSearchQuery: ui.setSearchQuery,
    filterVisible: ui.filterVisible,
    stockFilters: ui.stockFilters,
    addModalVisible: ui.addModalVisible,
    animationKey: ui.animationKey,
    pageAnimationKey: ui.pageAnimationKey,
    showGestureOnboarding: ui.showGestureOnboarding,
    dedupDismissed: data.dedupDismissed,
    flyStartPosition: ui.flyStartPosition,
    toastVisible: ui.toastVisible,
    toastItemName: ui.toastItemName,
    addToListItem: ui.addToListItem,

    // Callbacks
    toggleStockFilter: ui.toggleStockFilter,
    showAllFilters: ui.showAllFilters,
    handleSwipeDecrease: actions.handleSwipeDecrease,
    handleSwipeIncrease: actions.handleSwipeIncrease,
    handleRemoveItem: actions.handleRemoveItem,
    handleAddToList: actions.handleAddToList,
    handlePickList: actions.handlePickList,
    toggleCategory: ui.toggleCategory,
    toggleEssentials: () => actions.toggleEssentials(ui.toggleCategory),
    handleViewModeSwitch: ui.handleViewModeSwitch,
    handleOpenAddModal: ui.handleOpenAddModal,
    handleCloseAddModal: ui.handleCloseAddModal,
    handleOpenFilter: ui.handleOpenFilter,
    handleCloseFilter: ui.handleCloseFilter,
    handleCloseListPicker: ui.handleCloseListPicker,
    handleMergeDuplicates: actions.handleMergeDuplicates,
    handleItemLongPress: actions.handleItemLongPress,
    dismissGestureOnboarding: ui.dismissGestureOnboarding,
  };
}
