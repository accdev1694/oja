import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GlassScreen,
  colors,
  spacing,
} from "@/components/ui/glass";
import { CategoryFilter } from "@/components/ui/CategoryFilter";
import {
  PantryPickItem,
  PantryPickHeader,
  usePantryPickData,
  styles,
  type FlatItem,
} from "@/components/pantry-pick";

export default function PantryPickScreen() {
  const insets = useSafeAreaInsets();
  const {
    items,
    selectedIds,
    isAdding,
    pickCategoryFilter,
    setPickCategoryFilter,
    pickCategories,
    pickCategoryCounts,
    flatData,
    allSelected,
    allLowSelected,
    lowItemIds,
    toggleItem,
    toggleAll,
    toggleLow,
    handleConfirm,
  } = usePantryPickData();

  const pantryRenderItem = useCallback(
    ({ item }: { item: FlatItem }) => (
      <PantryPickItem item={item} selectedIds={selectedIds} onToggle={toggleItem} />
    ),
    [selectedIds, toggleItem]
  );

  const pantryKeyExtractor = useCallback((item: FlatItem) => item._id, []);

  const pantryGetItemType = useCallback(
    (item: FlatItem) =>
      "isCategoryHeader" in item ? "categoryHeader" : "row",
    []
  );

  if (!items) {
    return (
      <GlassScreen edges={["top"]}>
        <PantryPickHeader />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading stock...</Text>
        </View>
      </GlassScreen>
    );
  }

  if (items.length === 0) {
    return (
      <GlassScreen edges={["top"]}>
        <PantryPickHeader />
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
      <PantryPickHeader />

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
      <FlashList
        data={flatData}
        renderItem={pantryRenderItem}
        keyExtractor={pantryKeyExtractor}
        getItemType={pantryGetItemType}
        extraData={selectedIds}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: 140 + insets.bottom }}
      />

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
