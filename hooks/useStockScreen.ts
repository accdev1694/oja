import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useState, useMemo, useCallback, useRef, useEffect, startTransition } from "react";
import { View } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  notificationAsync,
  impactAsync,
  NotificationFeedbackType,
  ImpactFeedbackStyle,
} from "expo-haptics";
import { haptic } from "@/lib/haptics/safeHaptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  STOCK_LEVEL_ORDER,
  type StockLevel,
} from "@/components/pantry";

import { useGlassAlert } from "@/components/ui/glass";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsSwitchingUsers } from "@/hooks/useIsSwitchingUsers";
import { defaultListName } from "@/lib/list/helpers";
import { useHint } from "@/hooks/useHint";
import { hasViewedHint as hasViewedHintLocal } from "@/lib/storage/hintStorage";

import { ESSENTIALS_SECTION_TITLE, getItemTier, SCREEN_WIDTH } from "@/components/stock/stockStyles";

type PantryViewMode = "attention" | "all";

export function useStockScreen() {
  const insets = useSafeAreaInsets();
  const { alert } = useGlassAlert();
  const { firstName } = useCurrentUser();
  const isSwitchingUsers = useIsSwitchingUsers();

  // Hint targets
  const headerRef = useRef<View>(null);
  const tabsRef = useRef<View>(null);
  const itemRef = useRef<View>(null);

  // Hints
  const introHint = useHint("stock_intro", "delayed");
  const levelsHint = useHint("stock_levels", "manual");
  const lowHint = useHint("stock_low_alert", "manual");
  // Sequence: Show levels hint after intro is dismissed
  useEffect(() => {
    if (introHint.shouldShow === false) {
      if (!hasViewedHintLocal("stock_levels")) {
        levelsHint.showHint();
      }
    }
  }, [introHint.shouldShow]);

  // Skip queries during user switching to prevent cache leakage
  const items = useQuery(
    api.pantryItems.getByUser,
    !isSwitchingUsers ? {} : "skip"
  );
  const activeLists = useQuery(
    api.shoppingLists.getActive,
    !isSwitchingUsers ? {} : "skip"
  );
  const updateStockLevel = useMutation(api.pantryItems.updateStockLevel);

  // Wrappers for hints
  const handleStockUpdateWithHint = useCallback(async (itemId: Id<"pantryItems">, level: StockLevel) => {
    await updateStockLevel({ id: itemId, stockLevel: level });
    if (level === "low") {
      lowHint.showHint();
    }
  }, [updateStockLevel, lowHint]);

  const createList = useMutation(api.shoppingLists.create);
  const addListItem = useMutation(api.listItems.create);
  const migrateIcons = useMutation(api.pantryItems.migrateIcons);
  const removePantryItem = useMutation(api.pantryItems.remove);

  // Dedup sweep
  const duplicateGroups = useQuery(
    api.pantryItems.findDuplicates,
    !isSwitchingUsers ? {} : "skip"
  );
  const mergeDuplicatesMut = useMutation(api.pantryItems.mergeDuplicates);
  const [dedupDismissed, setDedupDismissed] = useState(false);

  // Pantry lifecycle mutations
  const togglePin = useMutation(api.pantryItems.togglePin);
  const archiveItemMut = useMutation(api.pantryItems.archiveItem);
  const unarchiveItemMut = useMutation(api.pantryItems.unarchiveItem);
  const archivedItems = useQuery(
    api.pantryItems.getArchivedItems,
    !isSwitchingUsers ? {} : "skip"
  );
  const archivedCount = archivedItems?.length ?? 0;

  // Migrate icons for items that don't have them yet
  useEffect(() => {
    if (items && items.length > 0) {
      const needsMigration = items.some((item) => !item.icon);
      if (needsMigration) {
        migrateIcons({}).catch((err) => {
          console.error("Migration failed:", err);
        });
      }
    }
  }, [items?.length]);

  // View mode: "attention" shows only Low+Out items, "all" shows everything
  const [viewMode, setViewMode] = useState<PantryViewMode>("attention");

  // Capsule switcher active index: 0 = attention, 1 = all
  const capsuleActiveIndex = viewMode === "attention" ? 0 : 1;

  // UI State
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [stockFilters, setStockFilters] = useState<Set<StockLevel>>(new Set());

  // Add item modal
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Animation keys for focus and switching
  const [animationKey, setAnimationKey] = useState(0);
  const [pageAnimationKey, setPageAnimationKey] = useState(0);

  // Trigger animations every time this tab gains focus
  useFocusEffect(
    useCallback(() => {
      setAnimationKey((prev) => prev + 1);
      setPageAnimationKey((prev) => prev + 1);
    }, [])
  );

  // Gesture onboarding
  const [showGestureOnboarding, setShowGestureOnboarding] = useState(false);
  const gestureOnboardingChecked = useRef(false);

  useEffect(() => {
    if (gestureOnboardingChecked.current) return;
    if (!items || items.length === 0) return;
    gestureOnboardingChecked.current = true;

    AsyncStorage.getItem("oja_gesture_onboarding_done").then((val) => {
      if (val !== "true") {
        setShowGestureOnboarding(true);
      }
    });
  }, [items]);

  const dismissGestureOnboarding = useCallback(() => {
    setShowGestureOnboarding(false);
    AsyncStorage.setItem("oja_gesture_onboarding_done", "true");
  }, []);

  // Toast state
  const [flyStartPosition, setFlyStartPosition] = useState({ x: 0, y: 0 });
  const [toastVisible, setToastVisible] = useState(false);
  const [toastItemName, setToastItemName] = useState("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add-to-list picker state
  const [addToListItem, setAddToListItem] = useState<{
    name: string;
    lastPrice?: number;
  } | null>(null);

  // Derive unique categories from items
  const categories = useMemo(() => {
    if (!items) return [];
    const cats = new Set(items.map((item) => item.category));
    return [...cats].sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Initialize all categories as collapsed on first load
  const categoriesInitialized = useRef(false);
  useEffect(() => {
    if (categoriesInitialized.current) return;
    if (categories.length === 0) return;
    categoriesInitialized.current = true;
    setCollapsedCategories(new Set<string>(categories));
  }, [categories]);

  const attentionCount = useMemo(() => {
    if (!items) return 0;
    return items.filter(
      (item) => item.stockLevel === "low" || item.stockLevel === "out"
    ).length;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const isSearching = searchQuery.trim().length > 0;
    const searchLower = searchQuery.toLowerCase();

    const activeResults = items.filter((item) => {
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
      const archivedResults = archivedItems.filter((item) =>
        item.name.toLowerCase().includes(searchLower)
      );
      return [...activeResults, ...archivedResults];
    }

    return activeResults;
  }, [items, archivedItems, searchQuery, stockFilters, viewMode]);

  const sections = useMemo(() => {
    const essentials: typeof filteredItems = [];
    const regular: typeof filteredItems = [];

    filteredItems.forEach((item) => {
      const tier = getItemTier(item);
      if (tier === 1) {
        essentials.push(item);
      } else {
        regular.push(item);
      }
    });

    const grouped: Record<string, typeof filteredItems> = {};
    regular.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });

    const result: { title: string; data: typeof filteredItems; sectionDelay: number }[] = [];

    if (essentials.length > 0) {
      result.push({
        title: ESSENTIALS_SECTION_TITLE,
        data: essentials,
        sectionDelay: 300
      });
    }

    Object.entries(grouped).forEach(([category, data]) => {
      result.push({
        title: category,
        data,
        sectionDelay: 300 + (result.length * 50)
      });
    });

    return result;
  }, [filteredItems]);

  const activeFilterCount = useMemo(() => stockFilters.size, [stockFilters]);

  const hasExpandedCategory = useMemo(
    () => sections.some((s) => !collapsedCategories.has(s.title)),
    [sections, collapsedCategories]
  );

  // ── Callbacks ──────────────────────────────────────────────────────────

  const toggleStockFilter = useCallback((level: StockLevel) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setStockFilters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        if (newSet.size > 1) {
          newSet.delete(level);
        }
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  }, []);

  const showAllFilters = useCallback(() => {
    setStockFilters(new Set<StockLevel>());
    impactAsync(ImpactFeedbackStyle.Light);
  }, []);

  const showToast = useCallback((itemName: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastItemName(itemName);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  }, []);

  const autoAddToShoppingList = useCallback(async (
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
  }, [activeLists, createList, addListItem, showToast]);

  const getNextLowerLevel = useCallback((current: StockLevel): StockLevel | null => {
    const currentIndex = STOCK_LEVEL_ORDER.indexOf(current);
    if (currentIndex > 0) return STOCK_LEVEL_ORDER[currentIndex - 1];
    return null;
  }, []);

  const getNextHigherLevel = useCallback((current: StockLevel): StockLevel | null => {
    const currentIndex = STOCK_LEVEL_ORDER.indexOf(current);
    if (currentIndex < STOCK_LEVEL_ORDER.length - 1) return STOCK_LEVEL_ORDER[currentIndex + 1];
    return null;
  }, []);

  const handleSwipeDecrease = useCallback(async (itemId: Id<"pantryItems">) => {
    if (showGestureOnboarding) dismissGestureOnboarding();
    const item = items?.find((i) => i._id === itemId);
    if (!item) return;

    const nextLevel = getNextLowerLevel(item.stockLevel as StockLevel);
    if (!nextLevel) return;

    try {
      if (nextLevel === "out") {
        await notificationAsync(NotificationFeedbackType.Warning);
      } else {
        await impactAsync(ImpactFeedbackStyle.Light);
      }
    } catch {}

    try {
      await handleStockUpdateWithHint(item._id, nextLevel);
      if (nextLevel === "out") {
        await autoAddToShoppingList(item, { x: SCREEN_WIDTH / 2, y: 300 });
      }
    } catch (error) {
      console.error("Failed to decrease stock:", error);
    }
  }, [items, showGestureOnboarding, dismissGestureOnboarding, getNextLowerLevel, updateStockLevel, autoAddToShoppingList]);

  const handleSwipeIncrease = useCallback(async (itemId: Id<"pantryItems">) => {
    if (showGestureOnboarding) dismissGestureOnboarding();
    const item = items?.find((i) => i._id === itemId);
    if (!item) return;

    const nextLevel = getNextHigherLevel(item.stockLevel as StockLevel);
    if (!nextLevel) return;

    try {
      if (nextLevel === "stocked") {
        await notificationAsync(NotificationFeedbackType.Success);
      } else {
        await impactAsync(ImpactFeedbackStyle.Light);
      }
    } catch {}

    try {
      await updateStockLevel({ id: item._id, stockLevel: nextLevel });
    } catch (error) {
      console.error("Failed to increase stock:", error);
    }
  }, [items, showGestureOnboarding, dismissGestureOnboarding, getNextHigherLevel, updateStockLevel]);

  const handleRemoveItem = useCallback((itemId: Id<"pantryItems">) => {
    const item = items?.find((i) => i._id === itemId);
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
  }, [items, removePantryItem, alert]);

  const handlePickList = useCallback(async (
    listId: Id<"shoppingLists">,
    listName: string,
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
  }, [addListItem, showToast]);

  const handleAddToList = useCallback((itemId: Id<"pantryItems">) => {
    const item = items?.find((i) => i._id === itemId);
    if (!item) return;

    const planningLists = (activeLists ?? []).filter(
      (l) => l.status === "active"
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
      handlePickList(planningLists[0]._id, planningLists[0].name, item.name, item.lastPrice);
      return;
    }

    setAddToListItem({ name: item.name, lastPrice: item.lastPrice });
  }, [items, activeLists, createList, addListItem, showToast, alert]);

  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const handleViewModeSwitch = useCallback((index: number) => {
    const mode: PantryViewMode = index === 0 ? "attention" : "all";
    if (mode === viewMode) return;

    startTransition(() => {
      setViewMode(mode);
      setSearchQuery("");
      setAnimationKey((prev) => prev + 1);
      if (mode === "all" && categories.length > 0) {
        setCollapsedCategories(new Set(categories));
      }
    });
  }, [viewMode, categories]);

  const handleOpenAddModal = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    setAddModalVisible(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setAddModalVisible(false);
  }, []);

  const handleOpenFilter = useCallback(() => {
    setFilterVisible(true);
  }, []);

  const handleCloseFilter = useCallback(() => {
    setFilterVisible(false);
  }, []);

  const handleCloseListPicker = useCallback(() => {
    setAddToListItem(null);
  }, []);

  const handleMergeDuplicates = useCallback(async () => {
    if (!duplicateGroups || duplicateGroups.length === 0) return;

    const totalDupes = duplicateGroups.reduce((sum, g) => sum + g.length - 1, 0);
    const groupCount = duplicateGroups.length;

    alert(
      "Merge Duplicates",
      `Found ${groupCount} group${groupCount !== 1 ? "s" : ""} of duplicates (${totalDupes} extra item${totalDupes !== 1 ? "s" : ""}). The best data (receipt prices, purchase counts, pinned status) will be kept for each.`,
      [
        {
          text: "Dismiss",
          style: "cancel",
          onPress: () => setDedupDismissed(true),
        },
        {
          text: "Merge All",
          onPress: async () => {
            try {
              for (const group of duplicateGroups) {
                const priceRank = (source?: string) =>
                  source === "receipt" ? 3 : source === "user" ? 2 : source === "ai_estimate" ? 1 : 0;

                const sorted = [...group].sort((a, b) => {
                  const priceDiff = priceRank(b.priceSource) - priceRank(a.priceSource);
                  if (priceDiff !== 0) return priceDiff;
                  return (b.purchaseCount ?? 0) - (a.purchaseCount ?? 0);
                });

                const keepId = sorted[0]._id;
                const deleteIds = sorted.slice(1).map((item) => item._id);

                await mergeDuplicatesMut({ keepId, deleteIds });
              }
              haptic("success");
            } catch (err) {
              console.error("Merge duplicates failed:", err);
              haptic("error");
            }
          },
        },
      ]
    );
  }, [duplicateGroups, alert, mergeDuplicatesMut]);

  const handleItemLongPress = useCallback((itemId: Id<"pantryItems">) => {
    const item = items?.find((i) => i._id === itemId)
      ?? archivedItems?.find((i) => i._id === itemId);
    if (!item) return;

    haptic("medium");

    const isArchived = item.status === "archived";
    const isPinned = item.pinned === true;

    if (isArchived) {
      alert("Archived Item", `"${item.name}" is archived.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore to Pantry",
          onPress: async () => {
            try {
              await unarchiveItemMut({ pantryItemId: item._id });
              haptic("success");
            } catch (err) {
              console.error("Failed to unarchive:", err);
            }
          },
        },
      ]);
      return;
    }

    const pinLabel = isPinned ? "Unpin from Essentials" : "Pin to Essentials";
    const options: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [
      { text: "Cancel", style: "cancel" },
      {
        text: pinLabel,
        onPress: async () => {
          try {
            await togglePin({ pantryItemId: item._id });
            haptic("light");
          } catch (err) {
            console.error("Failed to toggle pin:", err);
          }
        },
      },
    ];

    if (!isPinned) {
      options.push({
        text: "Archive",
        style: "destructive",
        onPress: async () => {
          try {
            await archiveItemMut({ pantryItemId: item._id });
            haptic("light");
          } catch (err) {
            console.error("Failed to archive:", err);
          }
        },
      });
    }

    alert("Item Options", `"${item.name}"`, options);
  }, [items, archivedItems, togglePin, archiveItemMut, unarchiveItemMut, alert]);

  const toggleEssentials = useCallback(() => {
    toggleCategory(ESSENTIALS_SECTION_TITLE);
  }, [toggleCategory]);

  return {
    // Refs
    headerRef,
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
    filterVisible,
    stockFilters,
    addModalVisible,
    animationKey,
    pageAnimationKey,
    showGestureOnboarding,
    dedupDismissed,
    flyStartPosition,
    toastVisible,
    toastItemName,
    addToListItem,

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
  };
}
