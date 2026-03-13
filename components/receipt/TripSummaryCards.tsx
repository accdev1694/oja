/**
 * TripSummaryCards - Budget comparison, items breakdown, and unplanned purchases cards.
 * Used in the reconciliation screen when a receipt is linked to a shopping list.
 */

import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

interface UnplannedItem {
  name: string;
  quantity: number;
  totalPrice: number;
}

interface TripSummaryCardsProps {
  budget: number;
  actualTotal: number;
  difference: number;
  savedMoney: boolean;
  percentSaved: number;
  plannedItemsCount: number;
  actualItemsCount: number;
  unplannedItems: UnplannedItem[];
  unplannedItemsTotal: number;
}

export function TripSummaryCards({
  budget,
  actualTotal,
  difference,
  savedMoney,
  percentSaved,
  plannedItemsCount,
  actualItemsCount,
  unplannedItems,
  unplannedItemsTotal,
}: TripSummaryCardsProps) {
  return (
    <>
      {/* Success/Over Budget Card */}
      {savedMoney ? (
        <GlassCard variant="bordered" accentColor={colors.semantic.success} style={styles.section}>
          <View style={styles.celebrationHeader}>
            <MaterialCommunityIcons
              name="party-popper"
              size={56}
              color={colors.semantic.success}
            />
            <Text style={styles.celebrationTitle}>
              Amazing! You saved £{Math.abs(difference).toFixed(2)}! 🎉
            </Text>
            <Text style={styles.celebrationSubtitle}>
              {percentSaved.toFixed(0)}% under budget
            </Text>
          </View>
        </GlassCard>
      ) : (
        <GlassCard variant="bordered" accentColor={colors.semantic.warning} style={styles.section}>
          <View style={styles.celebrationHeader}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={colors.semantic.warning}
            />
            <Text style={styles.overspendTitle}>
              Went over by £{Math.abs(difference).toFixed(2)}
            </Text>
            <Text style={styles.overspendSubtitle}>
              No worries, it happens!
            </Text>
          </View>
        </GlassCard>
      )}

      {/* Budget Comparison Card */}
      <GlassCard variant="standard" style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="wallet-outline"
            size={20}
            color={colors.accent.primary}
          />
          <Text style={styles.sectionTitle}>Budget Breakdown</Text>
        </View>

        <View style={styles.comparisonGrid}>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>Budget</Text>
            <Text style={styles.comparisonValue}>£{budget.toFixed(2)}</Text>
          </View>

          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>Actual Spent</Text>
            <Text style={[styles.comparisonValue, !savedMoney && styles.overspendValue]}>
              £{actualTotal.toFixed(2)}
            </Text>
          </View>

          <View style={[styles.comparisonItem, styles.highlightItem]}>
            <Text style={styles.comparisonLabel}>Difference</Text>
            <Text style={[
              styles.comparisonValue,
              styles.differenceValue,
              { color: savedMoney ? colors.semantic.success : colors.semantic.danger }
            ]}>
              {savedMoney ? '+' : ''}£{Math.abs(difference).toFixed(2)}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Items Comparison Card */}
      <GlassCard variant="standard" style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="cart-outline"
            size={20}
            color={colors.accent.primary}
          />
          <Text style={styles.sectionTitle}>Items Breakdown</Text>
        </View>

        <View style={styles.itemsComparison}>
          <View style={styles.itemsRow}>
            <Text style={styles.itemsLabel}>Items Planned</Text>
            <Text style={styles.itemsValue}>{plannedItemsCount}</Text>
          </View>

          <View style={styles.itemsRow}>
            <Text style={styles.itemsLabel}>Items Purchased</Text>
            <Text style={styles.itemsValue}>
              {actualItemsCount}
              {unplannedItems.length > 0 && (
                <Text style={styles.unplannedBadge}>
                  {' '}({unplannedItems.length} unplanned)
                </Text>
              )}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Unplanned Purchases Card */}
      {unplannedItems.length > 0 && (
        <GlassCard variant="bordered" accentColor={colors.accent.secondary} style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={20}
              color={colors.accent.secondary}
            />
            <Text style={styles.sectionTitle}>
              Unplanned Purchases ({unplannedItems.length})
            </Text>
          </View>

          <View style={styles.unplannedList}>
            {unplannedItems.map((item, index) => (
              <View key={index} style={styles.unplannedItem}>
                <View style={styles.unplannedLeft}>
                  <Text style={styles.unplannedName}>{item.name}</Text>
                  <Text style={styles.unplannedQuantity}>×{item.quantity}</Text>
                </View>
                <Text style={styles.unplannedPrice}>
                  £{item.totalPrice.toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.unplannedTotal}>
              <Text style={styles.unplannedTotalLabel}>Unplanned Total</Text>
              <Text style={styles.unplannedTotalValue}>
                £{unplannedItemsTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </GlassCard>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
  celebrationHeader: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  celebrationTitle: {
    ...typography.headlineMedium,
    color: colors.semantic.success,
    marginTop: spacing.md,
    textAlign: "center",
    fontWeight: "700",
  },
  celebrationSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  overspendTitle: {
    ...typography.headlineMedium,
    color: colors.semantic.warning,
    marginTop: spacing.md,
    textAlign: "center",
  },
  overspendSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  comparisonGrid: {
    gap: spacing.md,
  },
  comparisonItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  highlightItem: {
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  comparisonLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  comparisonValue: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "700",
  },
  differenceValue: {
    fontSize: 20,
  },
  overspendValue: {
    color: colors.semantic.danger,
  },
  itemsComparison: {
    gap: spacing.sm,
  },
  itemsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  itemsLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  itemsValue: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  unplannedBadge: {
    ...typography.bodySmall,
    color: colors.accent.secondary,
  },
  unplannedList: {
    gap: spacing.sm,
  },
  unplannedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  unplannedLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  unplannedName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  unplannedQuantity: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  unplannedPrice: {
    ...typography.labelMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  unplannedTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.accent.secondary,
  },
  unplannedTotalLabel: {
    ...typography.labelMedium,
    color: colors.accent.secondary,
    fontWeight: "600",
  },
  unplannedTotalValue: {
    ...typography.labelLarge,
    color: colors.accent.secondary,
    fontWeight: "700",
  },
});
