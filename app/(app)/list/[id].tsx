import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
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
  AnimatedSection,
  CircularBudgetDial,
} from "@/components/ui/glass";
import { getStoreInfoSafe } from "@/convex/lib/stores/normalization";
import { ShoppingListItem, type ListItem } from "@/components/list/ShoppingListItem";
import { AddItemsModal } from "@/components/list/AddItemsModal";
import { EditListNameModal } from "@/components/lists/EditListNameModal";
import { HealthAnalysisModal } from "@/components/lists/HealthAnalysisModal";
import { TripSummaryModal } from "@/components/list/modals/TripSummaryModal";
import { EditBudgetModal } from "@/components/list/modals/EditBudgetModal";
import type { TripStats } from "@/hooks/useTripSummary";
import { ScanReceiptNudgeModal } from "@/components/list/modals/ScanReceiptNudgeModal";
import { ListActionRow } from "@/components/list/ListActionRow";
import { StoreDropdownSheet } from "@/components/list/StoreDropdownSheet";

import { haptic } from "@/lib/haptics/safeHaptics";
import { usePartnerRole } from "@/hooks/usePartnerRole";
import { useTripLogic } from "@/hooks/useTripLogic";
import { useDelightToast } from "@/hooks/useDelightToast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useHint } from "@/hooks/useHint";
import { useHintSequence } from "@/hooks/useHintSequence";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Sub-components
import { styles } from "@/components/lists/detail/styles";
import { ListHeader } from "@/components/lists/detail/ListHeader";

import { ListFooter } from "@/components/lists/detail/ListFooter";
import { ListEmptyState } from "@/components/lists/detail/ListEmptyState";
import { ListSectionHeader } from "@/components/lists/detail/ListSectionHeader";

type ListHeaderData = {
  _id: string;
  isHeader: true;
  title: string;
};

type CategorizedItem = ListItem | ListHeaderData;

