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
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  LiquidFillIndicator,
  StockLevelPicker,
  FlyToListAnimation,
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

const SCREEN_WIDTH = Dimensions.get("window").width;

const STOCK_LEVELS: { level: StockLevel; label: string; color: string }[] = [
  { level: "stocked", label: "Fully Stocked", color: colors.budget.healthy },
  { level: "good", label: "Good", color: colors.accent.success },
  { level: "low", label: "Running Low", color: colors.budget.caution },
  { level: "out", label: "Out of Stock", color: colors.budget.exceeded },
];

export default function PantryScreen() {
  const insets = useSafeAreaInsets();
  const items = useQuery(api.pantryItems.getByUser);
  const activeLists = useQuery(api.shoppingLists.getActive);
  const updateStockLevel = useMutation(api.pantryItems.updateStockLevel);
  const createList = useMutation(api.shoppingLists.create);
  const addListItem = useMutation(api.listItems.create);
  const migrateIcons = useMutation(api.pantryItems.migrateIcons);

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

  // UI State
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: Id<"pantryItems">;
    name: string;
    category: string;
    stockLevel: StockLevel;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [stockFilters, setStockFilters] = useState<Set<StockLevel>>(
    new Set(["stocked", "good", "low", "out"])
  );

  // Fly animation state
  const [flyAnimationVisible, setFlyAnimationVisible] = useState(false);
  const [flyItemName, setFlyItemName] = useState("");
  const [flyStartPosition, setFlyStartPosition] = useState({ x: 0, y: 0 });

  // Filter items based on search and stock level
  const filteredItems = useMemo(() => {
    if (!items) return [];

    return items.filter((item) => {
      if (!stockFilters.has(item.stockLevel as StockLevel)) return false;
      if (searchQuery.trim()) {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [items, searchQuery, stockFilters]);

  const toggleStockFilter = (level: StockLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleLongPress = (item: {
    _id: Id<"pantryItems">;
    name: string;
    category: string;
    stockLevel: string;
  }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedItem({
      id: item._id,
      name: item.name,
      category: item.category,
      stockLevel: item.stockLevel as StockLevel,
    });
    setPickerVisible(true);
  };

  // Auto-add "out" item to shopping list with fly animation
  const autoAddToShoppingList = async (
    item: { _id: Id<"pantryItems">; name: string; category: string },
    startPos?: { x: number; y: number }
  ) => {
    try {
      if (startPos) {
        setFlyItemName(item.name);
        setFlyStartPosition(startPos);
        setFlyAnimationVisible(true);
      }

      let listId: Id<"shoppingLists">;

      if (activeLists && activeLists.length > 0) {
        listId = activeLists[0]._id;
      } else {
        const listName = `Shopping List ${new Date().toLocaleDateString()}`;
        listId = await createList({
          name: listName,
          budget: 50,
          budgetLocked: false,
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

  const handleFlyAnimationComplete = useCallback(() => {
    setFlyAnimationVisible(false);
  }, []);

  const handleSelectStockLevel = async (level: StockLevel) => {
    if (!selectedItem) return;

    setPickerVisible(false);

    try {
      await updateStockLevel({ id: selectedItem.id, stockLevel: level });

      if (level === "out" && selectedItem.stockLevel !== "out") {
        const pos = itemPositions[selectedItem.id as string];
        await autoAddToShoppingList(
          {
            _id: selectedItem.id,
            name: selectedItem.name,
            category: selectedItem.category,
          },
          pos || { x: SCREEN_WIDTH / 2, y: 300 }
        );
      }
    } catch (error) {
      console.error("Failed to update stock level:", error);
    }

    setSelectedItem(null);
  };

  const handleClosePicker = () => {
    setPickerVisible(false);
    setSelectedItem(null);
  };

  // Swipe to decrease stock level
  const getNextLowerLevel = (current: StockLevel): StockLevel | null => {
    const order: StockLevel[] = ["stocked", "good", "low", "out"];
    const currentIndex = order.indexOf(current);
    if (currentIndex < order.length - 1) {
      return order[currentIndex + 1];
    }
    return null;
  };

  const handleSwipeDecrease = async (item: {
    _id: Id<"pantryItems">;
    name: string;
    category: string;
    stockLevel: string;
  }) => {
    const nextLevel = getNextLowerLevel(item.stockLevel as StockLevel);
    if (!nextLevel) return;

    if (nextLevel === "out") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

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

  // Loading state with skeletons
  if (items === undefined) {
    return (
      <GlassScreen edges={["top"]}>
        <SimpleHeader title="My Pantry" subtitle="Loading..." />
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
        <SimpleHeader title="My Pantry" subtitle="0 items" />
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

  const activeFilterCount = 4 - stockFilters.size;

  return (
    <GlassScreen edges={["top"]}>
      <GestureHandlerRootView style={styles.container}>
        {/* Header */}
        <SimpleHeader
          title="My Pantry"
          subtitle={`${filteredItems.length} of ${items.length} items${searchQuery ? ` matching "${searchQuery}"` : ""}`}
          rightElement={
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
          }
        />

        {/* Search */}
        <View style={styles.searchContainer}>
          <GlassSearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery("")}
            placeholder="Search pantry..."
          />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {Object.entries(groupedItems).map(([category, categoryItems]) => {
            const isCollapsed = collapsedCategories.has(category);

            const toggleCategory = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                        onLongPress={() => handleLongPress(item)}
                        onSwipeDecrease={() => handleSwipeDecrease(item)}
                        onMeasure={(x, y) => handleItemMeasure(item._id as string, x, y)}
                        animationDelay={index * 50}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Stock Level Picker */}
        <StockLevelPicker
          visible={pickerVisible}
          currentLevel={selectedItem?.stockLevel || "stocked"}
          itemName={selectedItem?.name || ""}
          onSelect={handleSelectStockLevel}
          onClose={handleClosePicker}
        />

        {/* Fly Animation */}
        <FlyToListAnimation
          visible={flyAnimationVisible}
          itemName={flyItemName}
          startPosition={flyStartPosition}
          onAnimationComplete={handleFlyAnimationComplete}
        />

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
                    <LiquidFillIndicator level={option.level} size="small" />
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
                    setStockFilters(new Set(["stocked", "good", "low", "out"]));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      </GestureHandlerRootView>
    </GlassScreen>
  );
}

// Pantry Item Row Component
function PantryItemRow({
  item,
  onLongPress,
  onSwipeDecrease,
  onMeasure,
  animationDelay = 0,
}: {
  item: {
    _id: Id<"pantryItems">;
    name: string;
    category: string;
    stockLevel: string;
    icon?: string;
  };
  onLongPress: () => void;
  onSwipeDecrease: () => void;
  onMeasure: (x: number, y: number) => void;
  animationDelay?: number;
}) {
  const swipeableRef = useRef<Swipeable>(null);
  const cardRef = useRef<View>(null);

  const handleLongPress = () => {
    if (cardRef.current) {
      cardRef.current.measure((x, y, width, height, pageX, pageY) => {
        onMeasure(pageX + width / 2, pageY + height / 2);
      });
    }
    onLongPress();
  };

  const handleSwipeOpen = () => {
    onSwipeDecrease();
    setTimeout(() => {
      swipeableRef.current?.close();
    }, 300);
  };

  const getNextLowerLevel = (current: string): StockLevel | null => {
    const order: StockLevel[] = ["stocked", "good", "low", "out"];
    const currentIndex = order.indexOf(current as StockLevel);
    if (currentIndex < order.length - 1) {
      return order[currentIndex + 1];
    }
    return null;
  };

  const nextLevel = getNextLowerLevel(item.stockLevel);

  const renderRightActions = () => {
    if (!nextLevel) return null;

    return (
      <View style={styles.swipeAction}>
        <LiquidFillIndicator level={nextLevel} size="medium" showWave />
        <Text style={styles.swipeActionLabel}>{nextLevel === "out" ? "Out!" : "Lower"}</Text>
      </View>
    );
  };

  const iconName = getSafeIcon(item.icon, item.category) as keyof typeof MaterialCommunityIcons.glyphMap;

  return (
    <Animated.View
      entering={FadeIn.delay(animationDelay).duration(200)}
      exiting={FadeOut.duration(150)}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        onSwipeableOpen={handleSwipeOpen}
        overshootRight={false}
        rightThreshold={80}
      >
        <TouchableOpacity
          ref={cardRef}
          onLongPress={handleLongPress}
          delayLongPress={400}
          activeOpacity={0.8}
        >
          <GlassCard style={styles.itemCard}>
            {/* Liquid fill indicator */}
            <LiquidFillIndicator level={item.stockLevel as StockLevel} size="small" showWave={false} />

            {/* Item info */}
            <View style={styles.itemInfo}>
              <View style={styles.itemNameRow}>
                <View style={styles.itemIconContainer}>
                  <MaterialCommunityIcons name={iconName} size={18} color={colors.text.secondary} />
                </View>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <Text style={styles.stockLevelText}>
                {item.stockLevel === "stocked" && "Fully stocked"}
                {item.stockLevel === "good" && "Good supply"}
                {item.stockLevel === "low" && "Running low"}
                {item.stockLevel === "out" && "Out of stock"}
              </Text>
            </View>

            {/* Hold hint */}
            <View style={styles.holdHint}>
              <Text style={styles.holdHintText}>Hold</Text>
            </View>
          </GlassCard>
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
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
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 2,
  },
  itemIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.glass.backgroundHover,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: {
    ...typography.bodyLarge,
    fontWeight: "600",
    color: colors.text.primary,
    flex: 1,
  },
  stockLevelText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginLeft: 36,
  },
  holdHint: {
    backgroundColor: colors.glass.backgroundHover,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  holdHintText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  swipeAction: {
    backgroundColor: colors.budget.cautionGlow,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: borderRadius.lg,
    marginLeft: spacing.sm,
    paddingVertical: spacing.sm,
  },
  swipeActionLabel: {
    ...typography.labelSmall,
    color: colors.budget.caution,
    marginTop: spacing.xs,
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
    backgroundColor: colors.semantic.pantryGlow,
    borderColor: colors.accent.primary,
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
});
