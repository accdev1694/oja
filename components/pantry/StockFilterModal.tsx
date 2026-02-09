import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";

import {
  GaugeIndicator,
  type StockLevel,
} from "@/components/pantry";
import {
  GlassModal,
  GlassButton,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

const STOCK_LEVELS: { level: StockLevel; label: string; color: string }[] = [
  { level: "stocked", label: "Stocked", color: colors.budget.healthy },
  { level: "low", label: "Running Low", color: colors.budget.caution },
  { level: "out", label: "Out of Stock", color: colors.budget.exceeded },
];

interface StockFilterModalProps {
  visible: boolean;
  onClose: () => void;
  stockFilters: Set<StockLevel>;
  onToggleFilter: (level: StockLevel) => void;
  onShowAll: () => void;
}

export const StockFilterModal = React.memo(function StockFilterModal({
  visible,
  onClose,
  stockFilters,
  onToggleFilter,
  onShowAll,
}: StockFilterModalProps) {
  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      maxWidth={340}
      contentStyle={styles.filterModal}
    >
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
            onPress={() => onToggleFilter(option.level)}
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
        <GlassButton variant="ghost" size="md" onPress={onShowAll}>
          Show All
        </GlassButton>
        <GlassButton variant="primary" size="md" onPress={onClose}>
          Done
        </GlassButton>
      </View>
    </GlassModal>
  );
});

const styles = StyleSheet.create({
  filterModal: {
    alignItems: "center",
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
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.3)",
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
