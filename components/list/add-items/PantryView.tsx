import React, { memo, useCallback } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, ListRenderItemInfo } from "react-native";
import Animated from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCapsuleSwitcher, colors } from "@/components/ui/glass";
import { styles } from "./styles";
import type { Id } from "@/convex/_generated/dataModel";

interface PantryItemData {
  _id: Id<"pantryItems">;
  name: string;
  category: string;
  icon?: string;
  stockLevel: string;
  lastPrice?: number;
  defaultSize?: string;
  defaultUnit?: string;
}

interface PantryRowProps {
  item: PantryItemData;
  isOnList: boolean;
  isSelected: boolean;
  onToggleSelect: (id: Id<"pantryItems">) => void;
}

const PantryRow = memo(function PantryRow({
  item,
  isOnList,
  isSelected,
  onToggleSelect,
}: PantryRowProps) {
  const iconName = (item.icon ?? "food-variant") as keyof typeof MaterialCommunityIcons.glyphMap;

  return (
    <Pressable
      style={[styles.row, isSelected && styles.rowSelected]}
      onPress={() => {
        if (!isOnList) onToggleSelect(item._id);
      }}
      disabled={isOnList}
    >
      <View style={styles.rowLeft}>
        {isOnList ? (
          <View style={styles.onListBadge}>
            <MaterialCommunityIcons
              name="check"
              size={14}
              color={colors.text.tertiary}
            />
          </View>
        ) : (
          <View style={[styles.selectCircle, isSelected && styles.selectCircleActive]}>
            {isSelected && (
              <MaterialCommunityIcons
                name="check"
                size={14}
                color="#fff"
              />
            )}
          </View>
        )}
        <View style={styles.pantryIconContainer}>
          <MaterialCommunityIcons
            name={iconName}
            size={18}
            color={
              item.stockLevel === "out"
                ? colors.accent.error
                : item.stockLevel === "low"
                  ? colors.accent.warning
                  : colors.text.secondary
            }
          />
        </View>
        <View style={styles.rowTextContainer}>
          <Text
            style={[
              styles.rowName,
              isOnList && styles.rowNameOnList,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={styles.subtitleRow}>
            {isOnList && (
              <Text style={styles.onListText}>(on list)</Text>
            )}
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {item.category}
              {item.lastPrice != null ? ` \u00B7 £${item.lastPrice.toFixed(2)}` : ""}
            </Text>
          </View>
        </View>
      </View>
      {item.lastPrice != null && !isOnList && (
        <Text style={styles.rowPrice}>£{item.lastPrice.toFixed(2)}</Text>
      )}
    </Pressable>
  );
});

interface PantryViewProps {
  isLoading: boolean;
  totalPantryCount: number;
  pantryNeedCount: number;
  lowAddableCount: number;
  allAddableCount: number;
  pantryFilter: "low" | "all";
  onFilterChange: (index: number) => void;
  onSelectAll: (filter: "low" | "all") => void;
  bulkAddingFilter: "low" | "all" | null;
  capsulePulseStyle: { transform: { scale: number }[] };
  pantryListData: PantryItemData[];
  isItemOnList: (name: string) => boolean;
  selectedIds: Set<Id<"pantryItems">>;
  onToggleSelect: (id: Id<"pantryItems">) => void;
}

export const PantryView = ({
  isLoading,
  totalPantryCount,
  pantryNeedCount,
  lowAddableCount,
  allAddableCount,
  pantryFilter,
  onFilterChange,
  onSelectAll,
  bulkAddingFilter,
  capsulePulseStyle,
  pantryListData,
  isItemOnList,
  selectedIds,
  onToggleSelect,
}: PantryViewProps) => {
  const renderPantryItem = useCallback(
    ({ item }: ListRenderItemInfo<PantryItemData>) => (
      <PantryRow
        item={item}
        isOnList={isItemOnList(item.name)}
        isSelected={selectedIds.has(item._id)}
        onToggleSelect={onToggleSelect}
      />
    ),
    [isItemOnList, selectedIds, onToggleSelect]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent.primary} />
        <Text style={styles.loadingText}>Loading pantry...</Text>
      </View>
    );
  }

  if (totalPantryCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="fridge-off-outline"
          size={48}
          color={colors.text.disabled}
        />
        <Text style={styles.emptyText}>Your pantry is empty</Text>
        <Text style={styles.emptySubtext}>
          Add items to your pantry to quickly restock from here
        </Text>
      </View>
    );
  }

  // Check if all addable items in current filter are selected
  const currentAddableCount = pantryFilter === "low" ? lowAddableCount : allAddableCount;
  const currentFilterSelected = pantryListData.filter(
    (item) => !isItemOnList(item.name) && selectedIds.has(item._id)
  ).length;
  const allCurrentSelected = currentAddableCount > 0 && currentFilterSelected === currentAddableCount;

  return (
    <>
      <GlassCapsuleSwitcher
        tabs={[
          {
            label: "Low Items",
            activeColor: colors.accent.warning,
            badge: pantryNeedCount,
            leading: (
              <Animated.View style={lowAddableCount > 0 ? capsulePulseStyle : undefined}>
                <Pressable
                  style={styles.capsuleAddButton}
                  onPress={() => onSelectAll("low")}
                  disabled={lowAddableCount === 0 || bulkAddingFilter === "low"}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  {bulkAddingFilter === "low" ? (
                    <ActivityIndicator size={18} color={pantryFilter === "low" ? colors.accent.warning : colors.text.tertiary} />
                  ) : (
                    <MaterialCommunityIcons
                      name={pantryFilter === "low" && allCurrentSelected ? "checkbox-marked-outline" : "checkbox-multiple-outline"}
                      size={20}
                      color={
                        lowAddableCount === 0
                          ? colors.text.disabled
                          : pantryFilter === "low"
                            ? colors.accent.warning
                            : colors.text.tertiary
                      }
                    />
                  )}
                </Pressable>
              </Animated.View>
            ),
          },
          {
            label: "All Items",
            activeColor: colors.accent.primary,
            badge: totalPantryCount,
            leading: (
              <Animated.View style={allAddableCount > 0 ? capsulePulseStyle : undefined}>
                <Pressable
                  style={styles.capsuleAddButton}
                  onPress={() => onSelectAll("all")}
                  disabled={allAddableCount === 0 || bulkAddingFilter === "all"}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  {bulkAddingFilter === "all" ? (
                    <ActivityIndicator size={18} color={pantryFilter === "all" ? colors.accent.primary : colors.text.tertiary} />
                  ) : (
                    <MaterialCommunityIcons
                      name={pantryFilter === "all" && allCurrentSelected ? "checkbox-marked-outline" : "checkbox-multiple-outline"}
                      size={20}
                      color={
                        allAddableCount === 0
                          ? colors.text.disabled
                          : pantryFilter === "all"
                            ? colors.accent.primary
                            : colors.text.tertiary
                      }
                    />
                  )}
                </Pressable>
              </Animated.View>
            ),
          },
        ]}
        activeIndex={pantryFilter === "low" ? 0 : 1}
        onTabChange={onFilterChange}
        style={styles.pantryCapsuleSwitcher}
      />

      {pantryListData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={48}
            color={colors.semantic.success}
          />
          <Text style={styles.emptyText}>All stocked up!</Text>
          <Text style={styles.emptySubtext}>
            No items need restocking. Switch to &quot;All Items&quot; to browse your full pantry.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pantryListData}
          renderItem={renderPantryItem}
          keyExtractor={(item, index) => `pantry-${item._id}-${index}`}
          extraData={selectedIds}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </>
  );
};
