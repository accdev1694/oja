import React from "react";
import {
  SwipeOnboardingOverlay,
  AddedToListToast,
  AddPantryItemModal,
  StockFilterModal,
  PantryListPickerModal,
} from "@/components/pantry";
import { HintOverlay } from "@/components/tutorial/HintOverlay";

export const StockModalsAndOverlays = React.memo(function StockModalsAndOverlays({
  toastVisible,
  toastItemName,
  flyStartPosition,
  filterVisible,
  onCloseFilter,
  stockFilters,
  onToggleFilter,
  onShowAll,
  addModalVisible,
  onCloseAddModal,
  addToListItem,
  activeLists,
  onPickList,
  onCloseListPicker,
  showGestureOnboarding,
  onDismissGesture,
  levelsHint,
  tabsRef,
  lowHint,
  itemRef,
}: any) {
  return (
    <>
      {/* Added-to-list Toast */}
      {toastVisible && (
        <AddedToListToast itemName={toastItemName} y={flyStartPosition.y} />
      )}

      {/* Modals */}
      <StockFilterModal
        visible={filterVisible}
        onClose={onCloseFilter}
        stockFilters={stockFilters}
        onToggleFilter={onToggleFilter}
        onShowAll={onShowAll}
      />

      <AddPantryItemModal
        visible={addModalVisible}
        onClose={onCloseAddModal}
      />

      <PantryListPickerModal
        visible={addToListItem !== null}
        itemName={addToListItem?.name ?? ""}
        itemPrice={addToListItem?.lastPrice}
        lists={activeLists ?? []}
        onPickList={onPickList}
        onClose={onCloseListPicker}
      />

      {/* Gesture Onboarding Overlay */}
      {showGestureOnboarding && <SwipeOnboardingOverlay onDismiss={onDismissGesture} />}

      {/* Tutorial Hints */}
      <HintOverlay
        visible={levelsHint.shouldShow}
        targetRef={tabsRef}
        title="Pantry Status"
        content="Tap stock icons to toggle levels. We'll automatically add 'Out' items to your next list."
        onDismiss={levelsHint.dismiss}
        position="below"
      />

      <HintOverlay
        visible={lowHint.shouldShow}
        targetRef={itemRef}
        title="Low Stock Alert"
        content="Items marked 'Low' will be suggested first when you create a new list."
        onDismiss={lowHint.dismiss}
        position="below"
      />
    </>
  );
});
