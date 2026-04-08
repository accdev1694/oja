import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  STOCK_LEVEL_SHORT,
  type StockLevel,
} from "@/components/pantry";
import { getSafeIcon } from "@/lib/icons/iconMatcher";
import { colors } from "@/components/ui/glass";
import { STOCK_COLORS, type FlatItem, type PantryPickPantryItem } from "./types";
import { styles } from "./styles";

interface PantryPickItemProps {
  item: FlatItem;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export function PantryPickItem({ item, selectedIds, onToggle }: PantryPickItemProps) {
  if ("isCategoryHeader" in item && item.isCategoryHeader) {
    return (
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryTitle}>{item.category}</Text>
        <View style={styles.categoryCountBadge}>
          <Text style={styles.categoryCount}>{item.count}</Text>
        </View>
      </View>
    );
  }

  const pantryItem = item as PantryPickPantryItem;
  const isSelected = selectedIds.has(pantryItem._id);
  const stockColor = STOCK_COLORS[pantryItem.stockLevel] || colors.text.tertiary;
  const stockLabel = STOCK_LEVEL_SHORT[pantryItem.stockLevel as StockLevel] || pantryItem.stockLevel;
  const iconName = getSafeIcon(pantryItem.icon, pantryItem.category);

  return (
    <TouchableOpacity
      style={[styles.itemRow, isSelected && styles.itemRowSelected]}
      onPress={() => onToggle(pantryItem._id)}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
        size={22}
        color={isSelected ? colors.accent.primary : colors.text.tertiary}
      />
      <MaterialCommunityIcons
        name={iconName}
        size={20}
        color={colors.text.secondary}
      />
      <Text style={styles.itemName} numberOfLines={1}>
        {pantryItem.name}
      </Text>
      <View style={[styles.stockBadge, { backgroundColor: `${stockColor}20` }]}>
        <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
        <Text style={[styles.stockText, { color: stockColor }]}>{stockLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}
