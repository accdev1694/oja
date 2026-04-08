import { useCallback } from "react";
import {
  notificationAsync,
  impactAsync,
  NotificationFeedbackType,
  ImpactFeedbackStyle,
} from "expo-haptics";
import { Id } from "@/convex/_generated/dataModel";
import {
  STOCK_LEVEL_ORDER,
  type StockLevel,
} from "@/components/pantry";
import { SCREEN_WIDTH } from "@/components/stock/stockStyles";
import { defaultListName } from "@/lib/list/helpers";
import type { PantryItem, ShoppingList } from "./types";
import type { useStockData } from "./useStockData";
import { useStockItemActions } from "./useStockItemActions";

/** Derive mutation types from useStockData to stay in sync automatically */
type DataReturn = ReturnType<typeof useStockData>;

interface StockActionsInput {
  items: DataReturn["items"];
  archivedItems: PantryItem[] | undefined;
  activeLists: DataReturn["activeLists"];
  duplicateGroups: DataReturn["duplicateGroups"];
  updateStockLevel: DataReturn["updateStockLevel"];
  createList: DataReturn["createList"];
  addListItem: DataReturn["addListItem"];
  removePantryItem: DataReturn["removePantryItem"];
  mergeDuplicatesMut: DataReturn["mergeDuplicatesMut"];
  togglePin: DataReturn["togglePin"];
  archiveItemMut: DataReturn["archiveItemMut"];
  unarchiveItemMut: DataReturn["unarchiveItemMut"];
  setDedupDismissed: DataReturn["setDedupDismissed"];

  alert: (
    title: string,
    message: string,
    buttons: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[]
  ) => void;
  showToast: (itemName: string) => void;
  setFlyStartPosition: (pos: { x: number; y: number }) => void;
  setAddToListItem: (item: { name: string; lastPrice?: number } | null) => void;
  showGestureOnboarding: boolean;
  dismissGestureOnboarding: () => void;
  lowHint: { showHint: () => void };
}

/**
 * Contains all action callbacks for the stock screen:
 * swipe handlers, remove, add-to-list, merge duplicates, long press, etc.
 */
