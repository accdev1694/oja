import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  GlassButton,
  GlassModal,
  colors,
  typography,
  spacing,
  borderRadius,
  useGlassAlert,
} from "@/components/ui/glass";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MidShopModalProps {
  visible: boolean;
  itemName: string;
  itemPrice: number;
  itemQuantity: number;
  currentTotal: number;
  budget: number;
  remainingBudget: number;
  onClose: () => void;
  onAdd: (source: "add" | "next_trip") => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MidShopModal({
  visible,
  itemName,
  itemPrice,
  itemQuantity,
  currentTotal,
  budget,
  remainingBudget,
  onClose,
  onAdd,
}: MidShopModalProps) {
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd(source: "add" | "next_trip") {
    setIsAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await onAdd(source);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      animationType="slide"
      maxWidth={400}
      overlayOpacity={0.75}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="cart-plus"
            size={28}
            color={colors.accent.primary}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Add "{itemName}"?</Text>
          <Text style={styles.subtitle}>
            {itemPrice > 0
              ? `Est. \u00A3${(itemPrice * itemQuantity).toFixed(2)}`
              : "No price set"}
            {itemQuantity > 1 && ` (\u00D7${itemQuantity})`}
          </Text>
        </View>
      </View>

      {/* Budget Status */}
      <View style={styles.budgetStatus}>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Current Total</Text>
          <Text style={styles.budgetValue}>{"\u00A3"}{currentTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Budget</Text>
          <Text style={styles.budgetValue}>{"\u00A3"}{budget.toFixed(2)}</Text>
        </View>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Remaining</Text>
          <Text style={[
            styles.budgetValue,
            remainingBudget < 0 && styles.budgetNegative,
          ]}>
            {"\u00A3"}{remainingBudget.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Option Cards */}
      <View style={styles.options}>
        {/* Option 1: Add to List */}
        <Pressable
          style={[styles.optionCard, isAdding && styles.optionDisabled]}
          onPress={() => handleAdd("add")}
          disabled={isAdding}
        >
          <View style={[styles.optionIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
            <MaterialCommunityIcons
              name="cart-plus"
              size={24}
              color={colors.accent.primary}
            />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Add to List</Text>
            <Text style={styles.optionDesc}>Add item to your shopping list</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors.text.tertiary}
          />
        </Pressable>

        {/* Option 2: Save for Next Trip */}
        <Pressable
          style={[styles.optionCard, isAdding && styles.optionDisabled]}
          onPress={() => handleAdd("next_trip")}
          disabled={isAdding}
        >
          <View style={[styles.optionIcon, { backgroundColor: `${colors.text.tertiary}15` }]}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={24}
              color={colors.text.secondary}
            />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Save for Next Trip</Text>
            <Text style={styles.optionDesc}>Save to stock for later</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors.text.tertiary}
          />
        </Pressable>
      </View>

      {/* Cancel Button */}
      <GlassButton
        variant="secondary"
        onPress={onClose}
        style={styles.cancelButton}
      >
        Cancel
      </GlassButton>

      {isAdding && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      )}
    </GlassModal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  budgetStatus: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  budgetLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  budgetValue: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  budgetNegative: {
    color: colors.semantic.danger,
  },
  options: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: spacing.md,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
    marginBottom: 2,
  },
  optionDesc: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  cancelButton: {
    marginTop: spacing.xs,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13, 21, 40, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.xl,
  },
});
