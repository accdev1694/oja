import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { haptic } from "@/lib/haptics/safeHaptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import {
  useReanimatedKeyboardAnimation,
  useReanimatedFocusedInput,
  useKeyboardHandler,
} from "react-native-keyboard-controller";

import {
  GlassScreen,
  GlassButton,
  GlassSearchInput,
  SimpleHeader,
  CircularBudgetDial,
  OfflineBanner,
  AnimatedSection,
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
  GlassDropdown,
  GlassSegmentedControl,
  type DropdownOption,
} from "@/components/ui/glass";
import { usePartnerRole } from "@/hooks/usePartnerRole";
import {
  CommentThread,
  NotificationBell,
  NotificationDropdown,
} from "@/components/partners";

import { ListChatThread } from "@/components/partners/ListChatThread";
import { GlassToast } from "@/components/ui/glass/GlassToast";
import { TipBanner } from "@/components/ui/TipBanner";
import { useDelightToast } from "@/hooks/useDelightToast";
import { useStableValue, shallowRecordEqual } from "@/hooks/useStableValue";
import { ShoppingListItem, type ListItem } from "@/components/list/ShoppingListItem";
import { StickyBudgetBar } from "@/components/list/BudgetSection";
import { ListActionRow } from "@/components/list/ListActionRow";
import { StoreDropdownSheet } from "@/components/list/StoreDropdownSheet";
import { AddItemsModal } from "@/components/list/AddItemsModal";
import { HealthAnalysisModal } from "@/components/lists/HealthAnalysisModal";
import {
  EditBudgetModal,
  MidShopModal,
  EditItemModal,
  ListPickerModal,
  TripSummaryModal,
} from "@/components/list/modals";
import { ScanReceiptNudgeModal } from "@/components/list/modals/ScanReceiptNudgeModal";
import { EditListNameModal } from "@/components/lists/EditListNameModal";
import type { TripStats } from "@/hooks/useTripSummary";
import { getStoreInfoSafe } from "@/convex/lib/storeNormalizer";

import { useHint } from "@/hooks/useHint";
import { HintOverlay } from "@/components/tutorial/HintOverlay";
import { hasViewedHint as hasViewedHintLocal } from "@/lib/storage/hintStorage";

// ─── Sectionalization Types ──────────────────────────────────────────────────
type ListSectionHeader = {
  _id: string;
  isHeader: true;
  title: string;
};

type CategorizedItem = ListItem | ListSectionHeader;

