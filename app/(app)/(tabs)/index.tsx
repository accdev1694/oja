import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, Modal, Pressable, Animated, Alert, TextInput } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useRef, useMemo } from "react";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 48; // 24px on each side
const COLUMNS = SCREEN_WIDTH > 600 ? 3 : 2; // 3 columns on tablet, 2 on phone

type StockLevel = "stocked" | "good" | "low" | "out";

const STOCK_LEVELS: { level: StockLevel; label: string; color: string; emoji: string }[] = [
  { level: "stocked", label: "Fully Stocked", color: "#10B981", emoji: "🟢" },
  { level: "good", label: "Good", color: "#3B82F6", emoji: "🔵" },
  { level: "low", label: "Running Low", color: "#F59E0B", emoji: "🟠" },
  { level: "out", label: "Out of Stock", color: "#EF4444", emoji: "🔴" },
];

export default function PantryScreen() {
  const items = useQuery(api.pantryItems.getByUser);
  const activeLists = useQuery(api.shoppingLists.getActive);
  const updateStockLevel = useMutation(api.pantryItems.updateStockLevel);
  const createList = useMutation(api.shoppingLists.create);
  const addListItem = useMutation(api.listItems.create);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: Id<"pantryItems">; name: string; category: string; stockLevel: StockLevel } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [stockFilters, setStockFilters] = useState<Set<StockLevel>>(new Set(["stocked", "good", "low", "out"]));

  // Filter items based on search and stock level
  const filteredItems = useMemo(() => {
    if (!items) return [];

    return items.filter((item) => {
      // Stock level filter
      if (!stockFilters.has(item.stockLevel as StockLevel)) return false;

      // Search filter
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
        // Don't allow deselecting all
        if (newSet.size > 1) {
          newSet.delete(level);
        }
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  const handleLongPress = (item: { _id: Id<"pantryItems">; name: string; category: string; stockLevel: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedItem({ id: item._id, name: item.name, category: item.category, stockLevel: item.stockLevel as StockLevel });
    setPickerVisible(true);
  };

  const handleSelectStockLevel = async (level: StockLevel) => {
    if (!selectedItem) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPickerVisible(false);

    try {
      await updateStockLevel({ id: selectedItem.id, stockLevel: level });

      // Auto-add to shopping list when item goes "out"
      if (level === "out" && selectedItem.stockLevel !== "out") {
        await autoAddToShoppingList({
          _id: selectedItem.id,
          name: selectedItem.name,
          category: selectedItem.category,
        });
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

  // Auto-add "out" item to shopping list
  const autoAddToShoppingList = async (item: { _id: Id<"pantryItems">; name: string; category: string }) => {
    try {
      let listId: Id<"shoppingLists">;

      // Use first active list or create a new one
      if (activeLists && activeLists.length > 0) {
        listId = activeLists[0]._id;
      } else {
        // Create new list
        const listName = `Shopping List ${new Date().toLocaleDateString()}`;
        listId = await createList({
          name: listName,
          budget: 50,
          budgetLocked: false,
        });
      }

      // Add item to the list
      await addListItem({
        listId,
        name: item.name,
        category: item.category,
        quantity: 1,
        priority: "must-have",
        pantryItemId: item._id,
        autoAdded: true,
      });

      // Show toast notification
      Alert.alert(
        "Added to List",
        `${item.name} added to shopping list`,
        [{ text: "OK" }],
        { cancelable: true }
      );
    } catch (error) {
      console.error("Failed to auto-add to list:", error);
    }
  };

  // Swipe to decrease stock level
  const getNextLowerLevel = (current: StockLevel): StockLevel | null => {
    const order: StockLevel[] = ["stocked", "good", "low", "out"];
    const currentIndex = order.indexOf(current);
    if (currentIndex < order.length - 1) {
      return order[currentIndex + 1];
    }
    return null; // Already at "out"
  };

  const handleSwipeDecrease = async (item: { _id: Id<"pantryItems">; name: string; category: string; stockLevel: string }) => {
    const nextLevel = getNextLowerLevel(item.stockLevel as StockLevel);
    if (!nextLevel) return;

    // Different haptic feedback for "out" level
    if (nextLevel === "out") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await updateStockLevel({ id: item._id, stockLevel: nextLevel });

      // Auto-add to shopping list when item goes "out"
      if (nextLevel === "out") {
        await autoAddToShoppingList(item);
      }
    } catch (error) {
      console.error("Failed to decrease stock:", error);
    }
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, item: { _id: Id<"pantryItems">; name: string; category: string; stockLevel: string }) => {
    const nextLevel = getNextLowerLevel(item.stockLevel as StockLevel);
    if (!nextLevel) return null;

    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });

    const levelInfo = STOCK_LEVELS.find((l) => l.level === nextLevel);

    return (
      <Animated.View style={[styles.swipeAction, { transform: [{ translateX: trans }] }]}>
        <View style={[styles.swipeActionContent, { backgroundColor: levelInfo?.color || "#EF4444" }]}>
          <Text style={styles.swipeActionText}>−</Text>
          <Text style={styles.swipeActionLabel}>{levelInfo?.label}</Text>
        </View>
      </Animated.View>
    );
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
        <Text style={styles.emptySubtitle}>
          Add items to track what you have at home
        </Text>
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

  // Stock level colors
  const getStockColor = (level: string) => {
    switch (level) {
      case "stocked": return "#10B981"; // Green
      case "good": return "#3B82F6";    // Blue
      case "low": return "#F59E0B";     // Orange
      case "out": return "#EF4444";     // Red
      default: return "#6B7280";
    }
  };

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
                <View style={styles.itemGrid}>
                  {categoryItems.map((item) => (
                    <View key={item._id} style={styles.swipeableContainer}>
                      <Swipeable
                        renderRightActions={(progress) => renderRightActions(progress, item)}
                        onSwipeableOpen={() => handleSwipeDecrease(item)}
                        overshootRight={false}
                        friction={2}
                      >
                        <TouchableOpacity
                          style={styles.itemCard}
                          onLongPress={() => handleLongPress(item)}
                          delayLongPress={500}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.stockIndicator,
                              { backgroundColor: getStockColor(item.stockLevel) },
                            ]}
                          />
                          <Text style={styles.itemName} numberOfLines={2}>
                            {item.name}
                          </Text>
                          <Text style={styles.stockLevel}>
                            {item.stockLevel === "stocked" && "Fully Stocked"}
                            {item.stockLevel === "good" && "Good"}
                            {item.stockLevel === "low" && "Running Low"}
                            {item.stockLevel === "out" && "Out of Stock"}
                          </Text>
                        </TouchableOpacity>
                      </Swipeable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Stock Level Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClosePicker}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClosePicker}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>
              {selectedItem?.name}
            </Text>
            <Text style={styles.pickerSubtitle}>Select stock level</Text>

            <View style={styles.pickerOptions}>
              {STOCK_LEVELS.map((option) => (
                <TouchableOpacity
                  key={option.level}
                  style={[
                    styles.pickerOption,
                    selectedItem?.stockLevel === option.level && styles.pickerOptionSelected,
                    { borderLeftColor: option.color },
                  ]}
                  onPress={() => handleSelectStockLevel(option.level)}
                  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                  <Text style={styles.pickerEmoji}>{option.emoji}</Text>
                  <Text style={styles.pickerLabel}>{option.label}</Text>
                  {selectedItem?.stockLevel === option.level && (
                    <Text style={styles.pickerCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={handleClosePicker}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Stock Level Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFilterVisible(false)}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Filter by Stock Level</Text>
            <Text style={styles.pickerSubtitle}>Select which levels to show</Text>

            <View style={styles.pickerOptions}>
              {STOCK_LEVELS.map((option) => (
                <TouchableOpacity
                  key={option.level}
                  style={[
                    styles.pickerOption,
                    stockFilters.has(option.level) && styles.pickerOptionSelected,
                    { borderLeftColor: option.color },
                  ]}
                  onPress={() => toggleStockFilter(option.level)}
                >
                  <Text style={styles.pickerEmoji}>{option.emoji}</Text>
                  <Text style={styles.pickerLabel}>{option.label}</Text>
                  {stockFilters.has(option.level) && (
                    <Text style={styles.pickerCheck}>✓</Text>
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

            <TouchableOpacity style={styles.cancelButton} onPress={() => setFilterVisible(false)}>
              <Text style={styles.cancelButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </GestureHandlerRootView>
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
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  swipeableContainer: {
    width: "47%",
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  swipeAction: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  swipeActionContent: {
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    height: "100%",
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  swipeActionText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  swipeActionLabel: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  stockIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2D3436",
    marginBottom: 4,
    paddingRight: 20,
  },
  stockLevel: {
    fontSize: 12,
    color: "#636E72",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 320,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3436",
    textAlign: "center",
    marginBottom: 4,
  },
  pickerSubtitle: {
    fontSize: 14,
    color: "#636E72",
    textAlign: "center",
    marginBottom: 20,
  },
  pickerOptions: {
    gap: 8,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  pickerOptionSelected: {
    backgroundColor: "#FFF7ED",
  },
  pickerEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2D3436",
    flex: 1,
  },
  pickerCheck: {
    fontSize: 18,
    color: "#FF6B35",
    fontWeight: "700",
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#636E72",
    fontWeight: "500",
  },
  resetButton: {
    marginTop: 12,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 14,
    color: "#636E72",
    fontWeight: "500",
  },
});
