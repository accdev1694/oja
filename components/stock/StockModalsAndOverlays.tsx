import React from "react";
import { View } from "react-native";
import { Id } from "@/convex/_generated/dataModel";
import {
  SwipeOnboardingOverlay,
  AddedToListToast,
  AddPantryItemModal,
  StockFilterModal,
  PantryListPickerModal,
} from "@/components/pantry";
import { HintOverlay } from "@/components/tutorial/HintOverlay";

interface HintState {
  shouldShow: boolean;
  dismiss: () => void;
}

interface AddToListItem {
  name: string;
  lastPrice?: number;
}

interface ActiveList {
  _id: Id<"shoppingLists">;
  name: string;
}

interface StockModalsAndOverlaysProps {
  toastVisible: boolean;
  toastItemName: string;
  flyStartPosition: { y: number };
  filterVisible: boolean;
  onCloseFilter: () => void;
  stockFilters: Record<string, boolean>;
  onToggleFilter: (key: string) => void;
  onShowAll: () => void;
  addModalVisible: boolean;
  onCloseAddModal: () => void;
  addToListItem: AddToListItem | null;
  activeLists: ActiveList[] | undefined;
  onPickList: (listId: Id<"shoppingLists">) => void;
  onCloseListPicker: () => void;
  showGestureOnboarding: boolean;
  onDismissGesture: () => void;
  levelsHint: HintState;
  tabsRef: React.RefObject<View | null>;
  lowHint: HintState;
  itemRef: React.RefObject<View | null>;
}

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
}: StockModalsAndOverlaysProps) {
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
