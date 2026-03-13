import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  GlassScreen,
  SimpleHeader,
  colors,
} from "@/components/ui/glass";

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
            />
          }
        />

        <View key={pageAnimationKey} style={styles.animationWrapper}>
          <StockBanners
            pageAnimationKey={pageAnimationKey}
            dedupDismissed={dedupDismissed}
            duplicateGroups={duplicateGroups}
            onMergeDuplicates={handleMergeDuplicates}
            attentionCount={attentionCount}
            items={items}
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
          stockFilters={stockFilters}
          onToggleFilter={toggleStockFilter}
          onShowAll={showAllFilters}
          addModalVisible={addModalVisible}
          onCloseAddModal={handleCloseAddModal}
          addToListItem={addToListItem}
          activeLists={activeLists}
          onPickList={handlePickList}
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
