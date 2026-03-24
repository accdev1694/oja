import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  AnimatedSection,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";
import { Doc } from "@/convex/_generated/dataModel";

const HistoryStatsStrip = React.memo(function HistoryStatsStrip({
  history,
}: {
  history: Doc<"shoppingLists">[];
}) {
  const stats = useMemo(() => {
    let totalSpent = 0;
    let savingsSum = 0;
    let savingsCount = 0;
    const storeSet = new Set();

    for (const list of history) {
      if (list.actualTotal && list.actualTotal > 0) {
        totalSpent += list.actualTotal;
      }

      if (list.budget && list.budget > 0 && list.actualTotal && list.actualTotal > 0) {
        const diff = list.budget - list.actualTotal;
        if (diff > 0) {
          savingsSum += diff;
          savingsCount += 1;
        }
      }

      if (list.storeSegments && list.storeSegments.length > 0) {
        for (const seg of list.storeSegments) {
          storeSet.add(seg.storeName);
        }
      } else if (list.storeName) {
        storeSet.add(list.storeName);
      }
    }

    return {
      totalSpent,
      avgSavings: savingsCount > 0 ? savingsSum / savingsCount : 0,
      tripCount: history.length,
      storeCount: storeSet.size,
    };
  }, [history]);

  if (history.length === 0) return null;

  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={125}>
      <View style={styles.container}>
        {/* Row 1: Spending */}
        <View style={styles.statsRow}>
          <GlassCard variant="standard" style={styles.statCard}>
            <MaterialCommunityIcons name="wallet-outline" size={18} color={colors.accent.primary} />
            <Text style={styles.statValue}>
              £{stats.totalSpent.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </GlassCard>
          <GlassCard variant="standard" style={styles.statCard}>
            <MaterialCommunityIcons name="piggy-bank-outline" size={18} color={colors.semantic.success} />
            <Text style={[styles.statValue, { color: colors.semantic.success }]}>
              £{stats.avgSavings.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Avg Savings</Text>
          </GlassCard>
        </View>

        {/* Row 2: Activity */}
        <View style={styles.statsRow}>
          <GlassCard variant="standard" style={styles.statCard}>
            <MaterialCommunityIcons name="cart-check" size={18} color={colors.accent.primary} />
            <Text style={styles.statValue}>{stats.tripCount}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </GlassCard>
          <GlassCard variant="standard" style={styles.statCard}>
            <MaterialCommunityIcons name="store" size={18} color={colors.accent.primary} />
            <Text style={styles.statValue}>{stats.storeCount}</Text>
            <Text style={styles.statLabel}>Stores</Text>
          </GlassCard>
        </View>
      </View>
    </AnimatedSection>
  );
});

export { HistoryStatsStrip };

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    ...typography.headlineSmall,
    color: colors.accent.primary,
    fontWeight: "700",
    marginTop: 2,
  },
  statLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: "uppercase",
  },
});
