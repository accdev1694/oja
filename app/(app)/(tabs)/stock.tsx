import React, { useState, useCallback } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import {
  GlassScreen,
  SimpleHeader,
  colors,
} from "@/components/ui/glass";

import { Doc } from "@/convex/_generated/dataModel";
import { haptic } from "@/lib/haptics/safeHaptics";

import { stockStyles as styles, getGreeting } from "@/components/stock/stockStyles";
import { StockLoadingSkeleton, StockEmptyPantry } from "@/components/stock/StockEmptyStates";
import { StockSectionList } from "@/components/stock/StockSectionList";
import { StockHeaderButtons } from "@/components/stock/StockHeaderButtons";
import { StockBanners } from "@/components/stock/StockBanners";
import { StockModalsAndOverlays } from "@/components/stock/StockModalsAndOverlays";
import { useStockScreen } from "@/hooks/useStockScreen";

export default function PantryScreen() {
  const {
    // Refs
    tabsRef,
    itemRef,

    // User info
    firstName,
    insets,

    // Hints
    levelsHint,
    lowHint,

    // Data
    items,
    activeLists,
    duplicateGroups,
    archivedCount,

    // Derived data
    filteredItems,
    sections,
    attentionCount,
    activeFilterCount,
    hasExpandedCategory,
    capsuleActiveIndex,

    // UI state
    viewMode,
    collapsedCategories,
    searchQuery,
    setSearchQuery,
    stockFilters,
    animationKey,
    pageAnimationKey,
    showGestureOnboarding,
    expandingCategory,
    dedupDismissed,
    flyStartPosition,
    toastVisible,
    toastItemName,
    addToListItem,
    filterVisible,
    addModalVisible,

    // Callbacks
    toggleStockFilter,
    showAllFilters,
    handleSwipeDecrease,
    handleSwipeIncrease,
    handleRemoveItem,
    handleAddToList,
    handlePickList,
    toggleCategory,
    toggleEssentials,
    handleViewModeSwitch,
    handleOpenAddModal,
    handleCloseAddModal,
    handleOpenFilter,
    handleCloseFilter,
    handleCloseListPicker,
    handleMergeDuplicates,
    handleItemLongPress,
    dismissGestureOnboarding,
  } = useStockScreen();

  const refreshPantryPrices = useMutation(api.pantryItems.refreshPantryPrices);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  const handleRefreshPantryPrices = useCallback(async () => {
    haptic("light");
    setIsRefreshingPrices(true);
    try {
      const result = await refreshPantryPrices({});
      haptic("success");
      console.log(`Pantry prices refreshed: ${result.updated} of ${result.total}`);
    } catch (error) {
      console.error("Pantry price refresh failed:", error);
    } finally {
      setIsRefreshingPrices(false);
    }
  }, [refreshPantryPrices]);

  // ── Loading & empty states ────────────────────────────────────────────

  if (items === undefined) {
    return <StockLoadingSkeleton />;
  }

  if (items.length === 0) {
    return <StockEmptyPantry />;
  }

  return (
    <GlassScreen edges={["top"]}>
      <GestureHandlerRootView style={styles.container}>
        <SimpleHeader
          title={getGreeting(firstName)}
          accentColor={colors.semantic.pantry}
          subtitle={
            viewMode === "attention"
              ? `What you have in your pantry at home`
              : `What's in your pantry \u00b7 ${filteredItems.length} of ${items.length}`
          }
          rightElement={
            <StockHeaderButtons
              activeFilterCount={activeFilterCount}
              onOpenAddModal={handleOpenAddModal}
              onOpenFilter={handleOpenFilter}
              onRefreshPrices={handleRefreshPantryPrices}
              isRefreshingPrices={isRefreshingPrices}
            />
          }
          style={{ marginBottom: 4 }}
        />

        <View key={pageAnimationKey} style={styles.animationWrapper}>
          <StockBanners
            pageAnimationKey={pageAnimationKey}
            dedupDismissed={dedupDismissed}
            duplicateGroups={
              duplicateGroups?.map((allItemsInGroup: Doc<"pantryItems">[]) => ({
                canonical: allItemsInGroup[0].name,
                items: allItemsInGroup.map((eachItem: Doc<"pantryItems">) => eachItem._id),
              }))
            }
            onMergeDuplicates={handleMergeDuplicates}
            attentionCount={attentionCount}
            itemCount={items ? items.length : 0}
            capsuleActiveIndex={capsuleActiveIndex}
            onViewModeSwitch={handleViewModeSwitch}
            tabsRef={tabsRef}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <StockSectionList
            sections={sections}
            filteredItems={filteredItems}
            collapsedCategories={collapsedCategories}
            animationKey={animationKey}
            viewMode={viewMode}
            searchQuery={searchQuery}
            hasExpandedCategory={hasExpandedCategory}
            archivedCount={archivedCount}
            bottomInset={insets.bottom}
            expandingCategory={expandingCategory}
            itemRef={itemRef}
            onSwipeDecrease={handleSwipeDecrease}
            onSwipeIncrease={handleSwipeIncrease}
            onRemove={handleRemoveItem}
            onAddToList={handleAddToList}
            onLongPress={handleItemLongPress}
            onToggleCategory={toggleCategory}
            onToggleEssentials={toggleEssentials}
          />
        </View>

        <StockModalsAndOverlays
          toastVisible={toastVisible}
          toastItemName={toastItemName}
          flyStartPosition={flyStartPosition}
          filterVisible={filterVisible}
          onCloseFilter={handleCloseFilter}
          stockFilters={Object.fromEntries(
            (["low", "stocked", "out"] as const).map((levelName) => [levelName, stockFilters.has(levelName)])
          )}
          onToggleFilter={(filterKey) => {
            if (filterKey === "low" || filterKey === "stocked" || filterKey === "out") {
              toggleStockFilter(filterKey);
            }
          }}
          onShowAll={showAllFilters}
          addModalVisible={addModalVisible}
          onCloseAddModal={handleCloseAddModal}
          addToListItem={addToListItem}
          activeLists={activeLists}
          onPickList={(listId) => {
            const list = activeLists?.find((foundList: Doc<"shoppingLists">) => foundList._id === listId);
            if (addToListItem && list) {
              handlePickList(listId, list.name, addToListItem.name, addToListItem.lastPrice);
            }
          }}
          onCloseListPicker={handleCloseListPicker}
          showGestureOnboarding={showGestureOnboarding}
          onDismissGesture={dismissGestureOnboarding}
          levelsHint={levelsHint}
          tabsRef={tabsRef}
          lowHint={lowHint}
          itemRef={itemRef}
        />
      </GestureHandlerRootView>
    </GlassScreen>
  );
}
