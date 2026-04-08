import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";

import {
  GlassScreen,
  GlassButton,
  useGlassAlert,
  colors,
  spacing,
} from "@/components/ui/glass";
import { ShoppingListItem, type ListItem } from "@/components/list/ShoppingListItem";
import type { TripStats } from "@/hooks/useTripSummary";

import { haptic } from "@/lib/haptics/safeHaptics";
import { usePartnerRole } from "@/hooks/usePartnerRole";
import { useTripLogic } from "@/hooks/useTripLogic";
import { useDelightToast } from "@/hooks/useDelightToast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useHint } from "@/hooks/useHint";
import { useHintSequence } from "@/hooks/useHintSequence";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { useListPriceRefresh } from "@/hooks/useListPriceRefresh";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { styles } from "@/components/lists/detail/styles";
import { ListHeader } from "@/components/lists/detail/ListHeader";
import { ListHeaderContent } from "@/components/lists/detail/ListHeaderContent";
import { ListFooter } from "@/components/lists/detail/ListFooter";
import { ListEmptyState } from "@/components/lists/detail/ListEmptyState";
import { ListSectionHeader } from "@/components/lists/detail/ListSectionHeader";
import { ListModals } from "@/components/lists/detail/ListModals";

import { categorizeItems, type CategorizedItem } from "@/lib/list/categorizeItems";
import { getStoreDisplayName } from "@/lib/list/storeDisplay";