export function useStockActions(input: StockActionsInput) {
  const {
    items,
    archivedItems,
    activeLists,
    duplicateGroups,
    updateStockLevel,
    createList,
    addListItem,
    removePantryItem,
    mergeDuplicatesMut,
    togglePin,
    archiveItemMut,
    unarchiveItemMut,
    alert,
    showToast,
    setFlyStartPosition,
    setAddToListItem,
    setDedupDismissed,
    showGestureOnboarding,
    dismissGestureOnboarding,
    lowHint,
  } = input;

  // Delegate long-press, merge-duplicates, toggle-essentials to extracted hook
  const { handleMergeDuplicates, handleItemLongPress, toggleEssentials } =
    useStockItemActions({
      items,
      archivedItems,
      duplicateGroups,
      mergeDuplicatesMut,
      togglePin,
      archiveItemMut,
      unarchiveItemMut,
      alert,
      setDedupDismissed,
    });

  // ── Stock-level helpers ────────────────────────────────────────────────

  const handleStockUpdateWithHint = useCallback(
    async (itemId: Id<"pantryItems">, level: StockLevel) => {
      await updateStockLevel({ id: itemId, stockLevel: level });
      if (level === "low") {
        lowHint.showHint();
      }
    },
    [updateStockLevel, lowHint]
  );

  const getNextLowerLevel = useCallback(
    (current: StockLevel): StockLevel | null => {
      const currentIndex = STOCK_LEVEL_ORDER.indexOf(current);
      if (currentIndex > 0) return STOCK_LEVEL_ORDER[currentIndex - 1];
      return null;
    },
    []
  );

  const getNextHigherLevel = useCallback(
    (current: StockLevel): StockLevel | null => {
      const currentIndex = STOCK_LEVEL_ORDER.indexOf(current);
      if (currentIndex < STOCK_LEVEL_ORDER.length - 1)
        return STOCK_LEVEL_ORDER[currentIndex + 1];
      return null;
    },
    []
  );

  // ── Auto-add to shopping list ──────────────────────────────────────────

  const autoAddToShoppingList = useCallback(
    async (
      item: { _id: Id<"pantryItems">; name: string; category: string },
      startPos?: { x: number; y: number }
    ) => {
      try {
        if (startPos) setFlyStartPosition(startPos);
        showToast(item.name);

        let listId: Id<"shoppingLists">;
        if (activeLists && activeLists.length > 0) {
          listId = activeLists[0]._id;
        } else {
          const listName = defaultListName();
          listId = await createList({ name: listName, budget: 50 });
        }

        await addListItem({
          listId,
          name: item.name,
          category: item.category,
          quantity: 1,
          priority: "must-have",
          pantryItemId: item._id,
          autoAdded: true,
          force: true,
        });
      } catch (error) {
        console.error("Failed to auto-add to list:", error);
      }
    },
    [activeLists, createList, addListItem, showToast, setFlyStartPosition]
  );

  // ── Swipe handlers ────────────────────────────────────────────────────

  const handleSwipeDecrease = useCallback(
    async (itemId: Id<"pantryItems">) => {
      if (showGestureOnboarding) dismissGestureOnboarding();
      const item = items?.find((i: PantryItem) => i._id === itemId);
      if (!item) return;

      const nextLevel = getNextLowerLevel(item.stockLevel as StockLevel);
      if (!nextLevel) return;

      try {
        if (nextLevel === "out") {
          await notificationAsync(NotificationFeedbackType.Warning);
        } else {
          await impactAsync(ImpactFeedbackStyle.Light);
        }
      } catch {
        // haptics not available
      }

      try {
        await handleStockUpdateWithHint(item._id, nextLevel);
        if (nextLevel === "out") {
          await autoAddToShoppingList(item, {
            x: SCREEN_WIDTH / 2,
            y: 300,
          });
        }
      } catch (error) {
        console.error("Failed to decrease stock:", error);
      }
    },
    [
      items,
      showGestureOnboarding,
      dismissGestureOnboarding,
      getNextLowerLevel,
      handleStockUpdateWithHint,
      autoAddToShoppingList,
    ]
  );

  const handleSwipeIncrease = useCallback(
    async (itemId: Id<"pantryItems">) => {
      if (showGestureOnboarding) dismissGestureOnboarding();
      const item = items?.find((i: PantryItem) => i._id === itemId);
      if (!item) return;

      const nextLevel = getNextHigherLevel(item.stockLevel as StockLevel);
      if (!nextLevel) return;

      try {
        if (nextLevel === "stocked") {
          await notificationAsync(NotificationFeedbackType.Success);
        } else {
          await impactAsync(ImpactFeedbackStyle.Light);
        }
      } catch {
        // haptics not available
      }

      try {
        await updateStockLevel({ id: item._id, stockLevel: nextLevel });
      } catch (error) {
        console.error("Failed to increase stock:", error);
      }
    },
    [
      items,
      showGestureOnboarding,
      dismissGestureOnboarding,
      getNextHigherLevel,
      updateStockLevel,
    ]
  );

  // ── Remove item ────────────────────────────────────────────────────────

  const handleRemoveItem = useCallback(
    (itemId: Id<"pantryItems">) => {
      const item = items?.find((i: PantryItem) => i._id === itemId);
      if (!item) return;

      impactAsync(ImpactFeedbackStyle.Medium);
      const doRemove = async () => {
        try {
          await removePantryItem({ id: item._id });
          notificationAsync(NotificationFeedbackType.Success);
        } catch (error) {
          console.error("Failed to remove item:", error);
        }
      };

      alert("Remove Item", `Remove "${item.name}" from your stock?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doRemove },
      ]);
    },
    [items, removePantryItem, alert]
  );

  // ── Add to list ────────────────────────────────────────────────────────

  const handlePickList = useCallback(
    async (
      listId: Id<"shoppingLists">,
      _listName: string,
      itemName: string,
      estimatedPrice?: number
    ) => {
      try {
        await addListItem({
          listId,
          name: itemName,
          quantity: 1,
          estimatedPrice,
          force: true,
        });
        showToast(itemName);
      } catch (e) {
        console.error("Failed to add to list:", e);
      }
      setAddToListItem(null);
    },
    [addListItem, showToast, setAddToListItem]
  );

  const handleAddToList = useCallback(
    (itemId: Id<"pantryItems">) => {
      const item = items?.find((i: PantryItem) => i._id === itemId);
      if (!item) return;

      const planningLists = (activeLists ?? []).filter(
        (l: ShoppingList) => l.status === "active"
      );

      if (planningLists.length === 0) {
        const doCreate = async () => {
          try {
            const listId = await createList({ name: defaultListName() });
            await addListItem({
              listId: listId as Id<"shoppingLists">,
              name: item.name,
              quantity: 1,
              estimatedPrice: item.lastPrice,
              force: true,
            });
            showToast(item.name);
          } catch (e) {
            console.error("Failed to create list:", e);
          }
        };
        alert("No Active Lists", "Create a new list and add this item?", [
          { text: "Cancel", style: "cancel" },
          { text: "Create", onPress: doCreate },
        ]);
        return;
      }

      if (planningLists.length === 1) {
        handlePickList(
          planningLists[0]._id,
          planningLists[0].name,
          item.name,
          item.lastPrice
        );
        return;
      }

      setAddToListItem({ name: item.name, lastPrice: item.lastPrice });
    },
    [
      items,
      activeLists,
      createList,
      addListItem,
      showToast,
      alert,
      handlePickList,
      setAddToListItem,
    ]
  );

  return {
    handleSwipeDecrease,
    handleSwipeIncrease,
    handleRemoveItem,
    handleAddToList,
    handlePickList,
    handleMergeDuplicates,
    handleItemLongPress,
    toggleEssentials,
  };
}
