import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassHeader,
  GlassSkeleton,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export default function TripSummaryScreen() {
  const params = useLocalSearchParams();
  const listId = params.id as string as Id<"shoppingLists">;
  const router = useRouter();

  const summary = useQuery(api.shoppingLists.getTripSummary, { id: listId });

  if (summary === undefined) {
    return (
      <GlassScreen>
        <GlassHeader title="Trip Summary" showBack onBack={() => router.back()} />
        <View style={styles.container}>
          <GlassSkeleton variant="card" />
          <GlassSkeleton variant="card" />
          <GlassSkeleton variant="card" />
        </View>
      </GlassScreen>
    );
  }

  if (!summary) {
    return (
      <GlassScreen>
        <GlassHeader title="Trip Summary" showBack onBack={() => router.back()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Trip not found</Text>
          <GlassButton variant="primary" onPress={() => router.back()}>
            Go Back
          </GlassButton>
        </View>
      </GlassScreen>
    );
  }

  const {
    list,
    items,
    receipt,
    budget,
    actualTotal,
    difference,
    savedMoney,
    percentSaved,
    pointsEarned,
    itemCount,
    checkedCount,
  } = summary;

  const completedDate = list.completedAt
    ? new Date(list.completedAt).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Unknown";

  return (
    <GlassScreen>
      <GlassHeader
        title={list.name}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Outcome Card */}
        {budget > 0 ? (
          savedMoney ? (
            <GlassCard variant="bordered" accentColor={colors.semantic.success} style={styles.section}>
              <View style={styles.outcomeHeader}>
                <MaterialCommunityIcons
                  name="trophy"
                  size={48}
                  color={colors.semantic.success}
                />
                <Text style={styles.outcomeTitle}>
                  Saved £{Math.abs(difference).toFixed(2)}
                </Text>
                <Text style={styles.outcomeSubtitle}>
                  {percentSaved.toFixed(0)}% under budget
                </Text>
              </View>
            </GlassCard>
          ) : (
            <GlassCard variant="bordered" accentColor={colors.semantic.warning} style={styles.section}>
              <View style={styles.outcomeHeader}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={48}
                  color={colors.semantic.warning}
                />
                <Text style={[styles.outcomeTitle, { color: colors.semantic.warning }]}>
                  Over by £{Math.abs(difference).toFixed(2)}
                </Text>
                <Text style={styles.outcomeSubtitle}>
                  {Math.abs(percentSaved).toFixed(0)}% over budget
                </Text>
              </View>
            </GlassCard>
          )
        ) : (
          <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.section}>
            <View style={styles.outcomeHeader}>
              <MaterialCommunityIcons
                name="check-circle"
                size={48}
                color={colors.accent.primary}
              />
              <Text style={[styles.outcomeTitle, { color: colors.accent.primary }]}>
                Trip Complete
              </Text>
              <Text style={styles.outcomeSubtitle}>{completedDate}</Text>
            </View>
          </GlassCard>
        )}

        {/* Budget Breakdown */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="wallet-outline" size={20} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Budget Breakdown</Text>
          </View>

          {budget > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Budget</Text>
              <Text style={styles.rowValue}>£{budget.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Actual Spent</Text>
            <Text style={[styles.rowValue, actualTotal > budget && budget > 0 && { color: colors.semantic.danger }]}>
              £{actualTotal.toFixed(2)}
            </Text>
          </View>

          {budget > 0 && (
            <View style={[styles.row, styles.highlightRow]}>
              <Text style={styles.rowLabel}>Difference</Text>
              <Text style={[styles.rowValue, { color: savedMoney ? colors.semantic.success : colors.semantic.danger }]}>
                {savedMoney ? "+" : "-"}£{Math.abs(difference).toFixed(2)}
              </Text>
            </View>
          )}
        </GlassCard>

        {/* Items Summary */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cart-outline" size={20} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Items</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Items</Text>
            <Text style={styles.rowValue}>{itemCount}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Checked Off</Text>
            <Text style={styles.rowValue}>{checkedCount} / {itemCount}</Text>
          </View>

          {/* Item list */}
          <View style={styles.itemList}>
            {items.map((item) => (
              <View key={item._id} style={styles.itemRow}>
                <MaterialCommunityIcons
                  name={item.isChecked ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={18}
                  color={item.isChecked ? colors.accent.primary : colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.itemName,
                    item.isChecked && styles.itemChecked,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.actualPrice != null && (
                  <Text style={styles.itemPrice}>
                    £{item.actualPrice.toFixed(2)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Points Earned */}
        {pointsEarned > 0 && (
          <GlassCard variant="bordered" accentColor={colors.accent.secondary} style={styles.section}>
            <View style={styles.pointsRow}>
              <View style={styles.pointsIcon}>
                <MaterialCommunityIcons name="star-circle" size={32} color={colors.accent.secondary} />
              </View>
              <View style={styles.pointsText}>
                <Text style={styles.pointsTitle}>+{pointsEarned} Points Earned</Text>
                <Text style={styles.pointsSubtitle}>
                  From this shopping trip
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Receipt Link */}
        {receipt && (
          <GlassCard variant="standard" style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="receipt" size={20} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Receipt</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Store</Text>
              <Text style={styles.rowValue}>{receipt.storeName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total</Text>
              <Text style={styles.rowValue}>£{receipt.total.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Items on Receipt</Text>
              <Text style={styles.rowValue}>{receipt.items.length}</Text>
            </View>
          </GlassCard>
        )}

        {/* Trip Details */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Trip Details</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Completed</Text>
            <Text style={styles.rowValue}>{completedDate}</Text>
          </View>
          {list.storeName && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Store</Text>
              <Text style={styles.rowValue}>{list.storeName}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${colors.text.tertiary}20` }]}>
              <Text style={[styles.statusText, { color: colors.text.tertiary }]}>
                {list.status === "archived" ? "Archived" : "Completed"}
              </Text>
            </View>
          </View>
        </GlassCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  errorText: {
    ...typography.headlineMedium,
    color: colors.semantic.danger,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
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

  // Outcome card
  outcomeHeader: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  outcomeTitle: {
    ...typography.displaySmall,
    color: colors.semantic.success,
    marginTop: spacing.md,
    textAlign: "center",
    fontWeight: "700",
  },
  outcomeSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  // Rows
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  highlightRow: {
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderBottomWidth: 0,
  },
  rowLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  rowValue: {
    ...typography.labelMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },

  // Items
  itemList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  itemChecked: {
    color: colors.text.tertiary,
    textDecorationLine: "line-through",
  },
  itemPrice: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontWeight: "600",
  },

  // Points
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pointsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.accent.secondary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  pointsText: {
    flex: 1,
  },
  pointsTitle: {
    ...typography.headlineSmall,
    color: colors.accent.secondary,
    fontWeight: "700",
  },
  pointsSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Status badge
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...typography.labelSmall,
    fontWeight: "600",
  },

  bottomSpacer: {
    height: 120,
  },
});
