import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState, useMemo, useCallback, useRef, useEffect, startTransition } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Dimensions,
  Pressable,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  notificationAsync,
  impactAsync,
  NotificationFeedbackType,
  ImpactFeedbackStyle,
} from "expo-haptics";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  STOCK_LEVEL_ORDER,
  type StockLevel,
  PantryItemRow,
  SwipeOnboardingOverlay,
  TypewriterHint,
  AddedToListToast,
  AddPantryItemModal,
  StockFilterModal,
  PantryListPickerModal,
} from "@/components/pantry";

import {
  GlassScreen,
  GlassCard,
  GlassSearchInput,
  SimpleHeader,
  SkeletonPantryItem,
  EmptyPantry,
  TrialNudgeBanner,
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";
import { TipBanner } from "@/components/ui/TipBanner";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const SCREEN_WIDTH = Dimensions.get("window").width;

/** Time-based greeting with optional name */
function getGreeting(firstName?: string): string {
  const hour = new Date().getHours();
  let greeting = "Hello";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";
  else greeting = "Good evening";
  return firstName ? `${greeting}, ${firstName}` : greeting;
}

type PantryViewMode = "attention" | "all";

// =============================================================================
// CATEGORY SECTION HEADER (shared between attention + all modes)
// =============================================================================

interface CategoryHeaderProps {
  category: string;
  count: number;
  isCollapsed: boolean;
  onToggle: (category: string) => void;
}

const CategoryHeader = React.memo(function CategoryHeader({
  category,
  count,
  isCollapsed,
  onToggle,
}: CategoryHeaderProps) {
  const handlePress = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    onToggle(category);
  }, [category, onToggle]);

  return (
    <TouchableOpacity
      style={styles.categoryHeader}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.categoryTitleRow}>
        <Text style={styles.categoryTitle}>{category}</Text>
        <View style={styles.categoryCountBadge}>
          <Text style={styles.categoryCount}>{count}</Text>
        </View>
      </View>
      <MaterialCommunityIcons
        name={isCollapsed ? "chevron-right" : "chevron-down"}
        size={24}
        color={colors.text.tertiary}
      />
    </TouchableOpacity>
  );
});

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function PantryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alert } = useGlassAlert();
  const { firstName } = useCurrentUser();
  const items = useQuery(api.pantryItems.getByUser);
  const activeLists = useQuery(api.shoppingLists.getActive);
  const updateStockLevel = useMutation(api.pantryItems.updateStockLevel);
  const createList = useMutation(api.shoppingLists.create);
  const addListItem = useMutation(api.listItems.create);
  const addFromPantryOut = useMutation(api.listItems.addFromPantryOut);
  const migrateIcons = useMutation(api.pantryItems.migrateIcons);
  const removePantryItem = useMutation(api.pantryItems.remove);

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

  // Sliding pill animation: 0 = attention (left), 1 = all (right)
  const tabProgress = useSharedValue(0);
  const tabPillWidth = useSharedValue(0);

  const onTabContainerLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    tabPillWidth.value = (e.nativeEvent.layout.width - 8) / 2;
  }, []);

  // UI State
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [stockFilters, setStockFilters] = useState<Set<StockLevel>>(
    new Set<StockLevel>(["stocked", "low", "out"])
  );

  // Add item modal
  const [addModalVisible, setAddModalVisible] = useState(false);

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
    setCollapsedCategories(new Set(categories));
  }, [categories]);

  // ── Step 1.1: Memoize derived data ────────────────────────────────────

  const attentionCount = useMemo(() => {
    if (!items) return 0;
    return items.filter(
      (item) => item.stockLevel === "low" || item.stockLevel === "out"
    ).length;
  }, [items]);

  const outCount = useMemo(() => {
    if (!items) return 0;
    return items.filter((item) => item.stockLevel === "out").length;
  }, [items]);

  const slidingPillStyle = useAnimatedStyle(() => {
    return {
      width: tabPillWidth.value,
      transform: [{ translateX: tabProgress.value * tabPillWidth.value }],
      backgroundColor: interpolateColor(
        tabProgress.value,
        [0, 1],
        [`${colors.accent.warning}25`, `${colors.accent.primary}25`]
      ),
    };
  });

  // Filter items based on view mode, search, stock level
  const filteredItems = useMemo(() => {
    if (!items) return [];

    return items.filter((item) => {
      if (viewMode === "attention") {
        if (item.stockLevel !== "low" && item.stockLevel !== "out") return false;
      } else {
        if (!stockFilters.has(item.stockLevel as StockLevel)) return false;
      }
      if (searchQuery.trim()) {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [items, searchQuery, stockFilters, viewMode]);

  // Step 1.1: Memoize groupedItems + sections
  const sections = useMemo(() => {
    const grouped: Record<string, typeof filteredItems> = {};
    filteredItems.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return Object.entries(grouped).map(([category, data]) => ({
      title: category,
      data,
    }));
  }, [filteredItems]);

  const activeFilterCount = useMemo(() => 5 - stockFilters.size, [stockFilters]);

  // Step 1.1: Memoize hasExpandedCategory (was computed twice inline)
  const hasExpandedCategory = useMemo(
    () => sections.some((s) => !collapsedCategories.has(s.title)),
    [sections, collapsedCategories]
  );

  // ── Step 1.3: Stabilize callbacks ─────────────────────────────────────

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
    setStockFilters(new Set<StockLevel>(["stocked", "low", "out"]));
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
        const listName = `Shopping List ${new Date().toLocaleDateString()}`;
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

  // Step 1.3: Stable callbacks that take itemId, called by PantryItemRow internally
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
      await updateStockLevel({ id: item._id, stockLevel: nextLevel });
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

  const handleAddToList = useCallback((itemId: Id<"pantryItems">) => {
    const item = items?.find((i) => i._id === itemId);
    if (!item) return;

    const planningLists = (activeLists ?? []).filter(
      (l) => l.status === "active" || l.status === "shopping"
    );

    if (planningLists.length === 0) {
      const doCreate = async () => {
        try {
          const listId = await createList({ name: "Shopping List" });
          await addListItem({
            listId: listId as Id<"shoppingLists">,
            name: item.name,
            quantity: 1,
            estimatedPrice: item.lastPrice,
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
      });
      showToast(itemName);
    } catch (e) {
      console.error("Failed to add to list:", e);
    }
    setAddToListItem(null);
  }, [addListItem, showToast]);

  // Step 1.4: Stable toggleCategory callback
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

  const handleViewModeSwitch = useCallback((mode: PantryViewMode) => {
    if (mode === viewMode) return;
    impactAsync(ImpactFeedbackStyle.Light);

    tabProgress.value = withSpring(mode === "all" ? 1 : 0, {
      damping: 18,
      stiffness: 180,
    });

    startTransition(() => {
      setViewMode(mode);
      setSearchQuery("");
      if (mode === "all" && categories.length > 0) {
        setCollapsedCategories(new Set(categories));
      }
    });
  }, [viewMode, categories, tabProgress]);

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

  // Journey prompt handler
  const handleJourneyPress = useCallback(async () => {
    impactAsync(ImpactFeedbackStyle.Light);
    try {
      let listId;
      if (activeLists && activeLists.length > 0) {
        listId = activeLists[0]._id;
      } else {
        const listName = `Shopping List ${new Date().toLocaleDateString()}`;
        listId = await createList({ name: listName, budget: 50 });
      }
      await addFromPantryOut({ listId });
      notificationAsync(NotificationFeedbackType.Success);
      router.navigate(`/(app)/list/${listId}` as any);
    } catch (error) {
      console.error("Failed to add out items:", error);
    }
  }, [activeLists, createList, addFromPantryOut, router]);

  // ── Step 1.5: SectionList renderers ───────────────────────────────────

  const renderSectionHeader = useCallback(({ section }: { section: { title: string; data: any[] } }) => {
    return (
      <CategoryHeader
        category={section.title}
        count={section.data.length}
        isCollapsed={collapsedCategories.has(section.title)}
        onToggle={toggleCategory}
      />
    );
  }, [collapsedCategories, toggleCategory]);

  const renderItem = useCallback(({ item, section }: { item: any; section: { title: string } }) => {
    // If category is collapsed, render nothing
    if (collapsedCategories.has(section.title)) return null;

    return (
      <PantryItemRow
        item={item}
        onSwipeDecrease={handleSwipeDecrease}
        onSwipeIncrease={handleSwipeIncrease}
        onRemove={handleRemoveItem}
        onAddToList={handleAddToList}
      />
    );
  }, [collapsedCategories, handleSwipeDecrease, handleSwipeIncrease, handleRemoveItem, handleAddToList]);

  const keyExtractor = useCallback((item: any) => item._id, []);

  const ListHeader = useMemo(() => {
    if (filteredItems.length === 0 && viewMode === "attention") {
      return (
        <View style={styles.attentionEmptyContainer}>
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={64}
            color={colors.accent.success}
          />
          <Text style={styles.attentionEmptyTitle}>All stocked up!</Text>
          <Text style={styles.attentionEmptySubtitle}>
            Nothing needs restocking right now. Tap "All Items" to browse your full stock.
          </Text>
        </View>
      );
    }

    return (
      <>
        {hasExpandedCategory && (
          <View style={styles.hintRow}>
            <TypewriterHint text="Swipe left/right to adjust stock level" />
          </View>
        )}

        {viewMode === "attention" && outCount > 0 && (
          <Pressable onPress={handleJourneyPress}>
            <GlassCard style={styles.journeyBanner}>
              <View style={styles.journeyRow}>
                <MaterialCommunityIcons
                  name="cart-arrow-right"
                  size={20}
                  color={colors.accent.primary}
                />
                <Text style={styles.journeyText}>
                  {outCount} item{outCount !== 1 ? "s" : ""} out — add to your next list?
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={colors.text.tertiary}
                />
              </View>
            </GlassCard>
          </Pressable>
        )}
      </>
    );
  }, [filteredItems.length, viewMode, hasExpandedCategory, outCount, handleJourneyPress]);

  // ── Loading & empty states ────────────────────────────────────────────

  if (items === undefined) {
    return (
      <GlassScreen edges={["top"]}>
        <SimpleHeader title="My Stock" subtitle="What you have at home · Loading..." accentColor={colors.semantic.pantry} />
        <View style={styles.skeletonContainer}>
          <View style={styles.skeletonSection}>
            <View style={styles.skeletonSectionHeader}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonBadge} />
            </View>
            <SkeletonPantryItem />
            <SkeletonPantryItem />
            <SkeletonPantryItem />
          </View>
          <View style={styles.skeletonSection}>
            <View style={styles.skeletonSectionHeader}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonBadge} />
            </View>
            <SkeletonPantryItem />
            <SkeletonPantryItem />
          </View>
        </View>
      </GlassScreen>
    );
  }

  if (items.length === 0) {
    return (
      <GlassScreen edges={["top"]}>
        <SimpleHeader title="My Stock" subtitle="What you have at home · 0 items" accentColor={colors.semantic.pantry} />
        <View style={styles.emptyContainer}>
          <EmptyPantry />
        </View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen edges={["top"]}>
      <GestureHandlerRootView style={styles.container}>
        {/* Header */}
        <SimpleHeader
          title={getGreeting(firstName)}
          accentColor={colors.semantic.pantry}
          subtitle={
            viewMode === "attention"
              ? `${attentionCount} item${attentionCount !== 1 ? "s" : ""} need restocking`
              : `Your stock · ${filteredItems.length} of ${items.length} items`
          }
          rightElement={
            <View style={styles.headerButtons}>
              <Pressable style={styles.addButton} onPress={handleOpenAddModal}>
                <MaterialCommunityIcons name="plus" size={18} color={colors.accent.primary} />
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
              <Pressable
                style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
                onPress={handleOpenFilter}
              >
                <MaterialCommunityIcons
                  name="tune-variant"
                  size={22}
                  color={activeFilterCount > 0 ? colors.accent.primary : colors.text.secondary}
                />
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          }
        />

        {/* Trial Nudge Banner */}
        <TrialNudgeBanner />

        {/* Contextual Tips */}
        <TipBanner context="pantry" />

        {/* View Mode Tabs — sliding pill animates between red↔green */}
        <View style={styles.viewModeTabs} onLayout={onTabContainerLayout}>
          <Animated.View style={[styles.slidingPill, slidingPillStyle]} />

          <Pressable
            style={styles.viewModeTab}
            onPress={() => handleViewModeSwitch("attention")}
          >
            {attentionCount > 0 && (
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color={viewMode === "attention" ? colors.semantic.danger : colors.text.tertiary}
              />
            )}
            <Text style={[
              styles.viewModeTabText,
              viewMode === "attention" && (attentionCount === 0 ? styles.viewModeTabTextAllGood : styles.viewModeTabTextAttention),
            ]}>
              Needs Restocking
            </Text>
            {attentionCount > 0 ? (
              <View style={[styles.viewModeBadge, viewMode === "attention" && styles.viewModeBadgeAttention]}>
                <Text style={[styles.viewModeBadgeText, viewMode === "attention" && styles.viewModeBadgeTextAttention]}>
                  {attentionCount}
                </Text>
              </View>
            ) : (
              <View style={[styles.viewModeBadge, styles.viewModeBadgeAllGood]}>
                <MaterialCommunityIcons
                  name="check"
                  size={12}
                  color={colors.semantic.success}
                />
              </View>
            )}
          </Pressable>
          <Pressable
            style={styles.viewModeTab}
            onPress={() => handleViewModeSwitch("all")}
          >
            <MaterialCommunityIcons
              name="view-list-outline"
              size={16}
              color={viewMode === "all" ? colors.accent.primary : colors.text.tertiary}
            />
            <Text style={[styles.viewModeTabText, viewMode === "all" && styles.viewModeTabTextActive]}>
              All Items
            </Text>
            <View style={[styles.viewModeBadge, viewMode === "all" && styles.viewModeBadgeActive]}>
              <Text style={[styles.viewModeBadgeText, viewMode === "all" && styles.viewModeBadgeTextActive]}>
                {items.length}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Search field */}
        <View style={styles.searchContainer}>
          <GlassSearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery("")}
            placeholder="Search stock..."
          />
        </View>

        {/* Step 1.5: Virtualized SectionList (replaces both ScrollViews) */}
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={<View style={{ height: 140 + insets.bottom }} />}
          stickySectionHeadersEnabled={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
        />

        {/* Added-to-list Toast */}
        {toastVisible && (
          <AddedToListToast itemName={toastItemName} y={flyStartPosition.y} />
        )}

        {/* Step 1.6: Extracted Modals */}
        <StockFilterModal
          visible={filterVisible}
          onClose={handleCloseFilter}
          stockFilters={stockFilters}
          onToggleFilter={toggleStockFilter}
          onShowAll={showAllFilters}
        />

        <AddPantryItemModal
          visible={addModalVisible}
          onClose={handleCloseAddModal}
        />

        <PantryListPickerModal
          visible={addToListItem !== null}
          itemName={addToListItem?.name ?? ""}
          itemPrice={addToListItem?.lastPrice}
          lists={activeLists ?? []}
          onPickList={handlePickList}
          onClose={handleCloseListPicker}
        />
      </GestureHandlerRootView>

      {/* Gesture Onboarding Overlay */}
      {showGestureOnboarding && <SwipeOnboardingOverlay onDismiss={dismissGestureOnboarding} />}
    </GlassScreen>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  skeletonSection: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  skeletonSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  skeletonTitle: {
    width: 100,
    height: 20,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glass.backgroundStrong,
  },
  skeletonBadge: {
    width: 30,
    height: 20,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.glass.backgroundStrong,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing["2xl"],
  },
  viewModeTabs: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: "hidden",
  },
  viewModeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  slidingPill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: borderRadius.md,
  },
  viewModeTabText: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
    fontSize: 13,
  },
  viewModeTabTextAttention: {
    color: colors.accent.warning,
    fontWeight: "600",
  },
  viewModeTabTextAllGood: {
    color: colors.semantic.success,
    fontWeight: "600",
  },
  viewModeTabTextActive: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
  viewModeBadge: {
    backgroundColor: colors.glass.backgroundHover,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    minWidth: 22,
    alignItems: "center",
  },
  viewModeBadgeAttention: {
    backgroundColor: `${colors.accent.warning}30`,
  },
  viewModeBadgeAllGood: {
    backgroundColor: `${colors.semantic.success}25`,
  },
  viewModeBadgeActive: {
    backgroundColor: `${colors.accent.primary}30`,
  },
  viewModeBadgeText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  viewModeBadgeTextAttention: {
    color: colors.accent.warning,
  },
  viewModeBadgeTextActive: {
    color: colors.accent.primary,
  },
  attentionEmptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing["5xl"],
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  attentionEmptyTitle: {
    ...typography.headlineMedium,
    color: colors.accent.success,
    textAlign: "center",
  },
  attentionEmptySubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: colors.semantic.pantryGlow,
  },
  filterBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: colors.accent.primary,
    borderRadius: borderRadius.sm,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  filterBadgeText: {
    ...typography.labelSmall,
    color: colors.text.inverse,
    fontSize: 10,
  },
  hintRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  categoryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  categoryCountBadge: {
    backgroundColor: colors.glass.backgroundHover,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryCount: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  journeyBanner: {
    marginBottom: spacing.xs,
    borderColor: `${colors.accent.primary}30`,
    borderWidth: 1,
  },
  journeyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  journeyText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    flex: 1,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent.primary}20`,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}40`,
  },
  addButtonText: {
    ...typography.labelMedium,
    color: colors.accent.primary,
    fontWeight: "700",
  },
});
