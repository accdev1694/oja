import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassButton,
  GlassModal,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { haptic } from "@/lib/haptics/safeHaptics";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StartShoppingModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  listName: string;
  storeName?: string;
  storeColor?: string;
  itemCount: number;
  estimatedTotal: number;
  budget: number;
  hasStore: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(value: number): string {
  return `\u00A3${value.toFixed(2)}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function StartShoppingModal({
  visible,
  onClose,
  onConfirm,
  listName,
  storeName,
  storeColor,
  itemCount,
  estimatedTotal,
  budget,
  hasStore,
}: StartShoppingModalProps) {
  const overBudgetAmount = estimatedTotal > budget ? estimatedTotal - budget : 0;
  const isOverBudget = overBudgetAmount > 0 && budget > 0;
  const isEmpty = itemCount === 0;
  const hasWarnings = !hasStore || isEmpty || isOverBudget;

  function handleConfirm() {
    haptic("medium");
    onConfirm();
  }

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      animationType="slide"
      maxWidth={400}
      overlayOpacity={0.6}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="cart-outline"
            size={28}
            color={colors.accent.primary}
          />
        </View>
        <Text style={styles.title}>Ready to Shop?</Text>
      </View>

      {/* Summary Section */}
      <View style={styles.summaryCard}>
        {/* List Name */}
        <Text style={styles.listName}>{listName}</Text>

        {/* Store Row */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Store</Text>
          {hasStore ? (
            <View style={styles.storeIndicator}>
              <View
                style={[
                  styles.storeDot,
                  { backgroundColor: storeColor || colors.accent.primary },
                ]}
              />
              <Text style={styles.summaryValue}>{storeName}</Text>
            </View>
          ) : (
            <Text style={styles.noStoreText}>No store selected</Text>
          )}
        </View>

        {/* Item Count */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Items</Text>
          <Text style={styles.summaryValue}>
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </Text>
        </View>

        {/* Budget */}
        {budget > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Budget</Text>
            <Text style={styles.summaryValue}>{formatPrice(budget)}</Text>
          </View>
        )}

        {/* Estimated Total */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Estimated</Text>
          <Text
            style={[
              styles.summaryValue,
              isOverBudget && styles.overBudgetValue,
            ]}
          >
            {formatPrice(estimatedTotal)}
          </Text>
        </View>
      </View>

      {/* Warnings Section */}
      {hasWarnings && (
        <View style={styles.warnings}>
          {!hasStore && (
            <View style={styles.warningRow}>
              <MaterialCommunityIcons
                name="store-alert-outline"
                size={18}
                color={colors.semantic.warning}
              />
              <Text style={styles.warningText}>
                No store selected {"\u2014"} prices may be estimates
              </Text>
            </View>
          )}

          {isEmpty && (
            <View style={styles.warningRow}>
              <MaterialCommunityIcons
                name="cart-off"
                size={18}
                color={colors.semantic.warning}
              />
              <Text style={styles.warningText}>Your list is empty</Text>
            </View>
          )}

          {isOverBudget && (
            <View style={[styles.warningRow, styles.dangerRow]}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color={colors.semantic.danger}
              />
              <Text style={styles.dangerText}>
                Estimated total exceeds budget by {formatPrice(overBudgetAmount)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <GlassButton
          variant="secondary"
          onPress={onClose}
          style={styles.actionBtn}
        >
          Not Yet
        </GlassButton>
        <GlassButton
          variant="primary"
          onPress={handleConfirm}
          style={styles.actionBtn}
          icon="cart-arrow-right"
        >
          Start Shopping
        </GlassButton>
      </View>
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
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
  },
  summaryCard: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  listName: {
    ...typography.labelLarge,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  summaryValue: {
    ...typography.labelMedium,
    color: colors.text.primary,
  },
  storeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  storeDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  noStoreText: {
    ...typography.labelMedium,
    color: colors.semantic.warning,
  },
  overBudgetValue: {
    color: colors.semantic.danger,
  },
  warnings: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.semantic.warning}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.semantic.warning,
    flex: 1,
  },
  dangerRow: {
    backgroundColor: `${colors.semantic.danger}15`,
  },
  dangerText: {
    ...typography.bodySmall,
    color: colors.semantic.danger,
    flex: 1,
  },
  actions: {
    gap: spacing.sm,
  },
  actionBtn: {},
});