export default function ListDetailScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string as Id<"shoppingLists">;
  const router = useRouter();
  const { alert } = useGlassAlert();
  const { toast, dismiss, onMundaneAction, showToast } = useDelightToast();

  // Hint targets
  const searchRef = useRef<View>(null);
  const budgetRef = useRef<View>(null);
  const healthRef = useRef<View>(null);

  // Hints
  const addHint = useHint("list_detail_add", "delayed");
  const budgetHint = useHint("list_detail_budget", "manual");
  const healthHint = useHint("list_detail_health", "manual");

  const list = useQuery(api.shoppingLists.getById, { id });
  const items = useQuery(api.listItems.getByList, { listId: id });

  // Strict sequencing: Only ONE hint visible at a time
  // Budget hint shows after add hint is dismissed and first item is added
  useEffect(() => {
    const noHintsVisible =
      addHint.shouldShow === false &&
      budgetHint.shouldShow === false &&
      healthHint.shouldShow === false;

    if (
      items &&
      items.length === 1 &&
      noHintsVisible &&
      !hasViewedHintLocal("list_detail_budget")
    ) {
      budgetHint.showHint();
    }
  }, [items?.length, addHint.shouldShow, budgetHint.shouldShow, healthHint.shouldShow]);

  // Health hint is triggered manually on first tap of health icon (see handleHealthPress below)
  const toggleChecked = useMutation(api.listItems.toggleChecked);
  const addItem = useMutation(api.listItems.create);
  const updateItem = useMutation(api.listItems.update);
  const removeItem = useMutation(api.listItems.remove);
  const removeMultipleItems = useMutation(api.listItems.removeMultiple);
  const finishTripMut = useMutation(api.shoppingLists.finishTrip);
  const restockFromCheckedItems = useMutation(api.pantryItems.restockFromCheckedItems);
  const refreshListPrices = useMutation(api.listItems.refreshListPrices);

  // Health icon pulse animation
  const pulseScale = useSharedValue(1);
  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    const shouldPulse = list && !list.healthAnalysis && (items?.length ?? 0) >= 5;
    
    if (shouldPulse) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [list?.healthAnalysis, items?.length]);

  // Trip stats for completion summary
  const tripStats = useQuery(
    api.shoppingLists.getTripStats,
    list?.isInProgress ? { id } : "skip"
  ) as TripStats | null | undefined;

  const updateList = useMutation(api.shoppingLists.update);
  const removeList = useMutation(api.shoppingLists.remove);
  const addItemMidShop = useMutation(api.listItems.addItemMidShop);
  const setStore = useMutation(api.shoppingLists.setStore);
  const switchStoreMidShop = useMutation(api.shoppingLists.switchStoreMidShop);
  const dismissTip = useMutation(api.tips.dismissTip);

  // Check if health discovery banner has been dismissed
  const healthBannerDismissed = useQuery(api.tips.hasDismissedTip, { tipKey: "health_discovery_banner" });

  // Current user for store preferences
  const currentUser = useQuery(api.users.getCurrent);
  const userFavorites = (currentUser?.storePreferences?.favorites ?? []) as string[];

  // Partner mode
  const { isOwner, isPartner, canEdit, loading: roleLoading } = usePartnerRole(id);
  const listItemIds = useMemo(() => items?.map((i) => i._id) ?? [], [items]);
  const rawCommentCounts = useQuery(api.partners.getCommentCounts, items ? { listItemIds } : "skip");
  const commentCounts = useStableValue(rawCommentCounts, shallowRecordEqual);
  const allActiveLists = useQuery(api.shoppingLists.getActive);

  // Add-to-list picker state
  const [addToListItem, setAddToListItem] = useState<{
    name: string;
    estimatedPrice?: number;
    quantity: number;
  } | null>(null);

  // Edit item modal state
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);

  // Comment thread state
  const [commentState, setCommentState] = useState<{
    visible: boolean;
    itemId: Id<"listItems"> | null;
    itemName: string;
  }>({ visible: false, itemId: null, itemName: "" });

  // List chat state
  const [showListChat, setShowListChat] = useState(false);

  // Partner data
  const listPartners = useQuery(api.partners.getByList, { listId: id });
  const hasPartners = (listPartners ?? []).some((p: any) => p.status === "accepted" || p.status === "pending");
  const listMessageCount = useQuery(api.partners.getListMessageCount, hasPartners ? { listId: id } : "skip");

  // Edit budget modal state
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);

  // Edit list name modal state
  const [showEditNameModal, setShowEditNameModal] = useState(false);

  // Trip summary modal state
  const [showTripSummary, setShowTripSummary] = useState(false);

  // Scan receipt nudge modal state
  const [showScanNudge, setShowScanNudge] = useState(false);

  // Scan credit info for receipt nudge modal
  const pointsBalance = useQuery(api.points.getPointsBalance);

  // Streaks for receipt nudge modal (receipt_scanner streak)
  const streaks = useQuery(api.insights.getStreaks);
  const receiptStreakCount = useMemo(() => {
    const streak = streaks?.find((s) => s.type === "receipt_scanner");
    return streak?.currentCount ?? 0;
  }, [streaks]);

  // Track dial transition animation
  const [dialTransitioning, setDialTransitioning] = useState(false);

  // Refresh prices loading state
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  // Add Items modal state
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);

  // Health Analysis modal state
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [isPostShoppingHealthFlow, setIsPostShoppingHealthFlow] = useState(false);

  // Mid-shop add flow state
  const [midShopState, setMidShopState] = useState<{
    visible: boolean;
    name: string;
    price: number;
    quantity: number;
  }>({ visible: false, name: "", price: 0, quantity: 1 });


  // Mid-shop store picker state
  const [showMidShopStorePicker, setShowMidShopStorePicker] = useState(false);

  // Category filter for items list
  const [listCategoryFilter, setListCategoryFilter] = useState<string | null>(null);

  // Search filter for items list
  const [searchTerm, setSearchTerm] = useState("");

  // Bulk selection state (ref + version counter to avoid full re-renders)
  const selectedItemsRef = useRef(new Set<Id<"listItems">>());
  const [selectionVersion, setSelectionVersion] = useState(0);
  const flashListRef = useRef<FlashListRef<CategorizedItem>>(null);

  // Keyboard tracking via react-native-keyboard-controller — reports full IME frame including toolbar
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const { input: focusedInput } = useReanimatedFocusedInput();

  const keyboardContainerStyle = useAnimatedStyle(() => ({
    flex: 1,
    paddingBottom: keyboardHeight.value,
  }));

  // Scroll tracking for sticky mini budget bar (hooks must be before early returns)
  const scrollY = useSharedValue(0);
  const DIAL_SCROLL_THRESHOLD = 200 + spacing.md;

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }, [scrollY]);

  // Calculate totals — memoized to avoid O(n) per render
  // Must be before early returns to satisfy Rules of Hooks
  const safeItems = items ?? [];
  const { estimatedTotal, actualTotal, checkedTotal, checkedCount, totalCount } = useMemo(() => {
    let estimated = 0;
    let actual = 0;
    let checked = 0;
    let checkedN = 0;

    for (const item of safeItems) {
      const estPrice = (item.estimatedPrice || 0) * item.quantity;
      estimated += estPrice;

      if (item.isChecked) {
        checkedN++;
        if (item.actualPrice) {
          actual += item.actualPrice * item.quantity;
        }
        checked += (item.actualPrice || item.estimatedPrice || 0) * item.quantity;
      }
    }

    return {
      estimatedTotal: estimated,
      actualTotal: actual,
      checkedTotal: checked,
      checkedCount: checkedN,
      totalCount: safeItems.length,
    };
  }, [safeItems]);

  // Budget status
  const budget = list?.budget || 0;
  const currentTotal = estimatedTotal;
  const remainingBudget = budget - currentTotal;

  // Mini bar values (trip-aware)
  const isInProgress = !!list?.isInProgress;
  const miniBarActiveValue = isInProgress ? checkedTotal : estimatedTotal;
  const miniBarRemaining = budget - miniBarActiveValue;
  const miniBarLabel = isInProgress ? "spent" : "planned";

  // Track if checked items are visible
  const [showCheckedItems, setShowCheckedItems] = useState(true);

  // Memoized category data + display items
  const { categoryOptions, displayItems } = useMemo(() => {
    const safeItemsArr = items ?? [];
    
    // 1. Build Item List based on filters
    let itemsToDisplay = safeItemsArr;

    // Apply "Hide Checked" filter (only if not searching)
    if (!showCheckedItems && !searchTerm.trim()) {
      itemsToDisplay = safeItemsArr.filter(i => !i.isChecked);
    }

    // Apply category filter
    if (listCategoryFilter) {
      itemsToDisplay = itemsToDisplay.filter((i) => i.category === listCategoryFilter);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      itemsToDisplay = itemsToDisplay.filter((i) => i.name.toLowerCase().includes(search));
    }

    // 2. Sort Items: Category (asc) -> Name (asc)
    const sortedItems = [...itemsToDisplay].sort((a, b) => {
      const catA = a.category || "Other";
      const catB = b.category || "Other";
      
      if (catA !== catB) {
        return catA.localeCompare(catB);
      }
      
      // Within same category, sort by name only so checked items stay in place
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    // 3. Group with headers
    const result: CategorizedItem[] = [];
    let currentCat = "";
    
    sortedItems.forEach((item) => {
      const itemCat = item.category || "Other";
      if (itemCat !== currentCat && !listCategoryFilter) {
        result.push({
          _id: `header-${itemCat}`,
          isHeader: true,
          title: itemCat,
        });
        currentCat = itemCat;
      }
      result.push(item);
    });

    // Build category options (always from safeItemsArr to show all available categories)
    const cats = [...new Set(safeItemsArr.map((i) => i.category).filter(Boolean) as string[])].sort();
    const counts: Record<string, number> = {};
    safeItemsArr.forEach((i) => { if (i.category) counts[i.category] = (counts[i.category] || 0) + 1; });
    
    const options: DropdownOption[] = [
      { label: "All Items", value: null, count: safeItemsArr.length, icon: "format-list-bulleted" },
      ...cats.map((cat) => ({
        label: cat,
        value: cat,
        count: counts[cat],
        icon: "tag-outline",
      })),
    ];

    return { categoryOptions: options, displayItems: result };
  }, [items, listCategoryFilter, searchTerm, showCheckedItems]);

  // Active Shopper Logic
  const activeShopper = useQuery(
    api.users.getById,
    list?.activeShopperId ? { id: list.activeShopperId } : "skip"
  );

  // Edit budget handlers
  function handleOpenEditBudget() {
    haptic("light");
    setShowEditBudgetModal(true);
  }

  const handleSaveBudget = useCallback(async (newBudget: number | undefined) => {
    await updateList({ id, budget: newBudget });
  }, [updateList, id]);

  // Edit list name handlers
  function handleOpenEditName() {
    haptic("light");
    setShowEditNameModal(true);
  }

  const handleSaveListName = useCallback(async (newName: string) => {
    await updateList({ id, name: newName });
  }, [updateList, id]);

  const handleDeleteList = useCallback(() => {
    haptic("warning");
    alert(
      "Delete List",
      "Are you sure you want to permanently delete this list and all its items?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeList({ id });
              haptic("success");
              router.replace("/(app)/(tabs)/" as any);
            } catch (error) {
              console.error("Failed to delete list:", error);
              alert("Error", "Failed to delete list. Please try again.");
            }
          },
        },
      ]
    );
  }, [removeList, id, alert, router]);

  const handleRefreshPrices = useCallback(async () => {
    if (refreshingPrices) return;

    haptic("light");
    setRefreshingPrices(true);

    try {
      const result = await refreshListPrices({ listId: id });
      haptic("success");

      if (result.updated > 0) {
        showToast(
          `Updated ${result.updated} price${result.updated === 1 ? "" : "s"}`,
          "cash-sync",
          colors.accent.primary
        );
      } else {
        showToast("Prices are up to date", "check-circle", colors.semantic.success);
      }
    } catch (error) {
      console.error("Failed to refresh prices:", error);
      haptic("error");
      showToast("Failed to refresh prices", "alert-circle", colors.accent.error);
    } finally {
      setRefreshingPrices(false);
    }
  }, [refreshListPrices, id, refreshingPrices, showToast]);

  const handleToggleItem = useCallback(async (itemId: Id<"listItems">) => {
    haptic("light");
    try {
      await toggleChecked({ id: itemId });
      onMundaneAction();
    } catch (error) {
      console.error("Failed to toggle item:", error);
      alert("Error", "Failed to update item");
    }
  }, [toggleChecked, onMundaneAction, alert]);


  function closeMidShopModal() {
    setMidShopState({ visible: false, name: "", price: 0, quantity: 1 });
  }

  const handleMidShopAdd = useCallback(async (source: "add" | "next_trip") => {
    if (!midShopState.name) return;

    try {
      const result = await addItemMidShop({
        listId: id,
        name: midShopState.name,
        estimatedPrice: midShopState.price,
        quantity: midShopState.quantity,
        source,
      });

      // Check if mutation returned a duplicate indicator
      if (result && typeof result === "object" && "status" in result && result.status === "duplicate") {
        const existingItemId = "existingItemId" in result ? result.existingItemId as Id<"listItems"> : undefined;
        const existingName = "existingName" in result ? result.existingName as string : midShopState.name;
        const existingQty = "existingQuantity" in result ? result.existingQuantity as number : 0;
        const existingSize = "existingSize" in result ? result.existingSize as string | undefined : undefined;
        const isChecked = "isChecked" in result ? result.isChecked as boolean : false;
        const sizeLabel = existingSize ? ` (${existingSize})` : "";
        const itemName = midShopState.name;
        const itemPrice = midShopState.price;
        const itemQty = midShopState.quantity;
        const newQty = existingQty + itemQty;

        const locationMsg = isChecked ? "in your Checked section" : "on your list";

        closeMidShopModal();
        alert(
          "Already on List",
          `"${existingName}"${sizeLabel} (\u00D7${existingQty}) is already ${locationMsg}. What would you like to do?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: `Increment to \u00D7${newQty}`,
              onPress: async () => {
                if (existingItemId) {
                  try {
                    await updateItem({ id: existingItemId, quantity: newQty });
                    haptic("success");
                    showToast(`Updated to \u00D7${newQty}`, "check-circle", colors.semantic.success);
                  } catch (err) {
                    console.error("Failed to increment:", err);
                    alert("Error", "Failed to update quantity");
                  }
                }
              },
            },
            {
              text: "Add Separate",
              onPress: async () => {
                try {
                  await addItemMidShop({
                    listId: id,
                    name: itemName,
                    estimatedPrice: itemPrice,
                    quantity: itemQty,
                    source,
                    force: true,
                  });
                  haptic("success");
                  showToast(`"${itemName}" added to list`, "check-circle", colors.semantic.success);
                } catch (err) {
                  console.error("Failed to force-add:", err);
                  alert("Error", "Failed to add item");
                }
              },
            },
          ]
        );
        return;
      }

      haptic("success");

      if (source === "add") {
        showToast(`"${midShopState.name}" added to list`, "check-circle", colors.semantic.success);
      } else {
        showToast(`"${midShopState.name}" saved for next trip`, "clock-outline", colors.accent.secondary);
      }

      closeMidShopModal();
    } catch (error: unknown) {
      console.error("Failed to add mid-shop item:", error);
      alert("Error", "Failed to add item");
    }
  }, [addItemMidShop, id, midShopState, updateItem, alert, showToast]);

  const handleRemoveItem = useCallback(async (itemId: Id<"listItems">, itemName: string) => {
    haptic("medium");
    const doRemove = async () => {
      try {
        await removeItem({ id: itemId });
        haptic("success");
      } catch (error) {
        console.error("Failed to remove item:", error);
        alert("Error", "Failed to remove item");
      }
    };

    alert("Remove Item", `Remove "${itemName}" from list?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: doRemove },
    ]);
  }, [removeItem, alert]);

  // Selection mode functions
  const toggleItemSelection = useCallback((itemId: Id<"listItems">) => {
    haptic("light");
    const next = new Set(selectedItemsRef.current);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    selectedItemsRef.current = next;
    setSelectionVersion(v => v + 1);
  }, []);

  function selectAllItems() {
    haptic("light");
    if (items) {
      selectedItemsRef.current = new Set(items.map((i) => i._id));
      setSelectionVersion(v => v + 1);
    }
  }

  function clearSelection() {
    selectedItemsRef.current = new Set();
    setSelectionVersion(v => v + 1);
  }

  async function handleBulkDelete() {
    if (selectedItemsRef.current.size === 0) return;

    haptic("medium");
    const count = selectedItemsRef.current.size;

    const doDelete = async () => {
      try {
        await removeMultipleItems({ ids: Array.from(selectedItemsRef.current) });
        haptic("success");
        clearSelection(); // Also exits bulk select mode
      } catch (error) {
        console.error("Failed to delete items:", error);
        alert("Error", "Failed to delete items");
      }
    };

    alert(
      "Delete Items",
      `Delete ${count} selected ${count === 1 ? "item" : "items"}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]
    );
  }

  const handleEditItem = useCallback((item: ListItem) => {
    setEditingItem(item);
  }, []);

  const handleSaveEdit = useCallback(async (updates: {
    id: Id<"listItems">;
    name?: string;
    quantity?: number;
    estimatedPrice?: number;
    size?: string;
    unit?: string;
    priceOverride?: boolean;
    sizeOverride?: boolean;
  }) => {
    await updateItem(updates);
  }, [updateItem]);

  const handlePriorityChange = useCallback(async (
    itemId: Id<"listItems">,
    newPriority: "must-have" | "should-have" | "nice-to-have"
  ) => {
    haptic("medium");
    try {
      await updateItem({ id: itemId, priority: newPriority });
    } catch (error) {
      console.error("Failed to update priority:", error);
    }
  }, [updateItem]);

  function handleAddItemToList(item: { name: string; estimatedPrice?: number; quantity: number }) {
    const otherLists = (allActiveLists ?? []).filter(
      (l) => l._id !== id
    );

    if (otherLists.length === 0) {
      alert("No Other Lists", "There are no other active lists to add this item to.");
      return;
    }

    if (otherLists.length === 1) {
      pickListForItem(otherLists[0]._id, otherLists[0].name, item.name, item.estimatedPrice, item.quantity);
      return;
    }

    setAddToListItem(item);
  }

  async function pickListForItem(
    listId: Id<"shoppingLists">,
    listName: string,
    itemName: string,
    estimatedPrice?: number,
    quantity: number = 1
  ) {
    try {
      await addItem({
        listId,
        name: itemName,
        quantity,
        estimatedPrice,
        force: true,
      });
      showToast(`${itemName} \u2192 ${listName}`, "check-circle", "#00D4AA");
    } catch (e) {
      console.error("Failed to add to list:", e);
    }
    setAddToListItem(null);
  }

  // Store selection handler - sets store via dropdown sheet
  const handleSelectStore = useCallback(async (storeId: string) => {
    try {
      await setStore({ id, normalizedStoreId: storeId });
      haptic("success");
    } catch (error) {
      console.error("Failed to set store:", error);
      alert("Error", "Failed to set store");
    }
  }, [setStore, id, alert]);

  // Mid-shop store switch handler (lightweight, no re-pricing)
  const handleMidShopStoreSwitch = useCallback(async (storeId: string) => {
    setShowMidShopStorePicker(false);
    try {
      const result = await switchStoreMidShop({ listId: id, newStoreId: storeId });
      haptic("success");
      showToast(
        `Switched to ${result.storeName}`,
        "store",
        colors.accent.primary
      );
    } catch (error) {
      console.error("Failed to switch store:", error);
      showToast("Failed to switch store", "alert-circle", colors.semantic.danger);
    }
  }, [switchStoreMidShop, id, showToast]);

  // Finish trip — complete shopping session
  async function handleFinishTrip() {
    haptic("medium");
    setShowTripSummary(true);
  }

  // Called from TripSummaryModal "Finish Trip" button
  async function handleCompleteTrip() {
    try {
      await finishTripMut({ id });
      const result = await restockFromCheckedItems({ listId: id });
      haptic("success");
      setShowTripSummary(false);

      // Show health modal if list is eligible and hasn't been analyzed
      if (!list?.healthAnalysis && (items?.length ?? 0) >= 5) {
        setIsPostShoppingHealthFlow(true);
        setShowHealthModal(true);
      } else {
        setShowScanNudge(true);
      }
    } catch (error) {
      console.error("Failed to finish trip:", error);
      alert("Error", "Failed to finish trip");
    }
  }

  // Called from TripSummaryModal "Scan Receipt" button
  function handleScanReceipt() {
    setShowTripSummary(false);
    setShowScanNudge(false);
    router.push(`/(app)/(tabs)/scan?listId=${id}`);
  }

  // Called from ScanReceiptNudgeModal "Maybe Later" button
  function handleDismissNudge() {
    setShowScanNudge(false);
    router.replace("/(app)/(tabs)/" as any);
  }

  // Called from TripSummaryModal "Remove unchecked item"
  const handleRemoveUncheckedItem = useCallback(async (itemId: string) => {
    try {
      await removeItem({ id: itemId as Id<"listItems"> });
      haptic("light");
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  }, [removeItem]);

  // Called from TripSummaryModal "Move unchecked item"
  function handleMoveUncheckedItem(item: { name: string; estimatedPrice?: number; quantity: number }) {
    handleAddItemToList(item);
  }

  // Helper to scroll the FlashList by a calculated overlap amount
  const scrollByOverlap = useCallback((overlap: number) => {
    const currentOffset = scrollY.value;
    flashListRef.current?.scrollToOffset({
      offset: currentOffset + overlap,
      animated: true,
    });
  }, [scrollY]);

  // Capture screen height on JS thread (stable for portrait-locked app)
  const screenHeight = Dimensions.get("window").height;

  // When keyboard finishes appearing, dynamically scroll to keep focused input visible
  useKeyboardHandler({
    onEnd: (e) => {
      "worklet";
      if (e.height > 0 && focusedInput.value) {
        const inputBottom = focusedInput.value.layout.absoluteY + focusedInput.value.layout.height;
        const keyboardTop = screenHeight - e.height;
        const VISUAL_BUFFER = 80; // generous space above keyboard for context
        const overlap = inputBottom - keyboardTop + VISUAL_BUFFER;

        if (overlap > 0) {
          runOnJS(scrollByOverlap)(overlap);
        }
      }
    },
  }, [focusedInput, scrollByOverlap]);

  const openCommentThread = useCallback((itemId: Id<"listItems">, itemName: string) => {
    haptic("light");
    setCommentState({ visible: true, itemId, itemName });
  }, []);

  const stableOpenComments = useMemo(
    () => (hasPartners ? openCommentThread : undefined),
    [hasPartners, openCommentThread]
  );

  // Other lists for picker modal (memoized)
  const otherActiveLists = useMemo(
    () => (allActiveLists ?? []).filter(
      (l) => l._id !== id
    ),
    [allActiveLists, id],
  );

  // ─── FlashList renderItem ────────────────────────────────────────────────────
  const selectionActive = selectedItemsRef.current.size > 0;

  const renderItem = useCallback(({ item }: { item: CategorizedItem }) => {
    if ("isHeader" in item) {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>
            {item.title.toUpperCase()}
          </Text>
          <View style={styles.sectionHeaderLine} />
        </View>
      );
    }
    return (
      <ShoppingListItem
        item={item}
        onToggle={handleToggleItem}
        onRemove={handleRemoveItem}
        onEdit={handleEditItem}
        onPriorityChange={handlePriorityChange}
        isShopping={true}
        canEdit={canEdit}
        isOwner={isOwner}
        commentCount={commentCounts?.[item._id as string] ?? 0}
        onOpenComments={stableOpenComments}
        selectionActive={selectionActive}
        isSelected={selectedItemsRef.current.has(item._id)}
        onSelectToggle={toggleItemSelection}
        currency={currentUser?.currency || "GBP"}
      />
    );
  }, [handleToggleItem, handleRemoveItem, handleEditItem, handlePriorityChange,
      canEdit, isOwner, commentCounts,
      stableOpenComments, selectionActive, selectionVersion, toggleItemSelection, 
      currentUser?.currency, showCheckedItems]);

  const getItemType = useCallback((item: CategorizedItem) => {
    return "isHeader" in item ? "header" : "item";
  }, []);

  // ─── FlashList ListHeaderComponent ───────────────────────────────────────────
  const listHeader = useMemo(() => (
    <View style={styles.listHeaderContainer}>
      {/* Active Shopper Banner (Partner Mode) — shown only if trip in progress */}
      {list?.activeShopperId && list.activeShopperId !== currentUser?._id && (
        <AnimatedSection animation="fadeInDown" duration={400}>
          <View style={styles.activeShopperBanner}>
            <View style={styles.activeShopperPulse} />
            <MaterialCommunityIcons name="account-search" size={18} color={colors.accent.primary} />
            <Text style={styles.activeShopperText}>
              {activeShopper?.name || "Your partner"} is currently shopping this list
            </Text>
          </View>
        </AnimatedSection>
      )}

      {/* AI Health Tutorial Tip */}
      {(items?.length ?? 0) >= 5 && (
        <TipBanner context="list_detail" />
      )}

      {/* AI Health Discovery Banner */}
      {!list?.healthAnalysis && (items?.length ?? 0) >= 5 && !healthBannerDismissed && (
        <AnimatedSection animation="fadeInDown" duration={600} delay={500}>
          <View style={styles.discoveryBannerContainer}>
            <Pressable
              onPress={() => {
                haptic("light");
                setShowHealthModal(true);
              }}
              style={({pressed}) => [styles.discoveryBanner, pressed && {opacity: 0.8}]}
            >
              <LinearGradient
                colors={["rgba(74, 222, 128, 0.15)", "rgba(74, 222, 128, 0.05)"]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.discoveryGradient}
              >
                <MaterialCommunityIcons name="auto-fix" size={18} color="#4ADE80" />
                <Text style={styles.discoveryText}>
                  Get a professional AI Health Analysis for this list
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#4ADE80" />
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={async () => {
                haptic("light");
                await dismissTip({ tipKey: "health_discovery_banner" });
              }}
              hitSlop={8}
              style={styles.dismissButton}
            >
              <MaterialCommunityIcons name="close" size={20} color="#4ADE80" />
            </Pressable>
          </View>
        </AnimatedSection>
      )}

      {/* Circular Budget Dial -- tap to edit (owner only) */}
      {budget > 0 && (
        <View ref={budgetRef}>
          <CircularBudgetDial
            budget={budget}
            planned={estimatedTotal}
            spent={checkedTotal}
            mode={isInProgress ? "shopping" : "active"}
            onPress={canEdit ? handleOpenEditBudget : undefined}
            storeName={list?.normalizedStoreId ? getStoreInfoSafe(list.normalizedStoreId)?.displayName : undefined}
            storeColor={list?.normalizedStoreId ? getStoreInfoSafe(list.normalizedStoreId)?.color : undefined}
            transitioning={dialTransitioning}
          />
        </View>
      )}

      {/* Refresh Prices button — available when store is selected */}
      {list?.normalizedStoreId && canEdit && (items?.length ?? 0) > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.refreshPricesButton,
            pressed && styles.refreshPricesButtonPressed,
            refreshingPrices && styles.refreshPricesButtonDisabled,
          ]}
          onPress={handleRefreshPrices}
          disabled={refreshingPrices}
          accessibilityLabel="Refresh prices from your receipts"
          accessibilityRole="button"
        >
          {refreshingPrices ? (
            <ActivityIndicator size="small" color={colors.accent.primary} />
          ) : (
            <MaterialCommunityIcons name="cash-sync" size={16} color={colors.accent.primary} />
          )}
          <Text style={styles.refreshPricesText}>
            {refreshingPrices ? "Refreshing..." : "Refresh Prices"}
          </Text>
        </Pressable>
      )}

      {/* Search Bar — show when there are items */}
      {(items?.length ?? 0) > 0 && (
        <View style={styles.searchContainer} ref={searchRef}>
          <GlassSearchInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            onClear={() => setSearchTerm("")}
            placeholder="Search items..."
          />
        </View>
      )}

      {/* Show/Hide Checked Items Toggle */}
      {(items?.length ?? 0) > 0 && (
        <View style={styles.toggleContainer}>
          <GlassSegmentedControl
            tabs={[
              { label: "Show Checked", icon: "eye-outline" },
              { label: "Hide Checked", icon: "eye-off-outline" },
            ]}
            activeIndex={showCheckedItems ? 0 : 1}
            onTabChange={(index) => {
              setShowCheckedItems(index === 0);
            }}
          />
        </View>
      )}

      {/* Action Row: Store / Add Items — owner only */}
      {canEdit && (
        <ListActionRow
          storeName={list?.storeName}
          storeColor={list?.normalizedStoreId ? getStoreInfoSafe(list.normalizedStoreId)?.color : undefined}
          hasStore={!!list?.normalizedStoreId}
          currentStoreId={list?.normalizedStoreId}
          userFavorites={userFavorites}
          itemCount={items?.length ?? 0}
          onStoreSelect={handleSelectStore}
          onAddItemsPress={() => setShowAddItemsModal(true)}
        />
      )}

      {/* Finish Trip Button (visible when shopping) */}
      {isInProgress && (canEdit || isPartner) && (
        <AnimatedSection animation="fadeInUp" duration={500}>
          <View style={styles.actionButtons}>
            <GlassButton
              variant="primary"
              size="md"
              icon="check-circle-outline"
              onPress={handleFinishTrip}
              fullWidth
            >
              Finish Trip
            </GlassButton>
          </View>
        </AnimatedSection>
      )}

      {/* Items section header (only when items exist) */}
      {(items?.length ?? 0) > 0 && (
        <View style={styles.itemsContainer}>
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionTitle}>
              {selectedItemsRef.current.size > 0
                ? `${selectedItemsRef.current.size} selected`
                : `Items (${items?.length ?? 0})`}
            </Text>
            {/* Selection actions — visible in both modes */}
            {canEdit && (
              <View style={styles.selectionActions}>
                {selectedItemsRef.current.size > 0 && (
                  <Pressable
                    onPress={handleBulkDelete}
                    style={styles.deleteIconButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={20}
                      color={colors.semantic.danger}
                    />
                  </Pressable>
                )}
                <Pressable
                  onPress={selectAllItems}
                  style={styles.selectButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.selectButtonText}>All</Text>
                </Pressable>
                {selectedItemsRef.current.size > 0 && (
                  <Pressable
                    onPress={clearSelection}
                    style={styles.selectButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.selectButtonText, { color: colors.text.tertiary }]}>Clear</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
          
          <GlassDropdown
            options={categoryOptions}
            selected={listCategoryFilter}
            onSelect={setListCategoryFilter}
            placeholder="Filter by category"
            style={styles.categoryDropdown}
          />
        </View>
      )}
    </View>
  ), [budget, estimatedTotal, checkedTotal,
      list?.userId, list?.storeName, list?.normalizedStoreId,
      list?.shoppingStartedAt, list?.activeShopperId, isInProgress,
      hasPartners, id,
      isOwner, canEdit, items, isPartner,
      selectionVersion, categoryOptions, listCategoryFilter,
      dialTransitioning, checkedCount, totalCount,
      activeShopper?.name, handleBulkDelete,
      handleRefreshPrices, handleSelectStore,
      handleFinishTrip, refreshingPrices,
      selectAllItems, userFavorites, currentUser?._id,
      healthBannerDismissed, showCheckedItems, searchTerm]);

  // ─── FlashList ListEmptyComponent ────────────────────────────────────────────
  const listEmpty = useMemo(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <MaterialCommunityIcons
          name="cart-outline"
          size={54}
          color={colors.text.tertiary}
        />
      </View>
      <Text style={styles.emptyTitle}>No items yet</Text>
      <Text style={styles.emptySubtitle}>Add items above or pull from your stock</Text>
    </View>
  ), []);

  // ─── FlashList ListFooterComponent ──────────────────────────────────────────
  const listFooter = useMemo(() => {
    return (
      <View style={styles.footerContainer}>
        <View style={styles.bottomSpacer} />
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: CategorizedItem) => item._id, []);

  // Loading state -- after all hooks to satisfy Rules of Hooks
  if (list === undefined || items === undefined) {
    return (
      <GlassScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Loading list...</Text>
        </View>
      </GlassScreen>
    );
  }

  // Error state - list not found
  if (!list) {
    return (
      <GlassScreen>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={64}
            color={colors.semantic.danger}
          />
          <Text style={styles.errorText}>List not found</Text>
          <GlassButton variant="primary" icon="home" onPress={() => router.replace("/(app)/(tabs)")}>
            Go Home
          </GlassButton>
        </View>
      </GlassScreen>
    );
  }

  const isEditable = list.status !== "completed" && list.status !== "archived";

  return (
    <GlassScreen>
      {/* Offline banner - shows when disconnected from Convex */}
      <OfflineBanner topOffset={0} />

      <Animated.View style={keyboardContainerStyle}>
        {/* Header */}
        <SimpleHeader
          title={list.name}
          onTitlePress={isEditable ? handleOpenEditName : undefined}
          subtitle={`${list.listNumber != null ? `#${list.listNumber} \u00B7 ` : ""}${checkedCount}/${totalCount} items`}
          showBack={true}
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(app)/(tabs)/" as any);
            }
          }}
          titleStyle={{ fontSize: 20, lineHeight: 28 }}
          rightElement={
            <View style={styles.headerRightRow}>
              {/* Delete list button */}
              {canEdit && (
                <Pressable
                  onPress={handleDeleteList}
                  hitSlop={8}
                  style={styles.headerIconButton}
                >
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={24}
                    color={colors.semantic.danger}
                  />
                </Pressable>
              )}

              {/* Edit list name button */}
              {isEditable && (
                <Pressable
                  onPress={handleOpenEditName}
                  hitSlop={8}
                  style={styles.headerIconButton}
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={20}
                    color={colors.text.secondary}
                  />
                </Pressable>
              )}

              {/* AI Health Analysis Button */}
              {(items?.length ?? 0) > 0 && (
                <View ref={healthRef}>
                  <Pressable
                    onPress={() => {
                      haptic("light");
                      // Just-in-time hint: show on first tap if eligible and NO other hints are visible
                      const noHintsVisible =
                        addHint.shouldShow === false &&
                        budgetHint.shouldShow === false &&
                        healthHint.shouldShow === false;

                      if (noHintsVisible && (items?.length ?? 0) >= 3) {
                        healthHint.showHint();
                      } else if (healthHint.shouldShow === false) {
                        // If health hint not visible, open modal directly
                        setShowHealthModal(true);
                      }
                      // If healthHint is currently showing, clicking dismisses it (handled by HintOverlay backdrop)
                    }}
                    hitSlop={8}
                    style={styles.headerIconButton}
                  >
                    <Animated.View style={pulseAnimatedStyle}>
                      <MaterialCommunityIcons
                        name="heart-pulse"
                        size={22}
                        color={list.healthAnalysis ? "#4ADE80" : "rgba(255, 255, 255, 0.35)"}
                      />
                    </Animated.View>
                  </Pressable>
                </View>
              )}

              <NotificationBell onPress={() => setShowNotifications(true)} />
              {hasPartners && (
                <Pressable
                  onPress={() => {
                    haptic("light");
                    setShowListChat(true);
                  }}
                  hitSlop={8}
                  style={styles.headerIconButton}
                >
                  <MaterialCommunityIcons
                    name="chat-outline"
                    size={22}
                    color={colors.text.secondary}
                  />
                  {(listMessageCount ?? 0) > 0 && (
                    <View style={styles.chatCountBadge}>
                      <Text style={styles.chatCountText}>
                        {listMessageCount! > 99 ? "99+" : listMessageCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  haptic("light");
                  router.push(`/partners?listId=${id}`);
                }}
                hitSlop={8}
                style={styles.headerIconButton}
              >
                <MaterialCommunityIcons
                  name="account-group"
                  size={22}
                  color={colors.text.secondary}
                />
              </Pressable>
            </View>
          }
        />

        {/* Sticky mini budget bar -- slides in when dial scrolls out of view */}
        {budget > 0 && (
          <StickyBudgetBar
            budget={budget}
            activeValue={miniBarActiveValue}
            remaining={miniBarRemaining}
            label={miniBarLabel}
            isPlanning={!isInProgress}
            scrollY={scrollY}
            scrollThreshold={DIAL_SCROLL_THRESHOLD}
            onPress={handleOpenEditBudget}
          />
        )}

        <FlashList
          ref={flashListRef}
          data={displayItems}
          renderItem={renderItem}
          getItemType={getItemType}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.flashListContent}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          extraData={{ selectionVersion, itemsVersion: items?.length ?? 0, items }}
          drawDistance={250}
        />
      </Animated.View>

      {/* Tutorial Hints - STRICT: Only one hint visible at a time */}
      <HintOverlay
        visible={addHint.shouldShow && !budgetHint.shouldShow && !healthHint.shouldShow}
        targetRef={searchRef}
        title="Quick Item Entry"
        content="Type to add items or tap the mic for voice input. We'll suggest items you buy often."
        onDismiss={addHint.dismiss}
        position="below"
        currentStep={1}
        totalSteps={3}
      />

      <HintOverlay
        visible={budgetHint.shouldShow && !addHint.shouldShow && !healthHint.shouldShow}
        targetRef={budgetRef}
        title="Live Budget Tracking"
        content="Your budget updates as you add items. Green means under budget, amber warns you're close to your limit."
        onDismiss={budgetHint.dismiss}
        position="below"
        currentStep={2}
        totalSteps={3}
      />

      <HintOverlay
        visible={healthHint.shouldShow && !addHint.shouldShow && !budgetHint.shouldShow}
        targetRef={healthRef}
        title="AI Health Swaps"
        content="Tap here for AI-powered suggestions: healthier alternatives and budget-friendly swaps for your list."
        onDismiss={healthHint.dismiss}
        position="below"
        currentStep={3}
        totalSteps={3}
      />

      {/* Edit Budget Modal */}
      <EditBudgetModal
        visible={showEditBudgetModal}
        budget={budget}
        onClose={() => setShowEditBudgetModal(false)}
        onSave={handleSaveBudget}
      />

      {/* Edit List Name Modal */}
      <EditListNameModal
        visible={showEditNameModal}
        currentName={list.name}
        onClose={() => setShowEditNameModal(false)}
        onSave={handleSaveListName}
      />

      {/* Mid-Shop Add Flow Modal */}
      <MidShopModal
        visible={midShopState.visible}
        itemName={midShopState.name}
        itemPrice={midShopState.price}
        itemQuantity={midShopState.quantity}
        currentTotal={currentTotal}
        budget={budget}
        remainingBudget={remainingBudget}
        onClose={closeMidShopModal}
        onAdd={handleMidShopAdd}
      />

      {/* Notifications Dropdown */}
      <NotificationDropdown
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Comment Thread (Partner Mode) */}
      <CommentThread
        visible={commentState.visible}
        itemId={commentState.itemId}
        itemName={commentState.itemName}
        onClose={() => {
          setCommentState({ visible: false, itemId: null, itemName: "" });
        }}
      />

      {/* List Chat Thread (Partner Mode) */}
      <ListChatThread
        visible={showListChat}
        listId={id}
        listName={list.name}
        onClose={() => setShowListChat(false)}
      />

      {/* Edit Item Modal */}
      <EditItemModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />

      {/* List Picker Modal */}
      <ListPickerModal
        item={addToListItem}
        otherLists={otherActiveLists}
        onClose={() => setAddToListItem(null)}
        onPick={pickListForItem}
      />

      {/* Add Items Modal */}
      <AddItemsModal
        visible={showAddItemsModal}
        onClose={() => setShowAddItemsModal(false)}
        listId={id}
        listStoreName={list.storeName}
        listNormalizedStoreId={list.normalizedStoreId}
        existingItems={items ?? []}
        listStatus={isInProgress ? "shopping" : "active"}
      />

      {/* Health Analysis Modal */}
      <HealthAnalysisModal
        visible={showHealthModal}
        onClose={() => {
          setShowHealthModal(false);
          if (isPostShoppingHealthFlow) {
            setIsPostShoppingHealthFlow(false);
            setShowScanNudge(true);
          }
        }}
        listId={id}
        initialAnalysis={list?.healthAnalysis}
        itemCount={items?.length}
      />

      {/* Trip Summary Modal */}
      <TripSummaryModal
        visible={showTripSummary}
        onClose={() => setShowTripSummary(false)}
        onFinish={handleCompleteTrip}
        onScanReceipt={handleScanReceipt}
        onContinueShopping={() => setShowTripSummary(false)}
        onRemoveItem={handleRemoveUncheckedItem}
        onMoveItem={handleMoveUncheckedItem}
        stats={tripStats ?? null}
      />

      {/* Receipt Scan Nudge Modal */}
      <ScanReceiptNudgeModal
        visible={showScanNudge}
        onScanReceipt={handleScanReceipt}
        onDismiss={handleDismissNudge}
        storeName={list?.storeName}
        pointsBalance={pointsBalance ?? null}
        streakCount={receiptStreakCount}
      />

      {/* Mid-Shop Store Picker */}
      <StoreDropdownSheet
        visible={showMidShopStorePicker}
        onClose={() => setShowMidShopStorePicker(false)}
        onSelect={handleMidShopStoreSwitch}
        currentStoreId={list?.normalizedStoreId}
        userFavorites={userFavorites}
      />

      {/* Surprise delight toast */}
      <GlassToast
        message={toast.message}
        icon={toast.icon}
        iconColor={toast.iconColor}
        visible={toast.visible}
        onDismiss={dismiss}
      />
    </GlassScreen>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  errorText: {
    ...typography.headlineMedium,
    color: colors.semantic.danger,
  },
  flashListContent: {
    paddingHorizontal: spacing.lg,
  },
  listHeaderContainer: {
    paddingTop: spacing.xs,
    gap: spacing.md,
  },
  discoveryBannerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    gap: spacing.sm,
  },
  discoveryBanner: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.3)",
  },
  discoveryGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.sm,
  },
  discoveryText: {
    ...typography.labelMedium,
    color: colors.text.primary,
    flex: 1,
  },
  dismissButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(74, 222, 128, 0.1)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionHeaderText: {
    ...typography.labelSmall,
    fontSize: 10,
    lineHeight: 14,
    color: colors.accent.primary,
    letterSpacing: 1.2,
    fontWeight: "700",
    marginRight: spacing.sm,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glass.border,
    opacity: 0.5,
  },
  toggleContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  bottomSpacer: {
    height: 140,
  },
  footerContainer: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },

  // Active Shopper Banner
  activeShopperBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.accent.primary}15`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}30`,
    gap: spacing.sm,
  },
  activeShopperPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.primary,
  },
  activeShopperText: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: "600",
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },

  // Items Section
  itemsContainer: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
  },

  // Items header with select button
  itemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  categoryDropdown: {
    marginBottom: spacing.sm,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  selectButtonText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  selectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  deleteIconButton: {
    padding: spacing.xs,
  },

  // Refresh prices button
  refreshPricesButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: "rgba(0, 212, 170, 0.08)",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.2)",
    alignSelf: "center" as const,
    marginTop: spacing.xs,
  },
  refreshPricesButtonPressed: {
    backgroundColor: "rgba(0, 212, 170, 0.15)",
  },
  refreshPricesButtonDisabled: {
    opacity: 0.6,
  },
  refreshPricesText: {
    ...typography.labelSmall,
    color: colors.accent.primary,
    fontWeight: "600" as const,
  },

  // Search bar
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  // Header styles
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  chatCountBadge: {
    position: "absolute" as const,
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.accent.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: spacing.xs,
  },
  chatCountText: {
    fontSize: 9,
    color: colors.text.primary,
    fontWeight: "800" as const,
  },
});
