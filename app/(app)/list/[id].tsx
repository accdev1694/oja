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
  SimpleHeader,
  CircularBudgetDial,
  OfflineBanner,
  AnimatedSection,
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";
import { CategoryFilter } from "@/components/ui/CategoryFilter";
import { usePartnerRole } from "@/hooks/usePartnerRole";
import {
  CommentThread,
  NotificationBell,
  NotificationDropdown,
} from "@/components/partners";

import { ListChatThread } from "@/components/partners/ListChatThread";
import { GlassToast } from "@/components/ui/glass/GlassToast";
import { useDelightToast } from "@/hooks/useDelightToast";
import { useStableValue, shallowRecordEqual } from "@/hooks/useStableValue";
import { ShoppingListItem, type ListItem } from "@/components/list/ShoppingListItem";
import { ShoppingTypewriterHint } from "@/components/list/ShoppingTypewriterHint";
import { StickyBudgetBar } from "@/components/list/BudgetSection";
import { ListActionRow } from "@/components/list/ListActionRow";
import { StoreDropdownSheet } from "@/components/list/StoreDropdownSheet";
import { AddItemsModal } from "@/components/list/AddItemsModal";
import {
  EditBudgetModal,
  MidShopModal,
  EditItemModal,
  ListPickerModal,
  TripSummaryModal,
} from "@/components/list/modals";
import { ScanReceiptNudgeModal } from "@/components/list/modals/ScanReceiptNudgeModal";
import type { TripStats } from "@/hooks/useTripSummary";
import { getStoreInfoSafe } from "@/convex/lib/storeNormalizer";

