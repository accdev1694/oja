import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/components/ui/glass";
import { stockStyles as styles } from "./stockStyles";

interface StockHeaderButtonsProps {
  activeFilterCount: number;
  onOpenAddModal: () => void;
  onOpenFilter: () => void;
  onRefreshPrices?: () => void;
  isRefreshingPrices?: boolean;
}

export const StockHeaderButtons = React.memo(function StockHeaderButtons({
  activeFilterCount,
  onOpenAddModal,
  onOpenFilter,
  onRefreshPrices,
  isRefreshingPrices,
}: StockHeaderButtonsProps) {
  return (
    <View style={styles.headerButtons}>
      {onRefreshPrices && (
        <Pressable
          style={[styles.addButton, isRefreshingPrices && { opacity: 0.5 }]}
          onPress={onRefreshPrices}
          disabled={isRefreshingPrices}
        >
          <MaterialCommunityIcons
            name="currency-gbp"
            size={18}
            color={isRefreshingPrices ? colors.text.disabled : colors.accent.primary}
          />
        </Pressable>
      )}
      <Pressable style={styles.addButton} onPress={onOpenAddModal}>
        <MaterialCommunityIcons name="plus" size={18} color={colors.accent.primary} />
      </Pressable>
      <Pressable
        style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
        onPress={onOpenFilter}
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
  );
});
