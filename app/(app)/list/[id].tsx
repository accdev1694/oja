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
  AnimatedSection,
} from "@/components/ui/glass";
import { ShoppingListItem, type ListItem } from "@/components/list/ShoppingListItem";
import { AddItemsModal } from "@/components/list/AddItemsModal";
import { EditListNameModal } from "@/components/lists/EditListNameModal";
import { HealthAnalysisModal } from "@/components/lists/HealthAnalysisModal";
import { TripSummaryModal } from "@/components/list/modals/TripSummaryModal";
import { ScanReceiptNudgeModal } from "@/components/list/modals/ScanReceiptNudgeModal";

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
import { ListBudgetCard } from "@/components/lists/detail/ListBudgetCard";
import { ListFooter } from "@/components/lists/detail/ListFooter";
import { ListEmptyState } from "@/components/lists/detail/ListEmptyState";
import { ListActions } from "@/components/lists/detail/ListActions";
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
  const [showScanNudge, setShowScanNudge] = useState(false);
  const [tripSummary, setTripSummary] = useState<{
    budget?: number;
    actualTotal?: number;
    itemsChecked?: number;
    totalItems?: number;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);

  // ── Queries & Mutations ────────────────────────────────────────────────────
  const list = useQuery(api.shoppingLists.getById, { id });
  const items = useQuery(api.listItems.getByList, { listId: id });
  const pointsBalance = useQuery(api.points.getPointsBalance);
  const streaks = useQuery(api.insights.getStreaks);
  
  const toggleChecked = useMutation(api.listItems.toggleChecked);
  const removeItem = useMutation(api.listItems.remove);
  const updateItem = useMutation(api.listItems.update);
  const updateListName = useMutation(api.shoppingLists.update);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { isOwner, canEdit } = usePartnerRole(id);
  const { 
    isInProgress, 
    isFinishing, 
    startTrip, 
    finishTrip, 
  } = useTripLogic({ 
    listId: id,
    onTripFinished: (summary) => {
      setTripSummary(summary);
      setShowSummaryModal(true);
    }
  });

  const addHint = useHint("list_detail_add", "delayed");
  const budgetHint = useHint("list_detail_budget", "manual");
  
  useHintSequence([
    { hint: addHint, hintId: "list_detail_add" },
    { hint: budgetHint, hintId: "list_detail_budget", condition: (items?.length ?? 0) === 1 },
  ]);

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

  // ── Derived Data ────────────────────────────────────────────────────────────
  const { displayItems, spent, remaining, checkedCount } = useMemo(() => {
    if (!items) return { displayItems: [], spent: 0, remaining: 0, checkedCount: 0 };

    let filtered = items.filter(i =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!showCheckedItems && !searchTerm) {
      filtered = filtered.filter(i => !i.isChecked);
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
      checkedCount: checkedAcc
    };
  }, [items, searchTerm, showCheckedItems, list?.budget]);

  const receiptStreakCount = useMemo(() => {
    const streak = streaks?.find(s => s.type === "receipt_scanner");
    return streak?.currentCount ?? 0;
  }, [streaks]);

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
          <GlassButton variant="primary" onPress={() => router.replace("/(app)/(tabs)/")}>
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
        subtitle={list.storeName}
        onBack={() => router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/")}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenSettings={() => setShowEditModal(true)}
        onShare={() => alert("Coming Soon", "Shared list functionality is being updated.")}
      />

      <FlashList
        data={displayItems}
        renderItem={({ item }) => {
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
              onEdit={(i) => { setEditingItem(i); setShowAddModal(true); }}
              onPriorityChange={(itemId, priority) => updateItem({ id: itemId, priority })}
            />
          );
        }}
        keyExtractor={(item) => item._id}
        // @ts-ignore
        estimatedItemSize={80}
        ListHeaderComponent={
          <View>
            <AnimatedSection animation="fadeInDown" duration={400}>
              <ListBudgetCard
                budget={list.budget || 0}
                spent={spent}
                remaining={remaining}
                currency="GBP"
                onPress={() => setShowEditModal(true)}
              />
            </AnimatedSection>
            
            <ListActions 
              showCheckedItems={showCheckedItems}
              onToggleCheckedItems={setShowCheckedItems}
              itemCount={items.length}
            />
          </View>
        }
        ListEmptyComponent={<ListEmptyState />}
        contentContainerStyle={styles.listContent}
      />

      <ListFooter
        isInProgress={isInProgress}
        isFinishing={isFinishing}
        onStartTrip={() => startTrip(list.normalizedStoreId, list.storeName)}
        onFinishTrip={finishTrip}
        activeShopper={list.activeShopperId ? { name: "Partner" } : null}
        checkedCount={checkedCount}
        totalCount={items.length}
        insetsBottom={insets.bottom}
      />

      {!isInProgress && (
        <Pressable
          style={[styles.quickAddButton, { bottom: insets.bottom + 100 }]}
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

      <TripSummaryModal
        visible={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        onFinish={() => {
          setShowSummaryModal(false);
          setShowScanNudge(true);
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
