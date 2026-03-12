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
  onAdd: (item: PantryItemData) => void;
}

const PantryRow = memo(function PantryRow({
  item,
  isOnList,
  onAdd,
}: PantryRowProps) {
  const iconName = (item.icon ?? "food-variant") as keyof typeof MaterialCommunityIcons.glyphMap;

  return (
    <Pressable
      style={styles.row}
      onPress={() => {
        if (!isOnList) onAdd(item);
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
          <Pressable
            style={styles.addButton}
            onPress={() => onAdd(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={22}
              color={colors.text.secondary}
            />
          </Pressable>
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
  onBulkAdd: (filter: "low" | "all") => void;
  bulkAddingFilter: "low" | "all" | null;
  capsulePulseStyle: any;
  pantryListData: PantryItemData[];
  isItemOnList: (name: string) => boolean;
  onAddPantryItem: (item: PantryItemData) => void;
}

export const PantryView = ({
  isLoading,
  totalPantryCount,
  pantryNeedCount,
  lowAddableCount,
  allAddableCount,
  pantryFilter,
  onFilterChange,
  onBulkAdd,
  bulkAddingFilter,
  capsulePulseStyle,
  pantryListData,
  isItemOnList,
  onAddPantryItem,
}: PantryViewProps) => {
  const renderPantryItem = useCallback(
    ({ item }: ListRenderItemInfo<PantryItemData>) => (
      <PantryRow
        item={item}
        isOnList={isItemOnList(item.name)}
        onAdd={onAddPantryItem}
      />
    ),
    [isItemOnList, onAddPantryItem]
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
                  onPress={() => onBulkAdd("low")}
                  disabled={lowAddableCount === 0 || bulkAddingFilter === "low"}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  {bulkAddingFilter === "low" ? (
                    <ActivityIndicator size={18} color={pantryFilter === "low" ? colors.accent.warning : colors.text.tertiary} />
                  ) : (
                    <MaterialCommunityIcons
                      name="plus-circle-outline"
                      size={22}
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
                  onPress={() => onBulkAdd("all")}
                  disabled={allAddableCount === 0 || bulkAddingFilter === "all"}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  {bulkAddingFilter === "all" ? (
                    <ActivityIndicator size={18} color={pantryFilter === "all" ? colors.accent.primary : colors.text.tertiary} />
                  ) : (
                    <MaterialCommunityIcons
                      name="plus-circle-outline"
                      size={22}
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </>
  );
};
