import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useLocalSearchParams, router } from "expo-router";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  impactAsync,
  notificationAsync,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  STOCK_LEVEL_SHORT,
  type StockLevel,
  STOCK_LEVEL_ORDER,
} from "@/components/pantry";
import { getSafeIcon } from "@/lib/icons/iconMatcher";
import {
  GlassScreen,
  GlassCard,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { CategoryFilter } from "@/components/ui/CategoryFilter";

const STOCK_COLORS: Record<string, string> = {
  out: "#EF4444",
  low: "#F59E0B",
  stocked: "#10B981",
};

// Sort priority: out first, stocked last
const STOCK_SORT_ORDER: Record<string, number> = {
  out: 0,
  low: 1,
  stocked: 2,
};

export default function PantryPickScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const insets = useSafeAreaInsets();
  const items = useQuery(api.pantryItems.getByUser);
  const addFromPantrySelected = useMutation(api.listItems.addFromPantrySelected);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [pickCategoryFilter, setPickCategoryFilter] = useState<string | null>(null);

  // Derive categories for filter chips
  const { pickCategories, pickCategoryCounts } = useMemo(() => {
    if (!items) return { pickCategories: [], pickCategoryCounts: {} };
    const countMap: Record<string, number> = {};
    items.forEach((item) => {
      countMap[item.category] = (countMap[item.category] || 0) + 1;
    });
    return { pickCategories: Object.keys(countMap).sort(), pickCategoryCounts: countMap };
  }, [items]);

  // Filter items by selected category, then group by category sorted by stock
  const groupedItems = useMemo(() => {
    if (!items) return {};
    const filtered = pickCategoryFilter
      ? items.filter((item) => item.category === pickCategoryFilter)
      : items;
    const groups: Record<string, typeof items> = {};
    const sorted = [...filtered].sort(
      (a, b) =>
        (STOCK_SORT_ORDER[a.stockLevel] ?? 4) -
        (STOCK_SORT_ORDER[b.stockLevel] ?? 4)
    );
    sorted.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [items, pickCategoryFilter]);

  const allItemIds = useMemo(() => {
    if (!items) return [];
    return items.map((i) => i._id as string);
  }, [items]);

  const lowItemIds = useMemo(() => {
    if (!items) return [];
    return items
      .filter((i) => i.stockLevel === "low" || i.stockLevel === "out")
      .map((i) => i._id as string);
  }, [items]);

  const allSelected = allItemIds.length > 0 && selectedIds.size === allItemIds.length;
  const allLowSelected = lowItemIds.length > 0 && lowItemIds.every((id) => selectedIds.has(id));

  const toggleItem = useCallback(
    (id: string) => {
      impactAsync(ImpactFeedbackStyle.Light);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    []
  );

  const toggleAll = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium);
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allItemIds));
    }
  }, [allSelected, allItemIds]);

  const toggleLow = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium);
    if (allLowSelected) {
      // Deselect only the low/out items, keep any other selections
      setSelectedIds((prev) => {
        const next = new Set(prev);
        lowItemIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Add all low/out items to selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        lowItemIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [allLowSelected, lowItemIds]);

  const handleConfirm = async () => {
    if (selectedIds.size === 0 || !listId) return;
    setIsAdding(true);
    try {
      const pantryItemIds = Array.from(selectedIds) as Id<"pantryItems">[];
      const result = await addFromPantrySelected({
        listId: listId as Id<"shoppingLists">,
        pantryItemIds,
      });
      notificationAsync(NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error("Failed to add items:", error);
      Alert.alert("Error", "Failed to add items to list");
    } finally {
      setIsAdding(false);
    }
  };

  if (!items) {
    return (
      <GlassScreen edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add from Stock</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading stock...</Text>
        </View>
      </GlassScreen>
    );
  }

  if (items.length === 0) {
    return (
      <GlassScreen edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add from Stock</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loading}>
          <MaterialCommunityIcons name="package-variant" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyText}>Your stock is empty</Text>
          <Text style={styles.emptySubtext}>Add items to your stock first</Text>
        </View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add from Stock</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Quick select actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton} onPress={toggleAll} activeOpacity={0.7}>
          <MaterialCommunityIcons
            name={allSelected ? "checkbox-marked" : "checkbox-blank-outline"}
            size={20}
            color={allSelected ? colors.accent.primary : colors.text.tertiary}
          />
          <Text style={styles.quickActionText}>
            {allSelected ? "Deselect All" : "Select All"}
          </Text>
        </TouchableOpacity>
        {lowItemIds.length > 0 && (
          <TouchableOpacity style={styles.quickActionButton} onPress={toggleLow} activeOpacity={0.7}>
            <MaterialCommunityIcons
              name={allLowSelected ? "checkbox-marked" : "checkbox-blank-outline"}
              size={20}
              color={allLowSelected ? colors.semantic.warning : colors.text.tertiary}
            />
            <Text style={styles.quickActionText}>
              {allLowSelected ? "Deselect Low" : `Low / Out (${lowItemIds.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter chips */}
      <CategoryFilter
        categories={pickCategories}
        selected={pickCategoryFilter}
        onSelect={setPickCategoryFilter}
        counts={pickCategoryCounts}
      />

      {/* Item list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.categoryCountBadge}>
                <Text style={styles.categoryCount}>{categoryItems.length}</Text>
              </View>
            </View>
            <View style={styles.itemList}>
              {categoryItems.map((item) => {
                const isSelected = selectedIds.has(item._id as string);
                const stockColor = STOCK_COLORS[item.stockLevel] || colors.text.tertiary;
                const stockLabel = STOCK_LEVEL_SHORT[item.stockLevel as StockLevel] || item.stockLevel;
                const iconName = getSafeIcon(item.icon, item.category);

                return (
                  <TouchableOpacity
                    key={item._id}
                    style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                    onPress={() => toggleItem(item._id as string)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                      size={22}
                      color={isSelected ? colors.accent.primary : colors.text.tertiary}
                    />
                    <MaterialCommunityIcons
                      name={iconName as any}
                      size={20}
                      color={colors.text.secondary}
                    />
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={[styles.stockBadge, { backgroundColor: `${stockColor}20` }]}>
                      <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
                      <Text style={[styles.stockText, { color: stockColor }]}>{stockLabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Floating confirm button */}
      <View style={[styles.floatingBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.confirmButton, selectedIds.size === 0 && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={selectedIds.size === 0 || isAdding}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="cart-plus"
            size={20}
            color={selectedIds.size === 0 ? colors.text.tertiary : colors.text.inverse}
          />
          <Text
            style={[
              styles.confirmButtonText,
              selectedIds.size === 0 && styles.confirmButtonTextDisabled,
            ]}
          >
            {isAdding
              ? "Adding..."
              : selectedIds.size === 0
                ? "Select items to add"
                : `Add ${selectedIds.size} item${selectedIds.size !== 1 ? "s" : ""} to list`}
          </Text>
        </TouchableOpacity>
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.headlineLarge,
    color: colors.text.primary,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  emptyText: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  quickActionText: {
    ...typography.labelMedium,
    color: colors.text.primary,
    fontWeight: "600",
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
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
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
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  itemRowSelected: {
    backgroundColor: "rgba(0, 212, 170, 0.08)",
    borderColor: "rgba(0, 212, 170, 0.3)",
  },
  itemName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    flex: 1,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    fontSize: 11,
    fontWeight: "600",
  },
  floatingBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: "rgba(11, 20, 38, 0.95)",
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.glass.backgroundHover,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.inverse,
  },
  confirmButtonTextDisabled: {
    color: colors.text.tertiary,
  },
});
