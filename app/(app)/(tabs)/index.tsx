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
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  GaugeIndicator,
  StockLevelPicker,
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
import { CategoryFilter } from "@/components/ui/CategoryFilter";
import { RemoveButton } from "@/components/ui/RemoveButton";

const SCREEN_WIDTH = Dimensions.get("window").width;

const STOCK_CATEGORIES = [
  "Dairy", "Bakery", "Produce", "Meat", "Pantry Staples", "Spices & Seasonings",
  "Condiments", "Beverages", "Snacks", "Frozen", "Canned Goods", "Grains & Pasta",
  "Oils & Vinegars", "Baking", "Household", "Personal Care", "Health & Wellness",
];

const STOCK_LEVELS: { level: StockLevel; label: string; color: string }[] = [
  { level: "stocked", label: "Fully Stocked", color: colors.budget.healthy },
  { level: "good", label: "Good", color: colors.accent.success },
  { level: "half", label: "Half", color: "#EAB308" },
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
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [stockFilters, setStockFilters] = useState<Set<StockLevel>>(
    new Set(["stocked", "good", "half", "low", "out"])
  );

  // Add item modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Pantry Staples");
  const [newItemStock, setNewItemStock] = useState<StockLevel>("stocked");

  // Toast position (card Y coordinate)
  const [flyStartPosition, setFlyStartPosition] = useState({ x: 0, y: 0 });

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastItemName, setToastItemName] = useState("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive unique categories from items
  const { categories, categoryCounts } = useMemo(() => {
    if (!items) return { categories: [], categoryCounts: {} };
    const countMap: Record<string, number> = {};
    items.forEach((item) => {
      countMap[item.category] = (countMap[item.category] || 0) + 1;
    });
    const sorted = Object.keys(countMap).sort((a, b) => a.localeCompare(b));
    return { categories: sorted, categoryCounts: countMap };
  }, [items]);

  // Filter items based on search, stock level, and category
  const filteredItems = useMemo(() => {
    if (!items) return [];

    return items.filter((item) => {
      if (!stockFilters.has(item.stockLevel as StockLevel)) return false;
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [items, searchQuery, stockFilters, categoryFilter]);

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

  const handleLongPress = (item: {
    _id: Id<"pantryItems">;
    name: string;
    category: string;
    stockLevel: string;
  }) => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    setSelectedItem({
      id: item._id,
      name: item.name,
      category: item.category,
      stockLevel: item.stockLevel as StockLevel,
    });
    setPickerVisible(true);
  };

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

  const showToast = useCallback((itemName: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastItemName(itemName);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2200);
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
        <SimpleHeader title="My Stock" subtitle="What you have at home · Loading..." />
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
        <SimpleHeader title="My Stock" subtitle="What you have at home · 0 items" />
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

  return (
    <GlassScreen edges={["top"]}>
      <GestureHandlerRootView style={styles.container}>
        {/* Header */}
        <SimpleHeader
          title="My Stock"
          subtitle={`What you have at home · ${filteredItems.length} of ${items.length} items${searchQuery ? ` matching "${searchQuery}"` : ""}`}
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
            </View>
          }
        />

        {/* Search */}
        <View style={styles.searchContainer}>
          <GlassSearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery("")}
            placeholder="Search stock..."
          />
        </View>

        {/* Category filter chips */}
        <CategoryFilter
          categories={categories}
          selected={categoryFilter}
          onSelect={setCategoryFilter}
          counts={categoryCounts}
        />

        {/* Gesture hints */}
        <View style={styles.hintRow}>
          <TypewriterHint text="Swipe left/right to adjust  ·  Hold to set level or remove" />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {Object.entries(groupedItems).map(([category, categoryItems]) => {
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
                        onLongPress={() => handleLongPress(item)}
                        onSwipeDecrease={() => handleSwipeDecrease(item)}
                        onSwipeIncrease={() => handleSwipeIncrease(item)}
                        onMeasure={(x, y) => handleItemMeasure(item._id as string, x, y)}
                        onRemove={() => handleRemoveItem(item)}
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
          onRemove={selectedItem ? () => {
            setPickerVisible(false);
            handleRemoveItem({ _id: selectedItem.id, name: selectedItem.name });
            setSelectedItem(null);
          } : undefined}
        />

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
                    setStockFilters(new Set(["stocked", "good", "half", "low", "out"]));
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
    </GlassScreen>
  );
}

// Pantry Item Row Component — uses GestureDetector instead of Swipeable
function PantryItemRow({
  item,
  onLongPress,
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
  };
  onLongPress: () => void;
  onSwipeDecrease: () => void;
  onSwipeIncrease: () => void;
  onMeasure: (x: number, y: number) => void;
  onRemove: () => void;
  animationDelay?: number;
}) {
  const cardRef = useRef<View>(null);

  const handleLongPress = () => {
    if (cardRef.current) {
      cardRef.current.measure((x, y, width, height, pageX, pageY) => {
        onMeasure(pageX + width / 2, pageY + height / 2);
      });
    }
    onLongPress();
  };

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

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      runOnJS(handleLongPress)();
    });

  const composedGesture = Gesture.Race(panGesture, longPressGesture);

  const iconName = getSafeIcon(item.icon, item.category) as keyof typeof MaterialCommunityIcons.glyphMap;

  const stockLabel =
    item.stockLevel === "stocked"
      ? "Fully stocked"
      : item.stockLevel === "good"
        ? "Good supply"
        : item.stockLevel === "half"
          ? "Half stocked"
          : item.stockLevel === "low"
            ? "Running low"
            : "Out of stock";

  return (
    <Animated.View
      entering={FadeIn.delay(animationDelay).duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.itemRowContainer}
    >
      <GestureDetector gesture={composedGesture}>
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
                <Text style={styles.stockLevelText}>{stockLabel}</Text>
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
const GLOW_COLOR = "#00D4AA";
const DIM_COLOR = "rgba(255, 255, 255, 0.3)";

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
            borderColor: "#10B981",
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
            backgroundColor: "#0B1426",
            borderWidth: 1.5,
            borderColor: "#10B981",
            borderRadius: 22,
            paddingVertical: 10,
            paddingHorizontal: 18,
            gap: 8,
          },
          pillStyle,
        ]}
      >
        <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }} numberOfLines={1}>
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
  itemRowContainer: {
    borderRadius: borderRadius.lg,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    color: colors.text.primary,
  },
  stockLevelText: {
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 24,
    color: colors.text.tertiary,
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
