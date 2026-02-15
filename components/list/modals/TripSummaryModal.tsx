/**
 * TripSummaryModal - Full-screen overlay shown when the user completes a shopping trip.
 *
 * Displays trip statistics (items checked, duration, budget usage), savings vs
 * estimates, unchecked item management, and actions to scan receipt or finish.
 */

import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassButton,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { haptic } from "@/lib/haptics/safeHaptics";
import { useTripSummary, type TripStats } from "@/hooks/useTripSummary";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TripSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  onFinish: () => void;
  onScanReceipt: () => void;
  onContinueShopping: () => void;
  onRemoveItem: (itemId: string) => void;
  onMoveItem: (item: {
    name: string;
    estimatedPrice?: number;
    quantity: number;
  }) => void;
  stats: TripStats | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return `\u00A3${Math.abs(amount).toFixed(2)}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TripSummaryModal({
  visible,
  onClose,
  onFinish,
  onScanReceipt,
  onContinueShopping,
  onRemoveItem,
  onMoveItem,
  stats,
}: TripSummaryModalProps) {
  const display = useTripSummary(stats);

  function handleFinish() {
    haptic("success");
    onFinish();
  }

  if (!stats || !display) return null;

  // Budget result section logic
  const budgetDiff = stats.budget > 0 ? stats.budget - stats.actualSpent : 0;
  const isExactlyOnBudget =
    stats.budget > 0 && Math.abs(budgetDiff) < 0.01;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Scrollable content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Header ─────────────────────────────────────────── */}
            <View style={styles.header}>
              <View style={styles.headerIconContainer}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={40}
                  color={colors.accent.primary}
                />
              </View>
              <Text style={styles.headerTitle}>Trip Complete!</Text>
              {stats.storeName ? (
                <Text style={styles.headerSubtitle}>{stats.storeName}</Text>
              ) : null}
            </View>

            {/* ── Stats Row ──────────────────────────────────────── */}
            <View style={styles.statsRow}>
              {/* Items */}
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {stats.checkedCount}/{stats.totalItems}
                </Text>
                <Text style={styles.statLabel}>checked</Text>
              </View>

              {/* Time */}
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{display.durationLabel}</Text>
                <Text style={styles.statLabel}>in store</Text>
              </View>

              {/* Budget % */}
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {stats.budget > 0
                    ? `${Math.round(display.budgetPercentage)}%`
                    : "--"}
                </Text>
                <Text style={styles.statLabel}>used</Text>
              </View>
            </View>

            {/* ── Budget Result ───────────────────────────────────── */}
            {stats.budget > 0 && (
              <View
                style={[
                  styles.budgetResult,
                  isExactlyOnBudget
                    ? styles.budgetOnTarget
                    : display.isUnderBudget
                      ? styles.budgetUnder
                      : styles.budgetOver,
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    isExactlyOnBudget
                      ? "check"
                      : display.isUnderBudget
                        ? "trending-down"
                        : "trending-up"
                  }
                  size={24}
                  color={
                    isExactlyOnBudget
                      ? colors.accent.primary
                      : display.isUnderBudget
                        ? colors.semantic.success
                        : colors.semantic.danger
                  }
                />
                <Text
                  style={[
                    styles.budgetResultText,
                    isExactlyOnBudget
                      ? styles.budgetOnTargetText
                      : display.isUnderBudget
                        ? styles.budgetUnderText
                        : styles.budgetOverText,
                  ]}
                >
                  {isExactlyOnBudget
                    ? "Right on budget!"
                    : display.isUnderBudget
                      ? `${formatPrice(budgetDiff)} under budget`
                      : `${formatPrice(budgetDiff)} over budget`}
                </Text>
              </View>
            )}

            {/* ── Savings Callout ─────────────────────────────────── */}
            {stats.savings !== 0 && (
              <View style={styles.savingsCallout}>
                <Text
                  style={[
                    styles.savingsText,
                    display.savingsIsPositive
                      ? styles.savingsPositive
                      : styles.savingsNegative,
                  ]}
                >
                  {display.savingsIsPositive
                    ? `You saved ${formatPrice(stats.savings)} vs estimates`
                    : `${formatPrice(stats.savings)} more than estimated`}
                </Text>
              </View>
            )}

            {/* ── Per-Store Breakdown (multi-store trips) ───────── */}
            {display.isMultiStore && (
              <View style={styles.storeBreakdown}>
                <Text style={styles.storeBreakdownHeader}>Per-Store Breakdown</Text>
                {display.storeBreakdownLabels.map((entry) => (
                  <View key={entry.storeId} style={styles.storeBreakdownRow}>
                    <View style={styles.storeBreakdownDot} />
                    <Text style={styles.storeBreakdownLabel}>{entry.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── Unchecked Items ─────────────────────────────────── */}
            {display.hasUncheckedItems && (
              <View style={styles.uncheckedSection}>
                <Text style={styles.uncheckedHeader}>
                  {stats.uncheckedCount} item
                  {stats.uncheckedCount !== 1 ? "s" : ""} not purchased
                </Text>

                {stats.uncheckedItems.map((item) => (
                  <View key={item._id} style={styles.uncheckedItem}>
                    <View style={styles.uncheckedItemInfo}>
                      <Text style={styles.uncheckedItemName} numberOfLines={1}>
                        {item.name}
                        {item.quantity > 1 ? ` \u00D7${item.quantity}` : ""}
                      </Text>
                      {item.estimatedPrice !== undefined &&
                      item.estimatedPrice > 0 ? (
                        <Text style={styles.uncheckedItemPrice}>
                          Est. {formatPrice(item.estimatedPrice * item.quantity)}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.uncheckedItemActions}>
                      <Pressable
                        style={styles.uncheckedActionBtn}
                        onPress={() => {
                          haptic("light");
                          onRemoveItem(item._id);
                        }}
                        accessibilityLabel={`Remove ${item.name}`}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={18}
                          color={colors.text.secondary}
                        />
                      </Pressable>

                      <Pressable
                        style={styles.uncheckedActionBtn}
                        onPress={() => {
                          haptic("light");
                          onMoveItem({
                            name: item.name,
                            estimatedPrice: item.estimatedPrice,
                            quantity: item.quantity,
                          });
                        }}
                        accessibilityLabel={`Move ${item.name} to another list`}
                      >
                        <MaterialCommunityIcons
                          name="arrow-right"
                          size={18}
                          color={colors.text.secondary}
                        />
                      </Pressable>
                    </View>
                  </View>
                ))}

                <Text style={styles.uncheckedNote}>
                  Unchecked items stay on the list
                </Text>
              </View>
            )}

            {/* ── Pantry Note ─────────────────────────────────────── */}
            <View style={styles.pantryNote}>
              <MaterialCommunityIcons
                name="information-outline"
                size={16}
                color={colors.text.tertiary}
              />
              <Text style={styles.pantryNoteText}>
                Checked items will be restocked to your pantry
              </Text>
            </View>
          </ScrollView>

          {/* ── Sticky Action Buttons ─────────────────────────────── */}
          <View style={styles.actionsContainer}>
            <GlassButton
              variant="ghost"
              icon="cart-plus"
              onPress={onContinueShopping}
            >
              Continue Shopping
            </GlassButton>
            <View style={styles.actionsRow}>
              <GlassButton
                variant="secondary"
                icon="camera"
                onPress={onScanReceipt}
                style={styles.actionBtn}
              >
                Scan Receipt
              </GlassButton>
              <GlassButton
                variant="primary"
                icon="check-circle-outline"
                onPress={handleFinish}
                style={styles.actionBtn}
              >
                Finish Trip
              </GlassButton>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing["3xl"],
  },

  // ── Header ──────────────────────────────────────────
  header: {
    alignItems: "center",
    marginBottom: spacing["2xl"],
  },
  headerIconContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.headlineLarge,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },

  // ── Stats Row ───────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  statValue: {
    ...typography.numberSmall,
    color: colors.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },

  // ── Budget Result ───────────────────────────────────
  budgetResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  budgetUnder: {
    backgroundColor: `${colors.semantic.success}12`,
    borderColor: `${colors.semantic.success}30`,
  },
  budgetOver: {
    backgroundColor: `${colors.semantic.danger}12`,
    borderColor: `${colors.semantic.danger}30`,
  },
  budgetOnTarget: {
    backgroundColor: `${colors.accent.primary}12`,
    borderColor: `${colors.accent.primary}30`,
  },
  budgetResultText: {
    ...typography.labelLarge,
    flex: 1,
  },
  budgetUnderText: {
    color: colors.semantic.success,
  },
  budgetOverText: {
    color: colors.semantic.danger,
  },
  budgetOnTargetText: {
    color: colors.accent.primary,
  },

  // ── Savings Callout ─────────────────────────────────
  savingsCallout: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  savingsText: {
    ...typography.bodyMedium,
    fontWeight: "500",
  },
  savingsPositive: {
    color: colors.semantic.success,
  },
  savingsNegative: {
    color: colors.semantic.danger,
  },

  // ── Store Breakdown ─────────────────────────────────
  storeBreakdown: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  storeBreakdownHeader: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  storeBreakdownRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  storeBreakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.primary,
  },
  storeBreakdownLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },

  // ── Unchecked Items ─────────────────────────────────
  uncheckedSection: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  uncheckedHeader: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  uncheckedItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  uncheckedItemInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  uncheckedItemName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  uncheckedItemPrice: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  uncheckedItemActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  uncheckedActionBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass.backgroundHover,
    justifyContent: "center",
    alignItems: "center",
  },
  uncheckedNote: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.md,
    fontStyle: "italic",
  },

  // ── Pantry Note ─────────────────────────────────────
  pantryNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  pantryNoteText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    flex: 1,
  },

  // ── Actions ─────────────────────────────────────────
  actionsContainer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 75,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    backgroundColor: colors.background.primary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
