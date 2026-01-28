import React, { useState, useMemo, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, Modal, Pressable, TextInput } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
  LiquidFillIndicator,
  StockLevelPicker,
  FlyToListAnimation,
  type StockLevel,
} from "@/components/pantry";

const SCREEN_WIDTH = Dimensions.get("window").width;

const STOCK_LEVELS: { level: StockLevel; label: string; color: string; emoji: string }[] = [
  { level: "stocked", label: "Fully Stocked", color: "#10B981", emoji: "🟢" },
  { level: "good", label: "Good", color: "#34D399", emoji: "🟡" },
  { level: "low", label: "Running Low", color: "#F59E0B", emoji: "🟠" },
  { level: "out", label: "Out of Stock", color: "#EF4444", emoji: "🔴" },
];

export default function PantryScreen() {
  const items = useQuery(api.pantryItems.getByUser);
  const activeLists = useQuery(api.shoppingLists.getActive);
  const updateStockLevel = useMutation(api.pantryItems.updateStockLevel);
  const createList = useMutation(api.shoppingLists.create);
  const addListItem = useMutation(api.listItems.create);

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
      // Trigger fly animation
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

      // Auto-add to shopping list when item goes "out"
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

  if (items === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading pantry...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🏠</Text>
        <Text style={styles.emptyTitle}>Your Pantry is Empty</Text>
        <Text style={styles.emptySubtitle}>Add items to track what you have at home</Text>
      </View>
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
    <GestureHandlerRootView style={styles.container}>
      <Text style={styles.title}>My Pantry</Text>
      <Text style={styles.subtitle}>
        {filteredItems.length} of {items.length} items
        {searchQuery ? ` matching "${searchQuery}"` : ""}
      </Text>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search pantry..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={() => setFilterVisible(true)}
        >
          <Text style={styles.filterButtonText}>⚙️</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
                  <Text style={styles.categoryCount}>({categoryItems.length})</Text>
                </View>
                <Text style={styles.collapseIcon}>{isCollapsed ? "▶" : "▼"}</Text>
              </TouchableOpacity>

              {!isCollapsed && (
                <View style={styles.itemList}>
                  {categoryItems.map((item) => (
                    <PantryItemRow
                      key={item._id}
                      item={item}
                      onLongPress={() => handleLongPress(item)}
                      onSwipeDecrease={() => handleSwipeDecrease(item)}
                      onMeasure={(x, y) => handleItemMeasure(item._id as string, x, y)}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Liquid Stock Level Picker */}
      <StockLevelPicker
        visible={pickerVisible}
        currentLevel={selectedItem?.stockLevel || "stocked"}
        itemName={selectedItem?.name || ""}
        onSelect={handleSelectStockLevel}
        onClose={handleClosePicker}
      />

      {/* Fly to List Animation */}
      <FlyToListAnimation
        visible={flyAnimationVisible}
        itemName={flyItemName}
        startPosition={flyStartPosition}
        onAnimationComplete={handleFlyAnimationComplete}
      />

      {/* Stock Level Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFilterVisible(false)}>
          <View style={styles.filterModal}>
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
                >
                  <LiquidFillIndicator level={option.level} size="small" />
                  <Text style={styles.filterOptionLabel}>{option.label}</Text>
                  {stockFilters.has(option.level) && (
                    <Text style={styles.filterCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setStockFilters(new Set(["stocked", "good", "low", "out"]));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.resetButtonText}>Show All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setFilterVisible(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </GestureHandlerRootView>
  );
}

// Individual pantry item row with liquid indicator
function PantryItemRow({
  item,
  onLongPress,
  onSwipeDecrease,
  onMeasure,
}: {
  item: {
    _id: Id<"pantryItems">;
    name: string;
    category: string;
    stockLevel: string;
  };
  onLongPress: () => void;
  onSwipeDecrease: () => void;
  onMeasure: (x: number, y: number) => void;
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
        <Text style={styles.swipeActionLabel}>
          {nextLevel === "out" ? "Out!" : "Lower"}
        </Text>
      </View>
    );
  };

  const getCategoryEmoji = (cat: string): string => {
    const emojiMap: Record<string, string> = {
      proteins: "🥩",
      dairy: "🥛",
      grains: "🌾",
      vegetables: "🥬",
      fruits: "🍎",
      beverages: "🥤",
      snacks: "🍪",
      condiments: "🧂",
      frozen: "🧊",
      household: "🧹",
      other: "📦",
    };
    return emojiMap[cat.toLowerCase()] || "📦";
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        onSwipeableOpen={handleSwipeOpen}
        overshootRight={false}
        rightThreshold={80}
      >
        <TouchableOpacity
          ref={cardRef}
          style={styles.itemCard}
          onLongPress={handleLongPress}
          delayLongPress={400}
          activeOpacity={0.7}
        >
          {/* Liquid fill indicator */}
          <LiquidFillIndicator
            level={item.stockLevel as StockLevel}
            size="small"
            showWave={false}
          />

          {/* Item info */}
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {getCategoryEmoji(item.category)} {item.name}
            </Text>
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
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFAF8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFAF8",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#636E72",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFAF8",
    padding: 24,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#636E72",
    textAlign: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2D3436",
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#636E72",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: "#2D3436",
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FF6B35",
  },
  filterButtonText: {
    fontSize: 18,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 12,
  },
  categoryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3436",
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: "500",
    color: "#636E72",
  },
  collapseIcon: {
    fontSize: 14,
    color: "#636E72",
  },
  itemList: {
    gap: 8,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2D3436",
    marginBottom: 2,
  },
  stockLevelText: {
    fontSize: 12,
    color: "#636E72",
  },
  holdHint: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  holdHintText: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  swipeAction: {
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 12,
    marginLeft: 8,
    paddingVertical: 8,
  },
  swipeActionLabel: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  filterModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3436",
    textAlign: "center",
    marginBottom: 4,
  },
  filterSubtitle: {
    fontSize: 14,
    color: "#636E72",
    textAlign: "center",
    marginBottom: 20,
  },
  filterOptions: {
    gap: 10,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 12,
  },
  filterOptionSelected: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FF6B35",
  },
  filterOptionLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#2D3436",
    flex: 1,
  },
  filterCheck: {
    fontSize: 18,
    color: "#FF6B35",
    fontWeight: "700",
  },
  resetButton: {
    marginTop: 16,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
  },
  resetButtonText: {
    fontSize: 14,
    color: "#636E72",
    fontWeight: "500",
  },
  doneButton: {
    marginTop: 12,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#FF6B35",
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});