export default function ListDetailScreen() {
  const params = useLocalSearchParams();
  const id = params.id as string as Id<"shoppingLists">;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Tab bar height: 8 (inner paddingTop) + 8+24+2+12+8 (tab item) + bottomPadding
  const tabBarBottom = 62 + Math.max(insets.bottom, spacing.sm);
  const { alert } = useGlassAlert();
  const { toast, dismiss, showToast } = useDelightToast();
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
  const [showMidShopStorePicker, setShowMidShopStorePicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  // ── Queries & Mutations ────────────────────────────────────────────────────
  const list = useQuery(api.shoppingLists.getById, { id });
  const items = useQuery(api.listItems.getByList, { listId: id });
  const pointsBalance = useQuery(api.points.getPointsBalance);
  const streaks = useQuery(api.insights.getStreaks);
  
  const toggleChecked = useMutation(api.listItems.toggleChecked);
  const removeItem = useMutation(api.listItems.remove);
  const updateItem = useMutation(api.listItems.update);
  const updateListName = useMutation(api.shoppingLists.update);
  const removeMultiple = useMutation(api.listItems.removeMultiple);
  const setStore = useMutation(api.shoppingLists.setStore);
  const switchStoreMidShop = useMutation(api.shoppingLists.switchStoreMidShop);
  const refreshPrices = useMutation(api.listItems.refreshListPrices);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { isOwner, canEdit } = usePartnerRole(id);
  const { 
    isInProgress, 
    isFinishing, 
    startTrip, 
    finishTrip, 
  } = useTripLogic({ 
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

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToggleItem = useCallback(async (itemId: Id<"listItems">) => {
    try {
      await toggleChecked({ id: itemId });
    } catch (error) {
      console.error("Toggle failed:", error);
    }
  }, [toggleChecked]);

  const handleRemoveItem = useCallback(async (itemId: Id<"listItems">, name: string) => {
    alert("Remove Item", `Are you sure you want to remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Remove", 
        style: "destructive", 
        onPress: async () => {
          try {
            await removeItem({ id: itemId });
            showToast(`"${name}" removed`, "trash-can-outline", colors.text.tertiary);
          } catch (error) {
            console.error("Remove failed:", error);
          }
        }
      }
    ]);
  }, [removeItem, alert, showToast]);

  const handleSaveListName = useCallback(async (newName: string) => {
    try {
      await updateListName({ id, name: newName });
      haptic("success");
    } catch (error) {
      console.error("Failed to update name:", error);
      throw error;
    }
  }, [id, updateListName]);

  const handleSelectStore = useCallback(async (storeId: string) => {
    try {
      await setStore({ id, normalizedStoreId: storeId });
      haptic("success");
    } catch (error) {
      console.error("Failed to set store:", error);
      alert("Error", "Failed to set store");
    }
  }, [setStore, id, alert]);

  const handleMidShopStoreSwitch = useCallback(async (storeId: string) => {
    setShowMidShopStorePicker(false);
    try {
      const result = await switchStoreMidShop({ listId: id, newStoreId: storeId });
      haptic("success");
      showToast(`Switched to ${result.storeName}`, "cart", colors.accent.primary);
    } catch (error) {
      console.error("Failed to switch store:", error);
      showToast("Failed to switch store", "alert-circle", colors.semantic.danger);
    }
  }, [switchStoreMidShop, id, showToast]);

  const handleSaveBudget = useCallback(async (newBudget: number | undefined) => {
    try {
      await updateListName({ id, budget: newBudget });
      haptic("success");
    } catch (error) {
      console.error("Failed to update budget:", error);
      throw error;
    }
  }, [id, updateListName]);

  const handleBudgetDialPress = useCallback(() => setShowBudgetModal(true), []);

  const handleEditItem = useCallback((i: ListItem) => {
    setEditingItem(i);
    setShowAddModal(true);
  }, []);

  const handlePriorityChange = useCallback((itemId: Id<"listItems">, priority: "must-have" | "should-have" | "nice-to-have") => {
    updateItem({ id: itemId, priority });
  }, [updateItem]);

  const handleRefreshPrices = useCallback(async () => {
    haptic("light");
    setIsRefreshingPrices(true);
    try {
      const result = await refreshPrices({ listId: id });
      haptic("success");
      showToast(
        `Updated ${result.updated} of ${result.total} prices`,
        "currency-gbp",
        colors.accent.primary
      );
    } catch (error) {
      console.error("Price refresh failed:", error);
    } finally {
      setIsRefreshingPrices(false);
    }
  }, [refreshPrices, id, showToast]);

  // ── Multi-select ──────────────────────────────────────────────────────────
  const selectionActive = selectedIds.size > 0;

  const handleSelectToggle = useCallback((itemId: Id<"listItems">) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const count = selectedIds.size;
    alert("Delete Items", `Remove ${count} selected item${count > 1 ? "s" : ""}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeMultiple({ ids: [...selectedIds] as Id<"listItems">[] });
            haptic("success");
            showToast(`${count} item${count > 1 ? "s" : ""} removed`, "trash-can-outline", colors.text.tertiary);
            setSelectedIds(new Set());
          } catch (error) {
            console.error("Bulk delete failed:", error);
          }
        },
      },
    ]);
  }, [selectedIds, removeMultiple, alert, showToast]);

  // ── Derived Data ────────────────────────────────────────────────────────────
  const { displayItems, spent, remaining, checkedCount, estimatedTotal } = useMemo(() => {
    if (!items) return { displayItems: [], spent: 0, remaining: 0, checkedCount: 0, estimatedTotal: 0 };

    // Compute estimated total from ALL items (not just filtered)
    let plannedAcc = 0;
    items.forEach((item: ListItem) => {
      plannedAcc += (item.estimatedPrice || 0) * item.quantity;
    });

    let filtered = items.filter((i: ListItem) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!showCheckedItems && !searchTerm) {
      filtered = filtered.filter((i: ListItem) => !i.isChecked);
    }

    const sorted = [...filtered].sort((a, b) => {
      if (a.isChecked !== b.isChecked) return a.isChecked ? 1 : -1;
      return (a.category || "Other").localeCompare(b.category || "Other");
    });

    const sections: CategorizedItem[] = [];
    let currentCat = "";
    let spentAcc = 0;
    let checkedAcc = 0;

    sorted.forEach(item => {
      const cat = item.category || "Other";
      if (cat !== currentCat) {
        sections.push({ _id: `header-${cat}`, isHeader: true, title: cat });
        currentCat = cat;
      }
      sections.push(item);
      if (item.isChecked) {
        spentAcc += (item.actualPrice || item.estimatedPrice || 0) * item.quantity;
        checkedAcc++;
      }
    });

    const budget = list?.budget || 0;
    return {
      displayItems: sections,
      spent: spentAcc,
      remaining: Math.max(0, budget - spentAcc),
      checkedCount: checkedAcc,
      estimatedTotal: plannedAcc,
    };
  }, [items, searchTerm, showCheckedItems, list?.budget]);

  const storeDisplayName = useMemo(() => {
    const segments = list?.storeSegments as { storeName: string }[] | undefined;
    if (segments && segments.length > 0) {
      const unique: string[] = [];
      for (const seg of segments) {
        if (!unique.includes(seg.storeName)) unique.push(seg.storeName);
      }
      if (unique.length === 1) return unique[0];
      if (unique.length === 2) return `${unique[0]} → ${unique[1]}`;
      const first = unique[0];
      const current = unique[unique.length - 1];
      const remaining = unique.length - 2;
      return `${first} → ${current} + ${remaining} more`;
    }
    return list?.storeName;
  }, [list?.storeSegments, list?.storeName]);

  const receiptStreakCount = useMemo(() => {
    const streak = streaks?.find((s: { type: string; currentCount: number }) => s.type === "receipt_scanner");
    return streak?.currentCount ?? 0;
  }, [streaks]);

  // ── FlashList performance: memoized renderItem, keyExtractor, getItemType ──
  const renderListItem = useCallback(({ item }: { item: CategorizedItem }) => {
    if ("isHeader" in item) {
      return <ListSectionHeader title={item.title} />;
    }
    return (
      <ShoppingListItem
        item={item}
        isShopping={isInProgress}
        canEdit={canEdit}
        onToggle={handleToggleItem}
        onRemove={handleRemoveItem}
        onEdit={handleEditItem}
        onPriorityChange={handlePriorityChange}
        selectionActive={selectionActive}
        isSelected={selectedIds.has(item._id)}
        onSelectToggle={handleSelectToggle}
      />
    );
  }, [isInProgress, canEdit, handleToggleItem, handleRemoveItem, handleEditItem, handlePriorityChange, selectionActive, selectedIds, handleSelectToggle]);

  const listKeyExtractor = useCallback((item: CategorizedItem) => item._id, []);

  const getListItemType = useCallback((item: CategorizedItem) =>
    "isHeader" in item ? "sectionHeader" : "row",
  []);

  const handleOpenAddModal = useCallback(() => {
    setEditingItem(null);
    setShowAddModal(true);
  }, []);

  const handleOpenMidShopStorePicker = useCallback(() => {
    haptic("light");
    setShowMidShopStorePicker(true);
  }, []);

  const handleMidShopAddItems = useCallback(() => {
    haptic("light");
    setEditingItem(null);
    setShowAddModal(true);
  }, []);

  const listHeaderComponent = useMemo(
    () => (
      <View>
        <AnimatedSection animation="fadeInDown" duration={400}>
          <CircularBudgetDial
            budget={list?.budget || 0}
            planned={estimatedTotal}
            spent={spent}
            mode={isInProgress ? "shopping" : "active"}
            onPress={canEdit ? handleBudgetDialPress : undefined}
            storeName={storeDisplayName}
            storeColor={list?.normalizedStoreId ? getStoreInfoSafe(list.normalizedStoreId)?.color : undefined}
          />
        </AnimatedSection>

        {canEdit && !isInProgress && (
          <ListActionRow
            storeName={storeDisplayName}
            storeColor={list?.normalizedStoreId ? getStoreInfoSafe(list.normalizedStoreId)?.color : undefined}
            hasStore={!!list?.normalizedStoreId}
            currentStoreId={list?.normalizedStoreId}
            userFavorites={userFavorites}
            itemCount={items?.length ?? 0}
            onStoreSelect={handleSelectStore}
            onAddItemsPress={handleOpenAddModal}
          />
        )}

        {canEdit && !isInProgress && (items?.length ?? 0) > 0 && (
          <View style={styles.refreshPricesRow}>
            <Pressable
              style={styles.refreshPricesButton}
              onPress={handleRefreshPrices}
              disabled={isRefreshingPrices}
            >
              <MaterialCommunityIcons
                name="currency-gbp"
                size={16}
                color={isRefreshingPrices ? colors.text.disabled : colors.accent.primary}
              />
              <Text
                style={[
                  styles.refreshPricesText,
                  isRefreshingPrices && { color: colors.text.disabled },
                ]}
              >
                {isRefreshingPrices ? "Refreshing..." : "Refresh Prices"}
              </Text>
            </Pressable>
          </View>
        )}

        {isInProgress && canEdit && (
          <View style={styles.midShopActions}>
            <Pressable
              style={styles.midShopButton}
              onPress={handleOpenMidShopStorePicker}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={18} color={colors.accent.primary} />
              <Text style={styles.midShopButtonText}>Switch Store</Text>
            </Pressable>
            <Pressable
              style={styles.midShopButton}
              onPress={handleMidShopAddItems}
            >
              <MaterialCommunityIcons name="plus" size={18} color={colors.accent.primary} />
              <Text style={styles.midShopButtonText}>Add Items</Text>
            </Pressable>
          </View>
        )}
      </View>
    ),
    [list?.budget, list?.normalizedStoreId, estimatedTotal, spent, isInProgress, canEdit,
     storeDisplayName, userFavorites, items?.length, isRefreshingPrices,
     handleBudgetDialPress, handleSelectStore, handleOpenAddModal, handleRefreshPrices,
     handleOpenMidShopStorePicker, handleMidShopAddItems]
  );

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
          <GlassButton variant="primary" onPress={() => router.replace("/(app)/(tabs)/" as never)}>
            Go Back
          </GlassButton>
        </View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <ListHeader
        title={list.name}
        subtitle={storeDisplayName}
        onBack={() => router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/" as never)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenSettings={() => setShowEditModal(true)}
        onShare={() => alert("Coming Soon", "Shared list functionality is being updated.")}
      />

      <FlashList
        data={displayItems}
        renderItem={renderListItem}
        keyExtractor={listKeyExtractor}
        getItemType={getListItemType}
        extraData={selectedIds}
        ListHeaderComponent={listHeaderComponent}
        ListEmptyComponent={<ListEmptyState />}
        contentContainerStyle={styles.listContent}
      />

      {selectionActive && (
        <View style={[styles.selectionBar, { bottom: tabBarBottom }]}>
          <View style={styles.selectionInfo}>
            <Pressable onPress={handleClearSelection} style={styles.selectionCloseBtn}>
              <MaterialCommunityIcons name="close" size={20} color={colors.text.secondary} />
            </Pressable>
            <Text style={styles.selectionCount}>
              {selectedIds.size} selected
            </Text>
          </View>
          <Pressable style={styles.selectionDeleteBtn} onPress={handleDeleteSelected}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
            <Text style={styles.selectionDeleteText}>Delete</Text>
          </Pressable>
        </View>
      )}

      {!selectionActive && (
        <ListFooter
          isInProgress={isInProgress}
          isFinishing={isFinishing}
          onStartTrip={() => startTrip(list.normalizedStoreId, list.storeName)}
          onFinishTrip={finishTrip}
          activeShopper={list.activeShopperId ? { name: "Partner" } : null}
          checkedCount={checkedCount}
          totalCount={items.length}
          insetsBottom={tabBarBottom}
          showCheckedItems={showCheckedItems}
          onToggleCheckedItems={() => setShowCheckedItems(prev => !prev)}
        />
      )}

      {!isInProgress && (
        <Pressable
          style={[styles.quickAddButton, { bottom: tabBarBottom + 80 }]}
          onPress={() => {
            setEditingItem(null);
            setShowAddModal(true);
          }}
        >
          <MaterialCommunityIcons name="plus" size={32} color="#fff" />
        </Pressable>
      )}

      {/* Modals */}
      <AddItemsModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        listId={id}
        listStoreName={list.storeName}
        listNormalizedStoreId={list.normalizedStoreId}
        existingItems={items}
      />

      <EditListNameModal
        visible={showEditModal}
        currentName={list.name}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveListName}
      />

      <EditBudgetModal
        visible={showBudgetModal}
        budget={list.budget || 0}
        onClose={() => setShowBudgetModal(false)}
        onSave={handleSaveBudget}
      />

      <TripSummaryModal
        visible={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        onFinish={() => {
          setShowSummaryModal(false);
          if (!list.healthAnalysis && (items?.length ?? 0) >= 5) {
            setShowHealthModal(true);
          } else {
            setShowScanNudge(true);
          }
        }}
        onScanReceipt={() => {
          setShowSummaryModal(false);
          router.push(`/(app)/(tabs)/scan?listId=${id}`);
        }}
        onContinueShopping={() => setShowSummaryModal(false)}
        onRemoveItem={(itemId) => removeItem({ id: itemId as Id<"listItems"> })}
        onMoveItem={(item) => alert("Move Item", "Feature coming soon.")}
        stats={tripSummary}
      />

      <ScanReceiptNudgeModal
        visible={showScanNudge}
        onScanReceipt={() => {
          setShowScanNudge(false);
          router.push(`/(app)/(tabs)/scan?listId=${id}`);
        }}
        onDismiss={() => setShowScanNudge(false)}
        storeName={list.storeName}
        pointsBalance={pointsBalance ?? null}
        streakCount={receiptStreakCount}
      />

      <StoreDropdownSheet
        visible={showMidShopStorePicker}
        onClose={() => setShowMidShopStorePicker(false)}
        onSelect={handleMidShopStoreSwitch}
        currentStoreId={list.normalizedStoreId}
        userFavorites={userFavorites}
      />

      <HealthAnalysisModal
        visible={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        listId={id}
        initialAnalysis={list.healthAnalysis}
        itemCount={items.length}
      />
    </GlassScreen>
  );
}
