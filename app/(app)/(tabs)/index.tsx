import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
  TextInput,
  Alert,
  Platform,
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
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  GaugeIndicator,
  STOCK_LEVEL_ORDER,
  type StockLevel,
} from "@/components/pantry";
import { getSafeIcon } from "@/lib/icons/iconMatcher";

// Glass UI Components
import {
  GlassScreen,
  GlassCard,
  GlassSearchInput,
  GlassButton,
  SimpleHeader,
  SkeletonPantryItem,
  EmptyPantry,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { RemoveButton } from "@/components/ui/RemoveButton";

const SCREEN_WIDTH = Dimensions.get("window").width;

type PantryViewMode = "attention" | "all";

const STOCK_CATEGORIES = [
  "Dairy", "Bakery", "Produce", "Meat", "Pantry Staples", "Spices & Seasonings",
  "Condiments", "Beverages", "Snacks", "Frozen", "Canned Goods", "Grains & Pasta",
  "Oils & Vinegars", "Baking", "Household", "Personal Care", "Health & Wellness",
];

const STOCK_LEVELS: { level: StockLevel; label: string; color: string }[] = [
  { level: "stocked", label: "Stocked", color: colors.budget.healthy },
  { level: "low", label: "Running Low", color: colors.budget.caution },
  { level: "out", label: "Out of Stock", color: colors.budget.exceeded },
];

export default function PantryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useQuery(api.pantryItems.getByUser);
  const activeLists = useQuery(api.shoppingLists.getActive);
  const updateStockLevel = useMutation(api.pantryItems.updateStockLevel);
  const createList = useMutation(api.shoppingLists.create);
  const addListItem = useMutation(api.listItems.create);
  const migrateIcons = useMutation(api.pantryItems.migrateIcons);
  const createPantryItem = useMutation(api.pantryItems.create);
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
  const hasInteracted = useRef(false);

  // Sliding pill animation: 0 = attention (left), 1 = all (right)
  const tabProgress = useSharedValue(0);
  const tabPillWidth = useSharedValue(0);

  const onTabContainerLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    // Container inner width minus padding (4px each side)
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
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Pantry Staples");
  const [newItemStock, setNewItemStock] = useState<StockLevel>("stocked");

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

  // Toast position (card Y coordinate)
  const [flyStartPosition, setFlyStartPosition] = useState({ x: 0, y: 0 });

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastItemName, setToastItemName] = useState("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive unique categories from items
  const categories = useMemo(() => {
    if (!items) return [];
    const cats = new Set(items.map((item) => item.category));
    return [...cats].sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Count items needing restocking (Low + Out) for badge
  const attentionCount = useMemo(() => {
    if (!items) return 0;
    return items.filter(
      (item) => item.stockLevel === "low" || item.stockLevel === "out"
    ).length;
  }, [items]);

  // Count items completely out of stock (for journey prompt)
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

  // Filter items based on view mode, search, stock level, and category
  const filteredItems = useMemo(() => {
    if (!items) return [];

    return items.filter((item) => {
      // In attention mode, only show low + out items
      if (viewMode === "attention") {
        if (item.stockLevel !== "low" && item.stockLevel !== "out") return false;
      } else {
        // In "all" mode, respect manual stock filters
        if (!stockFilters.has(item.stockLevel as StockLevel)) return false;
      }
      if (searchQuery.trim()) {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [items, searchQuery, stockFilters, viewMode]);

  const toggleStockFilter = (level: StockLevel) => {
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
  };

  // Position tracking for fly animation
  const [itemPositions, setItemPositions] = useState<Record<string, { x: number; y: number }>>({});

  const handleItemMeasure = useCallback((itemId: string, x: number, y: number) => {
    setItemPositions((prev) => ({ ...prev, [itemId]: { x, y } }));
  }, []);

  // Auto-add "out" item to shopping list with toast
  const autoAddToShoppingList = async (
    item: { _id: Id<"pantryItems">; name: string; category: string },
    startPos?: { x: number; y: number }
  ) => {
    try {
      if (startPos) {
        setFlyStartPosition(startPos);
      }
      showToast(item.name);

      let listId: Id<"shoppingLists">;

      if (activeLists && activeLists.length > 0) {
        listId = activeLists[0]._id;
      } else {
        const listName = `Shopping List ${new Date().toLocaleDateString()}`;
        listId = await createList({
          name: listName,
          budget: 50,
        });
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
  };

  const showToast = useCallback((itemName: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastItemName(itemName);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  }, []);

  const handleAddItem = async () => {
    const name = newItemName.trim();
    if (!name) return;
    impactAsync(ImpactFeedbackStyle.Medium);
    try {
      await createPantryItem({
        name,
        category: newItemCategory,
        stockLevel: newItemStock,
      });
      notificationAsync(NotificationFeedbackType.Success);
      setAddModalVisible(false);
      setNewItemName("");
      setNewItemCategory("Pantry Staples");
      setNewItemStock("stocked");
    } catch (error) {
      console.error("Failed to add item:", error);
    }
  };

  const handleRemoveItem = (item: { _id: Id<"pantryItems">; name: string }) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    const doRemove = async () => {
      try {
        await removePantryItem({ id: item._id });
        notificationAsync(NotificationFeedbackType.Success);
      } catch (error) {
        console.error("Failed to remove item:", error);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Remove "${item.name}" from your stock?`)) {
        doRemove();
      }
    } else {
      Alert.alert("Remove Item", `Remove "${item.name}" from your stock?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doRemove },
      ]);
    }
  };

  // Get next lower stock level
  const getNextLowerLevel = (current: StockLevel): StockLevel | null => {
    const currentIndex = STOCK_LEVEL_ORDER.indexOf(current);
    if (currentIndex > 0) {
      return STOCK_LEVEL_ORDER[currentIndex - 1];
    }
    return null;
  };

  // Get next higher stock level
  const getNextHigherLevel = (current: StockLevel): StockLevel | null => {
    const currentIndex = STOCK_LEVEL_ORDER.indexOf(current);
    if (currentIndex < STOCK_LEVEL_ORDER.length - 1) {
      return STOCK_LEVEL_ORDER[currentIndex + 1];
    }
    return null;
  };

  const handleSwipeDecrease = async (item: {
    _id: Id<"pantryItems">;
    name: string;
    category: string;
    stockLevel: string;
  }) => {
    if (showGestureOnboarding) dismissGestureOnboarding();
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
        const pos = itemPositions[item._id as string];
        await autoAddToShoppingList(item, pos || { x: SCREEN_WIDTH / 2, y: 300 });
      }
    } catch (error) {
      console.error("Failed to decrease stock:", error);
    }
  };

  const handleSwipeIncrease = async (item: {
    _id: Id<"pantryItems">;
    name: string;
    category: string;
    stockLevel: string;
  }) => {
    if (showGestureOnboarding) dismissGestureOnboarding();
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
  };

  // Loading state with skeletons
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

  // Empty state
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

  // Group filtered items by category
  const groupedItems: Record<string, typeof filteredItems> = {};
  filteredItems.forEach((item) => {
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = [];
    }
    groupedItems[item.category].push(item);
  });

  const activeFilterCount = 5 - stockFilters.size;

  const handleViewModeSwitch = (mode: PantryViewMode) => {
    if (mode === viewMode) return;
    hasInteracted.current = true;
    impactAsync(ImpactFeedbackStyle.Light);
    setViewMode(mode);
    // Spring the pill — overshoot is clipped by container overflow: hidden
    tabProgress.value = withSpring(mode === "all" ? 1 : 0, {
      damping: 18,
      stiffness: 180,
    });
    // Reset filters when switching modes
    setSearchQuery("");
    // Collapse all categories in "all" mode so only headers render (fast)
    if (mode === "all" && categories.length > 0) {
      setCollapsedCategories(new Set(categories));
    }
  };

  return (
    <GlassScreen edges={["top"]}>
      <GestureHandlerRootView style={styles.container}>
        {/* Header */}
        <SimpleHeader
          title="My Stock"
          accentColor={colors.semantic.pantry}
          subtitle={
            viewMode === "attention"
              ? `${attentionCount} item${attentionCount !== 1 ? "s" : ""} need restocking`
              : `What you have at home · ${filteredItems.length} of ${items.length} items${searchQuery ? ` matching "${searchQuery}"` : ""}`
          }
          rightElement={
            <View style={styles.headerButtons}>
              <Pressable
                style={styles.addButton}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setAddModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="plus" size={18} color={colors.accent.primary} />
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
              {viewMode === "all" && (
                <Pressable
                  style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
                  onPress={() => setFilterVisible(true)}
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
              )}
            </View>
          }
        />

        {/* View Mode Tabs — sliding pill animates between red↔green */}
        <View style={styles.viewModeTabs} onLayout={onTabContainerLayout}>
          {/* Sliding pill indicator */}
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

        {/* Search & filters — only in "all" mode */}
        {viewMode === "all" && (
          <>
            <View style={styles.searchContainer}>
              <GlassSearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={() => setSearchQuery("")}
                placeholder="Search stock..."
              />
            </View>

            <View style={styles.hintRow}>
              <TypewriterHint text="Swipe left/right to adjust stock level" />
            </View>
          </>
        )}

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {viewMode === "attention" ? (
            // Attention mode: flat list, no category grouping
            filteredItems.length === 0 ? (
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
            ) : (
              <View style={styles.itemList}>
                {/* Journey prompt: bridge Stock → Lists */}
                {outCount > 0 && (
                  <Pressable
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      router.navigate("/(app)/(tabs)/lists" as any);
                    }}
                  >
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
                {filteredItems.map((item, index) => (
                  <PantryItemRow
                    key={item._id}
                    item={item}
                    onSwipeDecrease={() => handleSwipeDecrease(item)}
                    onSwipeIncrease={() => handleSwipeIncrease(item)}
                    onMeasure={(x, y) => handleItemMeasure(item._id as string, x, y)}
                    onRemove={() => handleRemoveItem(item)}
                    animationDelay={hasInteracted.current ? 0 : index * 50}
                  />
                ))}
              </View>
            )
          ) : (
            // All Items mode: grouped by category with collapsible sections
            Object.entries(groupedItems).map(([category, categoryItems]) => {
              const isCollapsed = collapsedCategories.has(category);

              const toggleCategory = () => {
                impactAsync(ImpactFeedbackStyle.Light);
                setCollapsedCategories((prev) => {
                  const newSet = new Set(prev);
                  if (newSet.has(category)) {
                    newSet.delete(category);
                  } else {
                    newSet.add(category);
                  }
                  return newSet;
                });
              };

              return (
                <View key={category} style={styles.categorySection}>
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    onPress={toggleCategory}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryTitleRow}>
                      <Text style={styles.categoryTitle}>{category}</Text>
                      <View style={styles.categoryCountBadge}>
                        <Text style={styles.categoryCount}>{categoryItems.length}</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons
                      name={isCollapsed ? "chevron-right" : "chevron-down"}
                      size={24}
                      color={colors.text.tertiary}
                    />
                  </TouchableOpacity>

                  {!isCollapsed && (
                    <View style={styles.itemList}>
                      {categoryItems.map((item, index) => (
                        <PantryItemRow
                          key={item._id}
                          item={item}
                          onSwipeDecrease={() => handleSwipeDecrease(item)}
                          onSwipeIncrease={() => handleSwipeIncrease(item)}
                          onMeasure={(x, y) => handleItemMeasure(item._id as string, x, y)}
                          onRemove={() => handleRemoveItem(item)}
                          animationDelay={hasInteracted.current ? 0 : index * 50}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Added-to-list Toast */}
        {toastVisible && (
          <AddedToListToast itemName={toastItemName} y={flyStartPosition.y} />
        )}

        {/* Filter Modal */}
        <Modal
          visible={filterVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setFilterVisible(false)}>
            <GlassCard variant="elevated" style={styles.filterModal}>
              <Text style={styles.filterTitle}>Filter by Stock Level</Text>
              <Text style={styles.filterSubtitle}>Select which levels to show</Text>

              <View style={styles.filterOptions}>
                {STOCK_LEVELS.map((option) => (
                  <TouchableOpacity
                    key={option.level}
                    style={[
                      styles.filterOption,
                      stockFilters.has(option.level) && styles.filterOptionSelected,
                    ]}
                    onPress={() => toggleStockFilter(option.level)}
                    activeOpacity={0.7}
                  >
                    <GaugeIndicator level={option.level} size="small" />
                    <Text style={styles.filterOptionLabel}>{option.label}</Text>
                    {stockFilters.has(option.level) && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={22}
                        color={colors.accent.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.filterActions}>
                <GlassButton
                  variant="ghost"
                  size="md"
                  onPress={() => {
                    setStockFilters(new Set<StockLevel>(["stocked", "low", "out"]));
                    impactAsync(ImpactFeedbackStyle.Light);
                  }}
                >
                  Show All
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="md"
                  onPress={() => setFilterVisible(false)}
                >
                  Done
                </GlassButton>
              </View>
            </GlassCard>
          </Pressable>
        </Modal>

        {/* Add Item Modal */}
        <Modal
          visible={addModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
            <Pressable style={styles.addModal} onPress={(e) => e.stopPropagation()}>
              <MaterialCommunityIcons name="fridge-outline" size={36} color={colors.accent.primary} />
              <Text style={styles.addModalTitle}>Add to Stock</Text>

              {/* Name input */}
              <TextInput
                style={styles.addInput}
                placeholder="Item name (e.g. Olive Oil)"
                placeholderTextColor={colors.text.tertiary}
                value={newItemName}
                onChangeText={setNewItemName}
                autoFocus
                maxLength={80}
              />

              {/* Category picker */}
              <Text style={styles.addLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.addChipsScroll}
                contentContainerStyle={styles.addChipsContent}
              >
                {STOCK_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.addChip, newItemCategory === cat && styles.addChipActive]}
                    onPress={() => setNewItemCategory(cat)}
                  >
                    <Text style={[styles.addChipText, newItemCategory === cat && styles.addChipTextActive]}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Stock level picker */}
              <Text style={styles.addLabel}>Stock Level</Text>
              <View style={styles.addStockRow}>
                {STOCK_LEVELS.map((option) => (
                  <Pressable
                    key={option.level}
                    style={[styles.addStockChip, newItemStock === option.level && styles.addStockChipActive]}
                    onPress={() => setNewItemStock(option.level)}
                  >
                    <GaugeIndicator level={option.level} size="small" />
                    <Text style={[
                      styles.addStockChipText,
                      newItemStock === option.level && styles.addStockChipTextActive,
                    ]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Actions */}
              <View style={styles.addActions}>
                <GlassButton variant="ghost" size="md" onPress={() => setAddModalVisible(false)}>
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="md"
                  icon="plus"
                  onPress={handleAddItem}
                  disabled={!newItemName.trim()}
                >
                  Add Item
                </GlassButton>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </GestureHandlerRootView>

      {/* Gesture Onboarding Overlay */}
      {showGestureOnboarding && <SwipeOnboardingOverlay onDismiss={dismissGestureOnboarding} />}
    </GlassScreen>
  );
}

// =============================================================================
// SWIPE ONBOARDING OVERLAY
// =============================================================================

function SwipeOnboardingOverlay({ onDismiss }: { onDismiss: () => void }) {
  const handX = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    // Fade in
    overlayOpacity.value = withTiming(1, { duration: 300 });
    // Animate hand sliding left and right repeatedly
    handX.value = withRepeat(
      withSequence(
        withTiming(40, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(-40, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite
      false,
    );
  }, []);

  const handStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: handX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <Animated.View style={[onboardingStyles.overlay, overlayStyle]}>
      <Pressable style={onboardingStyles.backdrop} onPress={onDismiss} />
      <View style={onboardingStyles.content}>
        <Animated.View style={[onboardingStyles.handContainer, handStyle]}>
          <MaterialCommunityIcons
            name="gesture-swipe-horizontal"
            size={48}
            color={colors.accent.primary}
          />
        </Animated.View>
        <Text style={onboardingStyles.title}>Swipe to adjust stock</Text>
        <Text style={onboardingStyles.subtitle}>
          Swipe any item left or right to change its stock level
        </Text>
        <Pressable style={onboardingStyles.gotItButton} onPress={onDismiss}>
          <Text style={onboardingStyles.gotItText}>Got it</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const onboardingStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  handContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  gotItButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  gotItText: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
});

// Pantry Item Row Component — uses GestureDetector instead of Swipeable
function PantryItemRow({
  item,
  onSwipeDecrease,
  onSwipeIncrease,
  onMeasure,
  onRemove,
  animationDelay = 0,
}: {
  item: {
    _id: Id<"pantryItems">;
    name: string;
    category: string;
    stockLevel: string;
    icon?: string;
    lastPrice?: number;
    priceSource?: string;
    lastStoreName?: string;
  };
  onSwipeDecrease: () => void;
  onSwipeIncrease: () => void;
  onMeasure: (x: number, y: number) => void;
  onRemove: () => void;
  animationDelay?: number;
}) {
  const cardRef = useRef<View>(null);

  // Pan gesture — card does NOT move, only triggers stock level change
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onEnd((e) => {
      if (e.translationX < -50) {
        // Swiped left → decrement
        runOnJS(onSwipeDecrease)();
      } else if (e.translationX > 50) {
        // Swiped right → increment
        runOnJS(onSwipeIncrease)();
      }
    });

  const iconName = getSafeIcon(item.icon, item.category) as keyof typeof MaterialCommunityIcons.glyphMap;

  const stockLabel =
    item.stockLevel === "stocked"
      ? "Stocked"
      : item.stockLevel === "low"
        ? "Running low"
        : "Out of stock";

  return (
    <Animated.View
      entering={FadeIn.delay(animationDelay).duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.itemRowContainer}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View>
          <View ref={cardRef} collapsable={false}>
            <GlassCard style={styles.itemCard}>
              {/* Gauge indicator */}
              <GaugeIndicator level={item.stockLevel as StockLevel} size="small" />

              {/* Item info */}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.itemSubRow}>
                  <Text style={styles.stockLevelText}>{stockLabel}</Text>
                  {item.lastPrice != null && (
                    <Text style={styles.itemPriceLabel}>
                      £{item.lastPrice.toFixed(2)}
                      {item.priceSource === "ai_estimate"
                        ? " est."
                        : item.priceSource === "receipt" && item.lastStoreName
                          ? ` at ${item.lastStoreName}`
                          : ""}
                    </Text>
                  )}
                </View>
              </View>

              {/* Remove button */}
              <RemoveButton onPress={onRemove} size="sm" />
            </GlassCard>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// ── Typewriter hint with glow on current letter ─────────────────────
const TYPEWRITER_SPEED = 60; // ms per character
const GLOW_COLOR = colors.accent.primary;
const DIM_COLOR = colors.text.disabled;

function TypewriterHint({ text }: { text: string }) {
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (charIndex < text.length) {
      const timer = setTimeout(() => {
        setCharIndex((i) => i + 1);
      }, TYPEWRITER_SPEED);
      return () => clearTimeout(timer);
    } else if (!done) {
      const timer = setTimeout(() => setDone(true), 400);
      return () => clearTimeout(timer);
    } else {
      // Wait 4 seconds then restart
      const timer = setTimeout(() => {
        setDone(false);
        setCharIndex(0);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [charIndex, text.length, done]);

  return (
    <Text style={styles.hintText}>
      {text.split("").map((char, i) => {
        const isActive = !done && i === charIndex - 1;
        const isVisible = i < charIndex;
        return (
          <Text
            key={i}
            style={{
              color: isActive ? GLOW_COLOR : isVisible ? DIM_COLOR : "transparent",
              fontWeight: isActive ? "700" : "400",
              textShadowColor: isActive ? GLOW_COLOR : "transparent",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: isActive ? 6 : 0,
            }}
          >
            {char}
          </Text>
        );
      })}
    </Text>
  );
}

// ── Added-to-list burst toast — appears right on the swiped card ─────
function AddedToListToast({ itemName, y }: { itemName: string; y: number }) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(1);
  const ring = useSharedValue(0);

  useEffect(() => {
    // Burst in
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    // Ring burst
    ring.value = withTiming(1, { duration: 600 });
    // Fade out
    opacity.value = withDelay(1600, withTiming(0, { duration: 400 }));
  }, []);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - ring.value) * opacity.value,
    transform: [{ scaleX: 1 + ring.value * 2 }, { scaleY: 1 + ring.value }],
  }));

  return (
    <View
      style={{
        position: "absolute",
        top: y - 24,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 9999,
        elevation: 9999,
      }}
      pointerEvents="none"
    >
      {/* Ring burst */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 100,
            height: 44,
            borderRadius: 22,
            borderWidth: 2,
            borderColor: colors.accent.success,
          },
          ringStyle,
        ]}
      />
      {/* Pill */}
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.background.primary,
            borderWidth: 1.5,
            borderColor: colors.accent.success,
            borderRadius: 22,
            paddingVertical: 10,
            paddingHorizontal: 18,
            gap: 8,
          },
          pillStyle,
        ]}
      >
        <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent.success} />
        <Text style={{ color: colors.text.primary, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>
          {itemName} added to list
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Skeleton loading styles
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
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
    borderRadius: 6,
    backgroundColor: colors.glass.backgroundStrong,
  },
  skeletonBadge: {
    width: 30,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.glass.backgroundStrong,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing["2xl"],
  },
  // View mode tabs
  viewModeTabs: {
    flexDirection: "row",
    marginHorizontal: spacing.xl,
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
    // width, translateX, backgroundColor driven by animated style
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
    paddingHorizontal: 6,
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
  // Attention mode empty state
  attentionEmptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing["5xl"],
    paddingHorizontal: spacing.xl,
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
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    ...typography.labelSmall,
    color: colors.text.inverse,
    fontSize: 10,
  },
  hintRow: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  hintText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textAlign: "center",
    fontSize: 11,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
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
  itemList: {
    gap: spacing.md,
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
  itemRowContainer: {
    borderRadius: borderRadius.lg,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.lg,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
    color: colors.text.primary,
  },
  stockLevelText: {
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 24,
    color: colors.text.tertiary,
  },
  itemSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemPriceLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.accent.primary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  filterModal: {
    width: "100%",
    maxWidth: 340,
    padding: spacing.xl,
  },
  filterTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  filterSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  filterOptions: {
    gap: spacing.md,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: "transparent",
    gap: spacing.md,
  },
  filterOptionSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  filterOptionLabel: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    flex: 1,
  },
  filterActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  // Header buttons
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
    borderRadius: 19,
    backgroundColor: `${colors.accent.primary}20`,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}40`,
  },
  addButtonText: {
    ...typography.labelMedium,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  // Add item modal
  addModal: {
    width: "92%",
    maxWidth: 400,
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.borderFocus,
  },
  addModalTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
  },
  addInput: {
    width: "100%",
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  addLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    alignSelf: "flex-start",
  },
  addChipsScroll: {
    width: "100%",
    maxHeight: 40,
  },
  addChipsContent: {
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  addChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  addChipActive: {
    backgroundColor: `${colors.accent.primary}20`,
    borderColor: colors.accent.primary,
  },
  addChipText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  addChipTextActive: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
  addStockRow: {
    width: "100%",
    gap: spacing.xs,
  },
  addStockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  addStockChipActive: {
    backgroundColor: `${colors.accent.primary}15`,
    borderColor: colors.accent.primary,
  },
  addStockChipText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  addStockChipTextActive: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
  addActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
