import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback, useMemo, useRef } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSharedValue } from "react-native-reanimated";

import {
  GlassScreen,
  GlassButton,
  GlassHeader,
  CircularBudgetDial,
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
import { ListApprovalBanner } from "@/components/partners/ListApprovalBanner";
import { ListChatThread } from "@/components/partners/ListChatThread";
import { GlassToast } from "@/components/ui/glass/GlassToast";
import { useDelightToast } from "@/hooks/useDelightToast";
import { useStableValue, shallowRecordEqual } from "@/hooks/useStableValue";
import { ShoppingListItem, type ListItem } from "@/components/list/ShoppingListItem";
import { ShoppingTypewriterHint } from "@/components/list/ShoppingTypewriterHint";
import { AddItemForm } from "@/components/list/AddItemForm";
import { StickyBudgetBar } from "@/components/list/BudgetSection";
import {
  EditBudgetModal,
  MidShopModal,
  ActualPriceModal,
  EditItemModal,
  ListPickerModal,
} from "@/components/list/modals";
import { SizePriceModal, type SizeOption } from "@/components/lists/SizePriceModal";

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
  const restockFromCheckedItems = useMutation(api.pantryItems.restockFromCheckedItems);

  const updateList = useMutation(api.shoppingLists.update);
  const addItemMidShop = useMutation(api.listItems.addItemMidShop);

  // Partner mode
  const { isOwner, isPartner, canEdit, canApprove, loading: roleLoading } = usePartnerRole(id);
  const handleApproval = useMutation(api.partners.handleApproval);
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
  const [showCommentThread, setShowCommentThread] = useState(false);
  const [commentItemId, setCommentItemId] = useState<Id<"listItems"> | null>(null);
  const [commentItemName, setCommentItemName] = useState("");

  // List chat state
  const [showListChat, setShowListChat] = useState(false);

  // Partner data for approval banner
  const listPartners = useQuery(api.partners.getByList, { listId: id });
  const hasApprovers = (listPartners ?? []).some(
    (p: any) => p.status === "accepted" && p.role === "approver"
  );
  const hasPartners = (listPartners ?? []).some((p: any) => p.status === "accepted");
  const listMessageCount = useQuery(api.partners.getListMessageCount, hasPartners ? { listId: id } : "skip");

  // Resolve approver name for banner
  const approverName = list?.approvalRespondedBy
    ? (listPartners ?? []).find((p: any) => p.userId === list.approvalRespondedBy)?.userName
    : undefined;

  // Edit budget modal state
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);

  // Mid-shop add flow state
  const [showMidShopModal, setShowMidShopModal] = useState(false);
  const [midShopItemName, setMidShopItemName] = useState("");
  const [midShopItemPrice, setMidShopItemPrice] = useState(0);
  const [midShopItemQuantity, setMidShopItemQuantity] = useState(1);

  // Check-off with actual price state (Story 3.8)
  const [showActualPriceModal, setShowActualPriceModal] = useState(false);
  const [checkingItemId, setCheckingItemId] = useState<Id<"listItems"> | null>(null);
  const [checkingItemName, setCheckingItemName] = useState("");
  const [checkingItemEstPrice, setCheckingItemEstPrice] = useState(0);
  const [checkingItemQuantity, setCheckingItemQuantity] = useState(1);

  // Size/Price Modal state (for new add-item flow)
  const [pendingItem, setPendingItem] = useState<{
    name: string;
    category?: string;
    quantity: number;
  } | null>(null);

  // Fetch sizes for the Size/Price Modal when item is pending
  const sizesData = useQuery(
    api.itemVariants.getSizesForStore,
    pendingItem
      ? {
          itemName: pendingItem.name,
          store: list?.normalizedStoreId ?? "tesco",
          category: pendingItem.category,
        }
      : "skip"
  );

  // Category filter for items list
  const [listCategoryFilter, setListCategoryFilter] = useState<string | null>(null);

  // Bulk selection state (ref + version counter to avoid full re-renders)
  const selectedItemsRef = useRef(new Set<Id<"listItems">>());
  const [selectionVersion, setSelectionVersion] = useState(0);

  // Progressive disclosure states (Criterion 1: Simplicity)
  const [addFormVisible, setAddFormVisible] = useState(false);

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
  const { listCategories, listCategoryCounts, displayItems, pendingCount } = useMemo(() => {
    const cats = [...new Set(safeItems.map((i) => i.category).filter(Boolean) as string[])].sort();
    const counts: Record<string, number> = {};
    safeItems.forEach((i) => { if (i.category) counts[i.category] = (counts[i.category] || 0) + 1; });
    const filtered = listCategoryFilter
      ? safeItems.filter((i) => i.category === listCategoryFilter)
      : safeItems;
    const sorted = [...filtered].sort((a, b) => {
      const aPending = a.approvalStatus === "pending" ? 0 : 1;
      const bPending = b.approvalStatus === "pending" ? 0 : 1;
      return aPending - bPending;
    });
    const pending = filtered.filter((i) => i.approvalStatus === "pending").length;
    return { listCategories: cats, listCategoryCounts: counts, displayItems: sorted, pendingCount: pending };
  }, [safeItems, listCategoryFilter]);

  const isShopping = listStatus === "shopping";

  // Edit budget handlers
  function handleOpenEditBudget() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowEditBudgetModal(true);
  }

  const handleSaveBudget = useCallback(async (newBudget: number | undefined) => {
    await updateList({ id, budget: newBudget });
  }, [updateList, id]);

  const handleToggleItem = useCallback(async (itemId: Id<"listItems">) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await toggleChecked({ id: itemId });
      onMundaneAction();
    } catch (error) {
      console.error("Failed to toggle item:", error);
      alert("Error", "Failed to update item");
    }
  }, [toggleChecked, onMundaneAction, alert]);

  // Actual price modal handlers (Story 3.8)
  function closeActualPriceModal() {
    setShowActualPriceModal(false);
    setCheckingItemId(null);
    setCheckingItemName("");
    setCheckingItemEstPrice(0);
    setCheckingItemQuantity(1);
  }

  const handleConfirmActualPrice = useCallback(async (itemId: Id<"listItems">, actualPrice: number) => {
    await updateItem({ id: itemId, actualPrice });
    await toggleChecked({ id: itemId });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onMundaneAction();
  }, [updateItem, toggleChecked, onMundaneAction]);

  const handleSkipActualPrice = useCallback(async (itemId: Id<"listItems">) => {
    await toggleChecked({ id: itemId });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [toggleChecked]);

  // Mid-shop callback for AddItemForm — sets modal state from child values
  const handleMidShopFromForm = useCallback((name: string, quantity: number, price: number) => {
    setMidShopItemName(name);
    setMidShopItemQuantity(quantity);
    setMidShopItemPrice(price);
    setShowMidShopModal(true);
  }, []);

  function closeMidShopModal() {
    setShowMidShopModal(false);
    setMidShopItemName("");
    setMidShopItemPrice(0);
    setMidShopItemQuantity(1);
  }

  const handleMidShopAdd = useCallback(async (source: "add" | "next_trip") => {
    if (!midShopItemName) return;

    try {
      await addItemMidShop({
        listId: id,
        name: midShopItemName,
        estimatedPrice: midShopItemPrice,
        quantity: midShopItemQuantity,
        source,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (source === "add") {
        alert("Added to List", `"${midShopItemName}" added to your list`);
      } else {
        alert("Saved for Later", `"${midShopItemName}" added to stock for next trip`);
      }

      closeMidShopModal();
    } catch (error: unknown) {
      console.error("Failed to add mid-shop item:", error);
      alert("Error", "Failed to add item");
    }
  }, [addItemMidShop, id, midShopItemName, midShopItemPrice, midShopItemQuantity, alert]);

  // Size/Price Modal handlers (for new add-item flow)
  const handlePendingAdd = useCallback((name: string, quantity: number, category?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingItem({ name, quantity, category });
  }, []);

  const closeSizePriceModal = useCallback(() => {
    setPendingItem(null);
  }, []);

  const handleAddWithSize = useCallback(async (data: {
    size: string;
    price: number;
    priceSource: "personal" | "crowdsourced" | "ai" | "manual";
    confidence: number;
  }) => {
    if (!pendingItem) return;

    try {
      await addItem({
        listId: id,
        name: pendingItem.name,
        quantity: pendingItem.quantity,
        category: pendingItem.category,
        size: data.size,
        estimatedPrice: data.price,
        priceSource: data.priceSource,
        priceConfidence: data.confidence,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPendingItem(null);
    } catch (error) {
      console.error("Failed to add item with size:", error);
      alert("Error", "Failed to add item");
    }
  }, [pendingItem, addItem, id, alert]);

  const handleRemoveItem = useCallback(async (itemId: Id<"listItems">, itemName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const doRemove = async () => {
      try {
        await removeItem({ id: itemId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const count = selectedItemsRef.current.size;

    const doDelete = async () => {
      try {
        await removeMultipleItems({ ids: Array.from(selectedItemsRef.current) });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearSelection();
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      });
      showToast(`${itemName} \u2192 ${listName}`, "check-circle", "#00D4AA");
    } catch (e) {
      console.error("Failed to add to list:", e);
    }
    setAddToListItem(null);
  }

  async function handleStartShopping() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearSelection();
    try {
      await startShopping({ id });
    } catch (error) {
      console.error("Failed to start shopping:", error);
      alert("Error", "Failed to start shopping");
    }
  }

  async function handleCompleteShopping() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const doComplete = async () => {
      try {
        await completeShopping({ id });

        // Restock pantry items that were checked off
        const result = await restockFromCheckedItems({ listId: id });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const restockMsg = result.restockedCount > 0
          ? `${result.restockedCount} pantry item${result.restockedCount !== 1 ? "s" : ""} restocked.`
          : "";

        const tipMsg = restockMsg
          ? `\n\nTip: Scan your receipt anytime for more accurate prices.`
          : "";

        alert(
          "Shopping Complete",
          `Trip finished!${restockMsg ? `\n${restockMsg}` : ""}${tipMsg}`,
          [{ text: "Done", onPress: () => router.back() }]
        );
      } catch (error) {
        console.error("Failed to complete shopping:", error);
        alert("Error", "Failed to complete shopping");
      }
    };

    alert("Complete Shopping", "Mark this shopping trip as complete?", [
      { text: "Cancel", style: "cancel" },
      { text: "Complete", onPress: doComplete },
    ]);
  }

  function handleAddFromPantry() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/pantry-pick?listId=${id}`);
  }

  // Progressive disclosure handler
  function handleToggleAddForm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddFormVisible((prev) => !prev);
  }

  // Partner mode handlers
  const handleApproveItem = useCallback(async (itemId: Id<"listItems">) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await handleApproval({ listItemId: itemId, decision: "approved" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to approve item:", error);
      alert("Error", "Failed to approve item");
    }
  }, [handleApproval, alert]);

  const handleRejectItem = useCallback(async (itemId: Id<"listItems">) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await handleApproval({ listItemId: itemId, decision: "rejected" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to reject item:", error);
      alert("Error", "Failed to reject item");
    }
  }, [handleApproval, alert]);

  const openCommentThread = useCallback((itemId: Id<"listItems">, itemName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommentItemId(itemId);
    setCommentItemName(itemName);
    setShowCommentThread(true);
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
  const renderItem = useCallback(({ item }: { item: ListItem }) => (
    <ShoppingListItem
      item={item}
      onToggle={handleToggleItem}
      onRemove={handleRemoveItem}
      onEdit={handleEditItem}
      onPriorityChange={handlePriorityChange}
      isShopping={isShopping}
      isOwner={isOwner}
      canApprove={canApprove}
      commentCount={commentCounts?.[item._id as string] ?? 0}
      onApprove={handleApproveItem}
      onReject={handleRejectItem}
      onOpenComments={stableOpenComments}
      isSelected={selectedItemsRef.current.has(item._id)}
      onSelectToggle={toggleItemSelection}
    />
  ), [handleToggleItem, handleRemoveItem, handleEditItem, handlePriorityChange,
      isShopping, isOwner, canApprove, commentCounts, handleApproveItem,
      handleRejectItem, stableOpenComments, selectionVersion, toggleItemSelection]);

  // ─── FlashList ListHeaderComponent ───────────────────────────────────────────
  const listHeader = useMemo(() => (
    <View style={styles.listHeaderContainer}>
      {/* Circular Budget Dial -- tap to edit */}
      {budget > 0 && (
        <CircularBudgetDial
          budget={budget}
          planned={estimatedTotal}
          spent={checkedTotal}
          mode={list?.status ?? "active"}
          onPress={handleOpenEditBudget}
        />
      )}

      {/* List-Level Approval Banner */}
      {hasPartners && (
        <ListApprovalBanner
          listId={id}
          approvalStatus={list?.approvalStatus}
          approvalNote={list?.approvalNote}
          approverName={approverName}
          isOwner={isOwner}
          canApprove={canApprove}
          hasApprovers={hasApprovers}
        />
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {list?.status === "active" && (
          <>
            <GlassButton
              variant="secondary"
              size="md"
              icon="package-variant"
              onPress={handleAddFromPantry}
              style={styles.actionButton}
            >
              Add from Pantry
            </GlassButton>
            <GlassButton
              variant="primary"
              size="md"
              icon="cart-outline"
              onPress={handleStartShopping}
              style={styles.actionButton}
            >
              Go Shopping
            </GlassButton>
          </>
        )}
        {list?.status === "shopping" && (
          <View style={styles.shoppingModeContainer}>
            <ShoppingTypewriterHint />
            <View style={styles.shoppingButtonRow}>
              <GlassButton
                variant="secondary"
                size="md"
                icon="plus"
                onPress={handleToggleAddForm}
                style={styles.shoppingRowButton}
              >
                Add Item
              </GlassButton>
              <GlassButton
                variant="primary"
                size="md"
                icon="check-circle-outline"
                onPress={handleCompleteShopping}
                style={styles.shoppingRowButton}
              >
                Complete
              </GlassButton>
            </View>
          </View>
        )}
      </View>

      {/* Add Item Form (extracted component) */}
      <AddItemForm
        listId={id}
        listUserId={list?.userId}
        listStoreName={list?.storeName}
        listStatus={list?.status}
        existingItems={items}
        isVisible={addFormVisible}
        onToggleVisible={handleToggleAddForm}
        canEdit={canEdit !== false}
        budget={budget}
        onMidShopAdd={handleMidShopFromForm}
        onPendingAdd={handlePendingAdd}
      />

      {/* Items section header (only when items exist) */}
      {(items?.length ?? 0) > 0 && (
        <View style={styles.itemsContainer}>
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionTitle}>
              {selectedItemsRef.current.size > 0 && list?.status !== "shopping"
                ? `${selectedItemsRef.current.size} selected`
                : `Items (${items?.length ?? 0})`}
            </Text>
            {/* Bulk selection actions -- hidden during shopping mode */}
            {list?.status !== "shopping" && (
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
          {pendingCount > 0 && (
            <View style={styles.pendingBanner}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color={colors.accent.warning}
              />
              <Text style={styles.pendingBannerText}>
                {pendingCount} {pendingCount === 1 ? "item needs" : "items need"} approval
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  ), [budget, estimatedTotal, checkedTotal, list?.status, list?.approvalStatus,
      list?.approvalNote, list?.userId, list?.storeName, hasPartners, id, approverName,
      isOwner, canApprove, hasApprovers, canEdit, addFormVisible, items,
      selectionVersion, listCategories, listCategoryFilter,
      listCategoryCounts, pendingCount, handleMidShopFromForm, handlePendingAdd]);

  // ─── FlashList ListEmptyComponent ────────────────────────────────────────────
  const listEmpty = useMemo(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <MaterialCommunityIcons
          name="cart-outline"
          size={64}
          color={colors.text.tertiary}
        />
      </View>
      <Text style={styles.emptyTitle}>Your list is ready</Text>
      <Text style={styles.emptySubtitle}>Add items above or pull from your stock</Text>
    </View>
  ), []);

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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <GlassHeader
          title={list.name}
          subtitle={`${checkedCount}/${totalCount} items`}
          showBack
          rightElement={
            <View style={styles.headerRightRow}>
              {hasPartners && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              <NotificationBell onPress={() => setShowNotifications(true)} />
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          data={displayItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={<View style={styles.bottomSpacer} />}
          contentContainerStyle={styles.flashListContent}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          extraData={selectionVersion}
          drawDistance={250}
        />
      </KeyboardAvoidingView>

      {/* Edit Budget Modal */}
      <EditBudgetModal
        visible={showEditBudgetModal}
        budget={budget}
        onClose={() => setShowEditBudgetModal(false)}
        onSave={handleSaveBudget}
      />

      {/* Mid-Shop Add Flow Modal */}
      <MidShopModal
        visible={showMidShopModal}
        itemName={midShopItemName}
        itemPrice={midShopItemPrice}
        itemQuantity={midShopItemQuantity}
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
        visible={showCommentThread}
        itemId={commentItemId}
        itemName={commentItemName}
        onClose={() => {
          setShowCommentThread(false);
          setCommentItemId(null);
          setCommentItemName("");
        }}
      />

      {/* List Chat Thread (Partner Mode) */}
      <ListChatThread
        visible={showListChat}
        listId={id}
        listName={list.name}
        onClose={() => setShowListChat(false)}
      />

      {/* Actual Price Modal (Story 3.8) */}
      <ActualPriceModal
        visible={showActualPriceModal}
        itemId={checkingItemId}
        itemName={checkingItemName}
        estimatedPrice={checkingItemEstPrice}
        quantity={checkingItemQuantity}
        onClose={closeActualPriceModal}
        onConfirm={handleConfirmActualPrice}
        onSkip={handleSkipActualPrice}
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

      {/* Size/Price Modal (for add-item flow) */}
      <SizePriceModal
        visible={pendingItem !== null}
        onClose={closeSizePriceModal}
        itemName={pendingItem?.name ?? ""}
        storeName={list?.storeName ?? "Tesco"}
        sizes={(sizesData?.sizes ?? []) as SizeOption[]}
        defaultSize={sizesData?.defaultSize ?? undefined}
        onAddItem={handleAddWithSize}
        isLoading={pendingItem !== null && sizesData === undefined}
        category={pendingItem?.category}
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
  keyboardView: {
    flex: 1,
  },
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
    paddingTop: spacing.md,
  },
  bottomSpacer: {
    height: 140,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  // Shopping Mode Container
  shoppingModeContainer: {
    flex: 1,
  },
  shoppingButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  shoppingRowButton: {
    flex: 1,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing["2xl"],
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
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
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
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

  // Pending approval banner
  pendingBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  pendingBannerText: {
    color: colors.accent.warning,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: "600" as const,
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