export default function ListDetailScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string as Id<"shoppingLists">;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarBottom = 62 + Math.max(insets.bottom, spacing.sm);
  const { alert } = useGlassAlert();
  const { showToast } = useDelightToast();
  const { user } = useCurrentUser();

  // ── State ──────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [showCheckedItems, setShowCheckedItems] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showScanNudge, setShowScanNudge] = useState(false);
  const [tripSummary, setTripSummary] = useState<TripStats | null>(null);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [commentItem, setCommentItem] = useState<{ id: Id<"listItems">; name: string } | null>(null);

  // ── Queries & Mutations ────────────────────────────────────────────────────
  const list = useQuery(api.shoppingLists.getById, { id });
  const items = useQuery(api.listItems.getByList, { listId: id });
  const pointsBalance = useQuery(api.points.getPointsBalance);
  const streaks = useQuery(api.insights.getStreaks);
  const partners = useQuery(api.partners.getByList, { listId: id });

  const toggleChecked = useMutation(api.listItems.toggleChecked);
  const removeItem = useMutation(api.listItems.remove);
  const updateItem = useMutation(api.listItems.update);
  const updateListName = useMutation(api.shoppingLists.update);
  const removeMultiple = useMutation(api.listItems.removeMultiple);
  const setStore = useMutation(api.shoppingLists.setStore);
  const refreshPrices = useMutation(api.listItems.refreshListPrices);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { isOwner, isPartner, canEdit } = usePartnerRole(id);
  const hasPartners = (partners?.length ?? 0) > 0;
  const isShared = hasPartners && (isOwner || isPartner);

  const chatMessageCount = useQuery(
    api.partners.getListMessageCount,
    isShared ? { listId: id } : "skip"
  );
  const itemIds = useMemo(() => items?.map((i) => i._id) ?? [], [items]);
  const commentCounts = useQuery(
    api.partners.getCommentCounts,
    isShared && itemIds.length > 0 ? { listItemIds: itemIds } : "skip"
  );
  const { isFinishing, finishTrip } = useTripLogic({
    listId: id,
    onTripFinished: (summary: unknown) => {
      setTripSummary(summary as TripStats);
      setShowSummaryModal(true);
    }
  });

  const addHint = useHint("list_detail_add", "delayed");
  const budgetHint = useHint("list_detail_budget", "manual");
  useHintSequence([
    { hint: addHint, hintId: "list_detail_add" },
    { hint: budgetHint, hintId: "list_detail_budget", condition: (items?.length ?? 0) === 1 },
  ]);

  const userFavorites = useMemo(
    () => (user?.storePreferences?.favorites ?? []) as string[],
    [user?.storePreferences?.favorites]
  );

  const { selectedIds, selectionActive, handleSelectToggle, handleClearSelection, handleDeleteSelected } =
    useMultiSelect(removeMultiple, alert, showToast);

  const { isRefreshingPrices, handleRefreshPrices } =
    useListPriceRefresh(refreshPrices, id, showToast);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToggleItem = useCallback(async (itemId: Id<"listItems">) => {
    try { await toggleChecked({ id: itemId }); } catch (error) { console.error("Toggle failed:", error); }
  }, [toggleChecked]);

  const handleRemoveItem = useCallback(async (itemId: Id<"listItems">, name: string) => {
    alert("Remove Item", `Are you sure you want to remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try { await removeItem({ id: itemId }); showToast(`"${name}" removed`, "trash-can-outline", colors.text.tertiary); }
        catch (error) { console.error("Remove failed:", error); }
      }}
    ]);
  }, [removeItem, alert, showToast]);

  const handleSaveListName = useCallback(async (newName: string) => {
    try { await updateListName({ id, name: newName }); haptic("success"); }
    catch (error) { console.error("Failed to update name:", error); throw error; }
  }, [id, updateListName]);

  const handleSelectStore = useCallback(async (storeId: string) => {
    try { await setStore({ id, normalizedStoreId: storeId }); haptic("success"); }
    catch (error) { console.error("Failed to set store:", error); alert("Error", "Failed to set store"); }
  }, [setStore, id, alert]);

  const handleSaveBudget = useCallback(async (newBudget: number | undefined) => {
    try { await updateListName({ id, budget: newBudget }); haptic("success"); }
    catch (error) { console.error("Failed to update budget:", error); throw error; }
  }, [id, updateListName]);

  const handleBudgetDialPress = useCallback(() => setShowBudgetModal(true), []);
  const handleEditItem = useCallback((i: ListItem) => setEditingItem(i), []);

  const handleSaveEditItem = useCallback(async (updates: {
    id: Id<"listItems">; name?: string; quantity?: number; estimatedPrice?: number;
    size?: string; unit?: string; priceOverride?: boolean; sizeOverride?: boolean;
  }) => { await updateItem(updates); }, [updateItem]);

  const handlePriorityChange = useCallback((itemId: Id<"listItems">, priority: "must-have" | "should-have" | "nice-to-have") => {
    updateItem({ id: itemId, priority });
  }, [updateItem]);

  // ── Derived Data ────────────────────────────────────────────────────────────
  const { displayItems, spent, checkedCount, estimatedTotal } = useMemo(
    () => categorizeItems(items, searchTerm, showCheckedItems, list?.budget || 0),
    [items, searchTerm, showCheckedItems, list?.budget]
  );

  const storeDisplayName = useMemo(
    () => getStoreDisplayName(items, list?.storeName),
    [items, list?.storeName]
  );

  const receiptStreakCount = useMemo(() => {
    const streak = streaks?.find((s: { type: string; currentCount: number }) => s.type === "receipt_scanner");
    return streak?.currentCount ?? 0;
  }, [streaks]);

  const handleOpenComments = useCallback((itemId: Id<"listItems">, itemName: string) => {
    setCommentItem({ id: itemId, name: itemName });
  }, []);

  // ── FlashList ──────────────────────────────────────────────────────────────
  const renderListItem = useCallback(({ item }: { item: CategorizedItem }) => {
    if ("isHeader" in item) return <ListSectionHeader title={item.title} />;
    const counts = commentCounts as Record<string, number> | undefined;
    return (
      <ShoppingListItem
        item={item} canEdit={canEdit} onToggle={handleToggleItem} onRemove={handleRemoveItem}
        onEdit={handleEditItem} onPriorityChange={handlePriorityChange} selectionActive={selectionActive}
        isSelected={selectedIds.has(item._id)} onSelectToggle={handleSelectToggle} isOwner={isOwner}
        commentCount={isShared ? (counts?.[item._id] ?? 0) : undefined}
        onOpenComments={isShared ? handleOpenComments : undefined}
      />
    );
  }, [canEdit, handleToggleItem, handleRemoveItem, handleEditItem, handlePriorityChange, selectionActive, selectedIds, handleSelectToggle, isOwner, isShared, commentCounts, handleOpenComments]);

  const listKeyExtractor = useCallback((item: CategorizedItem) => item._id, []);
  const getListItemType = useCallback((item: CategorizedItem) => "isHeader" in item ? "sectionHeader" : "row", []);
  const handleOpenAddModal = useCallback(() => { setEditingItem(null); setShowAddModal(true); }, []);

  const listHeaderComponent = useMemo(() => (
    <ListHeaderContent
      budget={list?.budget || 0} estimatedTotal={estimatedTotal} spent={spent} canEdit={canEdit}
      onBudgetPress={canEdit ? handleBudgetDialPress : undefined} storeName={list?.storeName}
      normalizedStoreId={list?.normalizedStoreId} userFavorites={userFavorites} itemCount={items?.length ?? 0}
      onStoreSelect={handleSelectStore} onAddItemsPress={handleOpenAddModal}
      isRefreshingPrices={isRefreshingPrices} onRefreshPrices={handleRefreshPrices}
    />
  ), [list?.budget, list?.normalizedStoreId, list?.storeName, estimatedTotal, spent, canEdit,
    userFavorites, items?.length, isRefreshingPrices,
    handleBudgetDialPress, handleSelectStore, handleOpenAddModal, handleRefreshPrices]);

  if (list === undefined || items === undefined) {
    return (
      <GlassScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </GlassScreen>
    );
  }

  if (!list) {
    return (
      <GlassScreen>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.semantic.danger} />
          <Text style={styles.emptyTitle}>List not found</Text>
          <GlassButton variant="primary" onPress={() => router.replace("/(app)/(tabs)/" as never)}>Go Back</GlassButton>
        </View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <ListHeader
        title={list.name} subtitle={storeDisplayName}
        onBack={() => router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/" as never)}
        searchTerm={searchTerm} onSearchChange={setSearchTerm}
        onOpenSettings={() => setShowEditModal(true)} onAddItem={() => setShowAddModal(true)}
        onShare={() => router.push(`/(app)/partners?listId=${id}`)}
        onHealthCheck={() => setShowHealthModal(true)} hasItems={(items?.length ?? 0) > 0}
        isShared={isShared} onOpenChat={() => setShowChat(true)} unreadChatCount={chatMessageCount ?? 0}
      />

      <FlashList
        data={displayItems} renderItem={renderListItem} keyExtractor={listKeyExtractor}
        getItemType={getListItemType} extraData={selectedIds}
        ListHeaderComponent={listHeaderComponent} ListEmptyComponent={<ListEmptyState />}
        contentContainerStyle={styles.listContent}
      />

      {selectionActive && (
        <View style={[styles.selectionBar, { bottom: tabBarBottom }]}>
          <View style={styles.selectionInfo}>
            <Pressable onPress={handleClearSelection} style={styles.selectionCloseBtn}>
              <MaterialCommunityIcons name="close" size={20} color={colors.text.secondary} />
            </Pressable>
            <Text style={styles.selectionCount}>{selectedIds.size} selected</Text>
          </View>
          <Pressable style={styles.selectionDeleteBtn} onPress={handleDeleteSelected}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
            <Text style={styles.selectionDeleteText}>Delete</Text>
          </Pressable>
        </View>
      )}

      {!selectionActive && (
        <ListFooter
          isFinishing={isFinishing} onFinishTrip={finishTrip} checkedCount={checkedCount}
          totalCount={items.length} insetsBottom={tabBarBottom} showCheckedItems={showCheckedItems}
          onToggleCheckedItems={() => setShowCheckedItems(prev => !prev)}
        />
      )}

      <ListModals
        listId={id} listName={list.name} listStoreName={list.storeName}
        listNormalizedStoreId={list.normalizedStoreId} listBudget={list.budget || 0}
        listHealthAnalysis={list.healthAnalysis} items={items}
        showAddModal={showAddModal} onCloseAddModal={() => setShowAddModal(false)}
        editingItem={editingItem} onCloseEditItem={() => setEditingItem(null)} onSaveEditItem={handleSaveEditItem}
        showEditModal={showEditModal} onCloseEditModal={() => setShowEditModal(false)} onSaveListName={handleSaveListName}
        showBudgetModal={showBudgetModal} onCloseBudgetModal={() => setShowBudgetModal(false)} onSaveBudget={handleSaveBudget}
        showSummaryModal={showSummaryModal} onCloseSummaryModal={() => setShowSummaryModal(false)}
        onFinishSummary={() => {
          setShowSummaryModal(false);
          if (!list.healthAnalysis && (items?.length ?? 0) >= 5) setShowHealthModal(true);
          else setShowScanNudge(true);
        }}
        onScanReceipt={() => { setShowSummaryModal(false); router.push(`/(app)/(tabs)/scan?listId=${id}`); }}
        onContinueShopping={() => setShowSummaryModal(false)}
        onRemoveItem={(itemId) => removeItem({ id: itemId as Id<"listItems"> })}
        onMoveItem={() => alert("Move Item", "Feature coming soon.")}
        tripSummary={tripSummary}
        showScanNudge={showScanNudge}
        onScanReceiptNudge={() => { setShowScanNudge(false); router.push(`/(app)/(tabs)/scan?listId=${id}`); }}
        onDismissScanNudge={() => setShowScanNudge(false)}
        pointsBalance={pointsBalance ?? null} streakCount={receiptStreakCount}
        showHealthModal={showHealthModal} onCloseHealthModal={() => setShowHealthModal(false)}
        showChat={showChat} onCloseChat={() => setShowChat(false)}
        commentItem={commentItem} onCloseComment={() => setCommentItem(null)}
      />
    </GlassScreen>
  );
}