export default function ListDetailScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string as Id<"shoppingLists">;
  const router = useRouter();
  const { alert } = useGlassAlert();
  const { toast, dismiss, onMundaneAction, showToast } = useDelightToast();

  const list = useQuery(api.shoppingLists.getById, { id });
  const items = useQuery(api.listItems.getByList, { listId: id });
  const toggleChecked = useMutation(api.listItems.toggleChecked);
  const addItem = useMutation(api.listItems.create);
  const updateItem = useMutation(api.listItems.update);
  const removeItem = useMutation(api.listItems.remove);
  const removeMultipleItems = useMutation(api.listItems.removeMultiple);
  const startShopping = useMutation(api.shoppingLists.startShopping);
  const completeShopping = useMutation(api.shoppingLists.completeShopping);
  const pauseShoppingMut = useMutation(api.shoppingLists.pauseShopping);
  const resumeShoppingMut = useMutation(api.shoppingLists.resumeShopping);
  const restockFromCheckedItems = useMutation(api.pantryItems.restockFromCheckedItems);

  // Trip stats for completion summary (only fetch when shopping)
  const tripStats = useQuery(
    api.shoppingLists.getTripStats,
    list?.status === "shopping" ? { id } : "skip"
  ) as TripStats | null | undefined;

  const updateList = useMutation(api.shoppingLists.update);
  const addItemMidShop = useMutation(api.listItems.addItemMidShop);
  const setStore = useMutation(api.shoppingLists.setStore);
  const switchStoreMidShop = useMutation(api.shoppingLists.switchStoreMidShop);

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
  const hasPartners = (listPartners ?? []).some((p: any) => p.status === "accepted");
  const listMessageCount = useQuery(api.partners.getListMessageCount, hasPartners ? { listId: id } : "skip");

  // Edit budget modal state
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);


  // Trip summary modal state
  const [showTripSummary, setShowTripSummary] = useState(false);

  // Scan receipt nudge modal state
  const [showScanNudge, setShowScanNudge] = useState(false);

  // Scan credit info for receipt nudge modal
  const scanCredits = useQuery(api.subscriptions.getScanCredits);

  // Streaks for receipt nudge modal (receipt_scanner streak)
  const streaks = useQuery(api.insights.getStreaks);
  const receiptStreakCount = useMemo(() => {
    const streak = streaks?.find((s) => s.type === "receipt_scanner");
    return streak?.currentCount ?? 0;
  }, [streaks]);

  // Track dial transition animation
  const [dialTransitioning, setDialTransitioning] = useState(false);

  // Add Items modal state
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);

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

  // Bulk selection state (ref + version counter to avoid full re-renders)
  const selectedItemsRef = useRef(new Set<Id<"listItems">>());
  const [selectionVersion, setSelectionVersion] = useState(0);
  const flashListRef = useRef<FlashListRef<ListItem>>(null);

  // Keyboard tracking via react-native-keyboard-controller — reports full IME frame including toolbar
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const { input: focusedInput } = useReanimatedFocusedInput();

  const keyboardContainerStyle = useAnimatedStyle(() => ({
    flex: 1,
    paddingBottom: keyboardHeight.value,
  }));

  // Breathing pulse for Go Shopping button
  const goShoppingScale = useSharedValue(1);
  const hasItems = (items?.length ?? 0) > 0;
  const isActiveStatus = list?.status === "active";

  useEffect(() => {
    if (hasItems && isActiveStatus) {
      goShoppingScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(goShoppingScale);
      goShoppingScale.value = 1;
    }
    return () => cancelAnimation(goShoppingScale);
  }, [hasItems, isActiveStatus, goShoppingScale]);

  const goShoppingAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: goShoppingScale.value }],
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
  const { estimatedTotal, actualTotal, shoppingTotal, checkedTotal, checkedCount, totalCount } = useMemo(() => {
    let estimated = 0;
    let actual = 0;
    let shopping = 0;
    let checked = 0;
    let checkedN = 0;

    for (const item of safeItems) {
      const estPrice = (item.estimatedPrice || 0) * item.quantity;
      estimated += estPrice;

      if (item.isChecked) {
        checkedN++;
        if (item.actualPrice) {
          actual += item.actualPrice * item.quantity;
          shopping += item.actualPrice * item.quantity;
        } else {
          shopping += estPrice;
        }
        checked += (item.actualPrice || item.estimatedPrice || 0) * item.quantity;
      } else {
        shopping += estPrice;
      }
    }

    return {
      estimatedTotal: estimated,
      actualTotal: actual,
      shoppingTotal: shopping,
      checkedTotal: checked,
      checkedCount: checkedN,
      totalCount: safeItems.length,
    };
  }, [safeItems]);

  // Budget status
  const budget = list?.budget || 0;
  const listStatus = list?.status;
  const currentTotal = listStatus === "shopping" ? shoppingTotal : estimatedTotal;
  const remainingBudget = budget - currentTotal;

  // Mini bar values (mode-aware)
  const isPlanning = listStatus === "active";
  const miniBarActiveValue = isPlanning ? estimatedTotal : checkedTotal;
  const miniBarRemaining = budget - miniBarActiveValue;
  const miniBarLabel = isPlanning ? "planned" : "spent";

  // Memoized category data + display items
  const { listCategories, listCategoryCounts, displayItems } = useMemo(() => {
    const cats = [...new Set(safeItems.map((i) => i.category).filter(Boolean) as string[])].sort();
    const counts: Record<string, number> = {};
    safeItems.forEach((i) => { if (i.category) counts[i.category] = (counts[i.category] || 0) + 1; });
    const filtered = listCategoryFilter
      ? safeItems.filter((i) => i.category === listCategoryFilter)
      : safeItems;
    return { listCategories: cats, listCategoryCounts: counts, displayItems: filtered };
  }, [safeItems, listCategoryFilter]);

  const isShopping = listStatus === "shopping";
  const isPaused = listStatus === "active" && !!list?.shoppingStartedAt && !!list?.pausedAt;

  // Active Shopper Logic
  const activeShopper = useQuery(
    api.users.getById,
    list?.activeShopperId ? { id: list.activeShopperId } : "skip"
  );
  const isSomeoneElseShopping = isShopping && list?.activeShopperId && list.activeShopperId !== currentUser?._id;

  // Edit budget handlers
  function handleOpenEditBudget() {
    haptic("light");
    setShowEditBudgetModal(true);
  }

  const handleSaveBudget = useCallback(async (newBudget: number | undefined) => {
    await updateList({ id, budget: newBudget });
  }, [updateList, id]);

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
        const existingName = "existingName" in result ? result.existingName as string : midShopState.name;
        const existingQty = "existingQuantity" in result ? result.existingQuantity as number : 0;
        const existingSize = "existingSize" in result ? result.existingSize as string | undefined : undefined;
        const sizeLabel = existingSize ? ` (${existingSize})` : "";
        const itemName = midShopState.name;
        const itemPrice = midShopState.price;
        const itemQty = midShopState.quantity;
        closeMidShopModal();
        alert(
          "Item Already on List",
          `"${existingName}"${sizeLabel} (\u00D7${existingQty}) is already on your list. Add again?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Add Anyway",
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
  }, [addItemMidShop, id, midShopState, alert, showToast]);

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
      (l) => l._id !== id && (l.status === "active" || l.status === "shopping")
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

  // Start (or resume) shopping directly — no confirmation needed since it's reversible
  async function handleStartShopping() {
    haptic("medium");
    clearSelection();
    try {
      if (isPaused) {
        await resumeShoppingMut({ id });
      } else {
        await startShopping({ id });
      }
      setDialTransitioning(true);
      setTimeout(() => setDialTransitioning(false), 700);
    } catch (error) {
      console.error("Failed to start shopping:", error);
      alert("Error", "Failed to start shopping");
    }
  }

  // Pause shopping — revert to planning mode
  async function handlePauseShopping() {
    haptic("medium");
    try {
      await pauseShoppingMut({ id });
      showToast("Trip paused — you can resume anytime", "pause-circle-outline", colors.accent.warning);
    } catch (error) {
      console.error("Failed to pause shopping:", error);
      alert("Error", "Failed to pause shopping");
    }
  }

  // Open the trip summary modal instead of alert
  function handleCompleteShopping() {
    haptic("medium");
    setShowTripSummary(true);
  }

  // Called from TripSummaryModal "Finish Trip" button
  async function handleFinishTrip() {
    try {
      await completeShopping({ id });
      const result = await restockFromCheckedItems({ listId: id });
      haptic("success");
      setShowTripSummary(false);
      setShowScanNudge(true);
    } catch (error) {
      console.error("Failed to complete shopping:", error);
      alert("Error", "Failed to complete shopping");
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
      (l) => l._id !== id && (l.status === "active" || l.status === "shopping")
    ),
    [allActiveLists, id],
  );

  // ─── FlashList renderItem ────────────────────────────────────────────────────
  const selectionActive = selectedItemsRef.current.size > 0;

  const renderItem = useCallback(({ item }: { item: ListItem }) => (
    <ShoppingListItem
      item={item}
      onToggle={handleToggleItem}
      onRemove={handleRemoveItem}
      onEdit={handleEditItem}
      onPriorityChange={handlePriorityChange}
      isShopping={isShopping}
      canEdit={canEdit}
      isOwner={isOwner}
      commentCount={commentCounts?.[item._id as string] ?? 0}
      onOpenComments={stableOpenComments}
      selectionActive={selectionActive}
      isSelected={selectedItemsRef.current.has(item._id)}
      onSelectToggle={toggleItemSelection}
    />
  ), [handleToggleItem, handleRemoveItem, handleEditItem, handlePriorityChange,
      isShopping, canEdit, isOwner, commentCounts,
      stableOpenComments, selectionActive, selectionVersion, toggleItemSelection]);

  // ─── FlashList ListHeaderComponent ───────────────────────────────────────────
  const listHeader = useMemo(() => (
    <View style={styles.listHeaderContainer}>
      {/* Active Shopper Banner (Partner Mode) */}
      {isSomeoneElseShopping && (
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

      {/* Circular Budget Dial -- tap to edit (owner only) */}
      {budget > 0 && (
        <CircularBudgetDial
          budget={budget}
          planned={estimatedTotal}
          spent={checkedTotal}
          mode={list?.status ?? "active"}
          onPress={canEdit ? handleOpenEditBudget : undefined}
          storeName={list?.normalizedStoreId ? getStoreInfoSafe(list.normalizedStoreId)?.displayName : undefined}
          storeColor={list?.normalizedStoreId ? getStoreInfoSafe(list.normalizedStoreId)?.color : undefined}
          transitioning={dialTransitioning}
        />
      )}

      {/* Paused trip resume banner — owner only */}
      {isPaused && canEdit && (
        <View style={styles.pausedBanner}>
          <View style={styles.pausedBannerLeft}>
            <MaterialCommunityIcons name="pause-circle-outline" size={20} color={colors.accent.warning} />
            <Text style={styles.pausedBannerText}>
              Trip paused — {checkedCount}/{totalCount} items checked
            </Text>
          </View>
          <Pressable onPress={handleStartShopping} hitSlop={8}>
            <Text style={styles.pausedResumeText}>Resume</Text>
          </Pressable>
        </View>
      )}

      {/* Action Row: Store / Add Items (planning mode) — owner only */}
      {list?.status === "active" && canEdit && (
        <ListActionRow
          storeName={list.storeName}
          storeColor={list.normalizedStoreId ? getStoreInfoSafe(list.normalizedStoreId)?.color : undefined}
          hasStore={!!list.normalizedStoreId}
          currentStoreId={list.normalizedStoreId}
          userFavorites={userFavorites}
          itemCount={items?.length ?? 0}
          onStoreSelect={handleSelectStore}
          onAddItemsPress={() => setShowAddItemsModal(true)}
        />
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {list?.status === "active" && (canEdit || isPartner) && (
          <Animated.View style={[styles.actionButton, goShoppingAnimStyle]}>
            <GlassButton
              variant="primary"
              size="md"
              icon={isPaused ? "cart-arrow-right" : "cart-outline"}
              onPress={handleStartShopping}
              disabled={(items?.length ?? 0) === 0 || !!isSomeoneElseShopping}
              fullWidth
            >
              {isSomeoneElseShopping 
                ? `${activeShopper?.name || "Partner"} is shopping` 
                : isPaused ? "Resume Shopping" : "Go Shopping"}
            </GlassButton>
          </Animated.View>
        )}
        {list?.status === "shopping" && (canEdit || isPartner) && (
          <View style={styles.shoppingModeContainer}>
            <ShoppingTypewriterHint
              storeName={list.normalizedStoreId ? getStoreInfoSafe(list.normalizedStoreId)?.displayName : undefined}
            />
            <View style={styles.shoppingButtonGrid}>
              <View style={styles.shoppingButtonGridRow}>
                <GlassButton
                  variant="secondary"
                  size="md"
                  icon="swap-horizontal"
                  onPress={() => setShowMidShopStorePicker(true)}
                  style={styles.shoppingBtnFlex2}
                  disabled={!!isSomeoneElseShopping}
                >
                  Switch Store
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  size="md"
                  icon="pencil-outline"
                  onPress={handlePauseShopping}
                  style={styles.shoppingBtnFlex1}
                  disabled={!!isSomeoneElseShopping}
                >
                  Edit List
                </GlassButton>
              </View>
              <View style={styles.shoppingButtonGridRow}>
                <GlassButton
                  variant="secondary"
                  size="md"
                  icon="plus"
                  onPress={() => setShowAddItemsModal(true)}
                  style={styles.shoppingBtnFlex1}
                  disabled={!!isSomeoneElseShopping}
                >
                  Add Items
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="md"
                  icon="check-circle-outline"
                  onPress={handleCompleteShopping}
                  style={styles.shoppingBtnFlex2}
                  disabled={!!isSomeoneElseShopping}
                >
                  Complete Shopping
                </GlassButton>
              </View>
            </View>
          </View>
        )}
      </View>

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
          <CategoryFilter
            categories={listCategories}
            selected={listCategoryFilter}
            onSelect={setListCategoryFilter}
            counts={listCategoryCounts}
          />
        </View>
      )}
    </View>
  ), [budget, estimatedTotal, checkedTotal, list?.status,
      list?.userId, list?.storeName, list?.normalizedStoreId,
      list?.shoppingStartedAt, list?.pausedAt,
      hasPartners, id,
      isOwner, canEdit, items,
      selectionVersion, listCategories, listCategoryFilter,
      listCategoryCounts,
      isPaused, dialTransitioning, checkedCount, totalCount]);

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

  const keyExtractor = useCallback((item: ListItem) => item._id, []);

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

  return (
    <GlassScreen>
      {/* Offline banner - shows when disconnected from Convex */}
      <OfflineBanner topOffset={0} />

      <Animated.View style={keyboardContainerStyle}>
        {/* Header */}
        <SimpleHeader
          title={list.name}
          subtitle={`${list.listNumber != null ? `#${list.listNumber} \u00B7 ` : ""}${checkedCount}/${totalCount} items`}
          showBack
          titleStyle={{ fontSize: 20, lineHeight: 28 }}
          rightElement={
            <View style={styles.headerRightRow}>
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
            isPlanning={isPlanning}
            scrollY={scrollY}
            scrollThreshold={DIAL_SCROLL_THRESHOLD}
            onPress={handleOpenEditBudget}
          />
        )}

        <FlashList
          ref={flashListRef}
          data={displayItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.flashListContent}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          extraData={selectionVersion}
          drawDistance={250}
        />
      </Animated.View>

      {/* Edit Budget Modal */}
      <EditBudgetModal
        visible={showEditBudgetModal}
        budget={budget}
        onClose={() => setShowEditBudgetModal(false)}
        onSave={handleSaveBudget}
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
        existingItems={items?.map((i) => ({ name: i.name })) ?? []}
      />

      {/* Trip Summary Modal */}
      <TripSummaryModal
        visible={showTripSummary}
        onClose={() => setShowTripSummary(false)}
        onFinish={handleFinishTrip}
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
        scanCredits={scanCredits ?? null}
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
  },
  actionButton: {
    flex: 1,
    marginTop: spacing.md,
  },
  // Shopping Mode Container
  shoppingModeContainer: {
    flex: 1,
  },
  shoppingButtonGrid: {
    gap: spacing.sm,
  },
  shoppingButtonGridRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  shoppingBtnFlex2: {
    flex: 2,
  },
  shoppingBtnFlex1: {
    flex: 1,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: "center",
    width: "100%",
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    width: "100%",
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

  // Paused trip banner
  pausedBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: "rgba(245, 158, 11, 0.10)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  pausedBannerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
    flex: 1,
  },
  pausedBannerText: {
    color: colors.accent.warning,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: "500" as const,
  },
  pausedResumeText: {
    color: colors.accent.primary,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: "700" as const,
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
