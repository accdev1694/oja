import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassScreen,
  GlassCard,
  SimpleHeader,
  GlassSkeleton,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export default function PriceHistoryScreen() {
  const { itemName } = useLocalSearchParams();
  const name = (itemName as string) || "";

  const priceHistory = useQuery(api.priceHistory.getByItemName, {
    itemName: name,
  });
  const priceStats = useQuery(api.priceHistory.getPriceStats, {
    itemName: name,
  });
  const trend = useQuery(api.priceHistory.getPriceTrend, {
    itemName: name,
  });

  if (priceHistory === undefined || priceStats === undefined) {
    return (
      <GlassScreen>
        <SimpleHeader title={name} subtitle="Loading price history..." />
        <View style={styles.container}>
          <GlassSkeleton variant="card" />
          <GlassSkeleton variant="card" />
        </View>
      </GlassScreen>
    );
  }

  if (!priceHistory || priceHistory.length === 0) {
    return (
      <GlassScreen>
        <SimpleHeader title={name} subtitle="No price history" />
        <View style={styles.container}>
          <GlassCard variant="standard">
            <Text style={styles.emptyText}>
              No price history available for this item yet. Buy it a few times to start tracking prices!
            </Text>
          </GlassCard>
        </View>
      </GlassScreen>
    );
  }

  const trendIcon =
    trend === "increasing"
      ? "⬆️"
      : trend === "decreasing"
      ? "⬇️"
      : "➡️";

  const trendColor =
    trend === "increasing"
      ? "#EF4444"
      : trend === "decreasing"
      ? "#10B981"
      : colors.text.secondary;

  return (
    <GlassScreen>
      <SimpleHeader
        title={name}
        subtitle={`${priceHistory.length} purchases • Trend ${trendIcon}`}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Price Stats */}
        {priceStats && (
          <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="chart-line"
                size={20}
                color={colors.accent.primary}
              />
              <Text style={styles.sectionTitle}>Price Summary</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Average</Text>
                <Text style={styles.statValue}>£{priceStats.average.toFixed(2)}</Text>
              </View>

              <View style={[styles.statItem, styles.highlightStat]}>
                <Text style={[styles.statLabel, styles.highlightLabel]}>Lowest</Text>
                <Text style={[styles.statValue, styles.highlightValue]}>
                  £{priceStats.min.toFixed(2)}
                </Text>
                {priceStats.lowestStore && (
                  <Text style={styles.storeText}>{priceStats.lowestStore}</Text>
                )}
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Highest</Text>
                <Text style={styles.statValue}>£{priceStats.max.toFixed(2)}</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Price Trend */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.trendIcon}>{trendIcon}</Text>
            <Text style={styles.sectionTitle}>Price Trend</Text>
          </View>

          <Text style={[styles.trendText, { color: trendColor }]}>
            {trend === "increasing" && "Price is increasing over time"}
            {trend === "decreasing" && "Price is decreasing over time"}
            {trend === "stable" && "Price is stable"}
          </Text>
        </GlassCard>

        {/* Price History List */}
        <GlassCard variant="standard" style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="history"
              size={20}
              color={colors.accent.primary}
            />
            <Text style={styles.sectionTitle}>Purchase History</Text>
          </View>

          {priceHistory.map((entry, index) => (
            <View key={entry._id} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>
                  {new Date(entry.purchaseDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
                <Text style={styles.historyStore}>{entry.storeName}</Text>
              </View>

              <View style={styles.historyRight}>
                <Text style={styles.historyPrice}>
                  £{entry.unitPrice.toFixed(2)}
                </Text>
                {entry.quantity > 1 && (
                  <Text style={styles.historyQuantity}>x{entry.quantity}</Text>
                )}
              </View>
            </View>
          ))}
        </GlassCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // Sections
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

  // Empty state
  emptyText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
  },

  // Stats
  statsGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.glass.background,
    borderRadius: 12,
  },
  highlightStat: {
    backgroundColor: `${colors.accent.primary}15`,
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  highlightLabel: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
  statValue: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "700",
  },
  highlightValue: {
    color: colors.accent.primary,
  },
  storeText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },

  // Trend
  trendIcon: {
    fontSize: 20,
  },
  trendText: {
    ...typography.bodyMedium,
    fontWeight: "600",
  },

  // History List
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  historyStore: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyPrice: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
    marginBottom: 2,
  },
  historyQuantity: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  bottomSpacer: {
    height: 140,
  },
});
