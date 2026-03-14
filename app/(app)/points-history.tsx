import React, { useMemo, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";

import {
  GlassScreen,
  GlassCard,
  SimpleHeader,
  GlassCollapsible,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

function GuideItem({ icon, title, desc }: { icon: keyof typeof import("@expo/vector-icons").MaterialCommunityIcons.glyphMap; title: string; desc: string }) {
  return (
    <View style={styles.guideItem}>
      <View style={styles.guideIconContainer}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.accent.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.guideItemTitle}>{title}</Text>
        <Text style={styles.guideItemDesc}>{desc}</Text>
      </View>
    </View>
  );
}

interface MonthHeader {
  _id: string;
  isMonthHeader: true;
  month: string;
}

export default function PointsHistoryScreen() {
  const router = useRouter();
  const history = useQuery(api.points.getPointsHistory, { limit: 100 });
  const pointsBalance = useQuery(api.points.getPointsBalance);
  const expiringPoints = useQuery(api.points.getExpiringPoints);

  type HistoryItem = NonNullable<typeof history>[number];
  type FlatDataItem = HistoryItem | MonthHeader;

  // Flatten grouped history into a flat array with month headers interleaved
  const flatData = useMemo(() => {
    if (!history || history.length === 0) return [] as FlatDataItem[];

    const result: FlatDataItem[] = [];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let currentMonth = "";

    history.forEach((tx) => {
      const date = new Date(tx.createdAt);
      const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

      if (monthYear !== currentMonth) {
        currentMonth = monthYear;
        result.push({ _id: `month-${monthYear}`, isMonthHeader: true, month: monthYear });
      }
      result.push(tx);
    });

    return result;
  }, [history]);

  const getIconForType = (type: string) => {
    switch (type) {
      case "earn": return "receipt";
      case "bonus": return "gift";
      case "redeem": return "cash-multiple";
      case "refund": return "undo";
      case "expire": return "clock";
      default: return "history";
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case "earn":
      case "bonus":
        return colors.semantic.success;
      case "redeem":
        return colors.accent.primary;
      case "refund":
      case "expire":
        return colors.semantic.danger;
      default:
        return colors.text.secondary;
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: FlatDataItem }) => {
      if ("isMonthHeader" in item && item.isMonthHeader) {
        return <Text style={styles.monthHeader}>{item.month}</Text>;
      }

      const tx = item as HistoryItem;
      const isPositive = tx.amount > 0;
      return (
        <GlassCard style={styles.txCard} variant="standard">
          <View style={styles.txRow}>
            <View style={[styles.iconContainer, { backgroundColor: `${getColorForType(tx.type)}20` }]}>
              <MaterialCommunityIcons name={getIconForType(tx.type)} size={20} color={getColorForType(tx.type)} />
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txTitle}>
                {tx.type === "earn" ? "Receipt Scan" :
                 tx.type === "bonus" ? "Streak Bonus" :
                 tx.type === "redeem" ? "Subscription Credit" :
                 tx.type === "refund" ? "Points Adjusted" :
                 "Points Expired"}
              </Text>
              <Text style={styles.txDate}>
                {new Date(tx.createdAt).toLocaleDateString()} · {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={[styles.txAmount, { color: isPositive ? colors.semantic.success : colors.text.primary }]}>
              {isPositive ? "+" : ""}{tx.amount} pts
            </Text>
          </View>
        </GlassCard>
      );
    },
    []
  );

  const keyExtractor = useCallback((item: FlatDataItem) => item._id, []);

  const ListHeaderComponent = useMemo(
    () => (
      <View style={{ gap: spacing.md }}>
        {/* Expiring Soon Banner */}
        {expiringPoints && (
          <GlassCard variant="bordered" accentColor={colors.semantic.warning} style={styles.expiringBanner}>
            <View style={styles.expiringHeader}>
              <MaterialCommunityIcons name="clock-alert-outline" size={20} color={colors.semantic.warning} />
              <Text style={styles.expiringTitle}>Points Expiring Soon</Text>
            </View>
            <Text style={styles.expiringText}>
              {expiringPoints.amount.toLocaleString()} points will expire on {new Date(expiringPoints.expiresAt).toLocaleDateString()}.
            </Text>
          </GlassCard>
        )}

        {/* Lifetime Stats */}
        {pointsBalance && (
          <View style={styles.statsRow}>
            <GlassCard variant="standard" style={styles.statCard}>
              <Text style={styles.statLabel}>Available</Text>
              <Text style={styles.statValue}>{pointsBalance.availablePoints.toLocaleString()}</Text>
              <Text style={styles.statSubValue}>≈ £{(pointsBalance.availablePoints / 1000).toFixed(2)}</Text>
            </GlassCard>
            <GlassCard variant="standard" style={styles.statCard}>
              <Text style={styles.statLabel}>Lifetime Earned</Text>
              <Text style={styles.statValue}>{pointsBalance.totalPoints.toLocaleString()}</Text>
              <Text style={styles.statSubValue}>Total value</Text>
            </GlassCard>
          </View>
        )}

        {/* How it Works Guide */}
        <View style={{ marginBottom: spacing.md }}>
          <GlassCollapsible title="How do Points work?" icon="help-circle-outline">
            <View style={styles.guideContent}>
              <GuideItem
                icon="cash-multiple"
                title="Conversion"
                desc="1,000 points = £1.00. Points are used as credit toward your next subscription renewal."
              />
              <GuideItem
                icon="cog"
                title="Automatic Redemption"
                desc="Once you have at least 500 points, they're automatically applied to your next bill."
              />
              <GuideItem
                icon="chart-line"
                title="Earning More"
                desc="Higher tiers (Silver, Gold, Platinum) earn more points per scan. Premium users get a 25% bonus!"
              />
              <GuideItem
                icon="clock"
                title="Expiration"
                desc="Points expire 12 months after they are earned. Use them or lose them!"
              />
            </View>
          </GlassCollapsible>
        </View>
      </View>
    ),
    [expiringPoints, pointsBalance]
  );

  const ListEmptyComponent = useMemo(
    () => {
      if (!history) {
        return <Text style={styles.loadingText}>Loading history...</Text>;
      }
      return (
        <GlassCard style={styles.emptyCard}>
          <MaterialCommunityIcons name="history" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No Points Yet</Text>
          <Text style={styles.emptySub}>Scan receipts to start earning points.</Text>
        </GlassCard>
      );
    },
    [history]
  );

  return (
    <GlassScreen>
      <SimpleHeader
        title="Points History"
        showBack
        onBack={() => router.back()}
      />

      <FlashList
        data={flatData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.content}
      />
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.md },
  loadingText: { ...typography.bodyMedium, color: colors.text.secondary, textAlign: "center", marginTop: spacing.xl },
  
  // Stats
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
  statCard: { flex: 1, padding: spacing.md, alignItems: "center" },
  statLabel: { ...typography.labelSmall, color: colors.text.tertiary, textTransform: "uppercase" },
  statValue: { ...typography.headlineSmall, color: colors.accent.primary, fontWeight: "700", marginTop: 4 },
  statSubValue: { ...typography.labelSmall, color: colors.text.tertiary, marginTop: 2 },

  // Expiring Banner
  expiringBanner: { marginBottom: spacing.md, padding: spacing.md },
  expiringHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs },
  expiringTitle: { ...typography.labelMedium, color: colors.semantic.warning, fontWeight: "700" },
  expiringText: { ...typography.bodySmall, color: colors.text.secondary },

  // Guide
  guideContent: { paddingVertical: spacing.sm, gap: spacing.md },
  guideItem: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  guideIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${colors.accent.primary}15`, justifyContent: "center", alignItems: "center" },
  guideItemTitle: { ...typography.bodyMedium, color: colors.text.primary, fontWeight: "600", marginBottom: 2 },
  guideItemDesc: { ...typography.bodySmall, color: colors.text.secondary, lineHeight: 18 },

  // History
  monthHeader: { ...typography.labelLarge, color: colors.text.secondary, marginLeft: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.sm, fontWeight: "600" },
  emptyCard: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.headlineSmall, color: colors.text.primary },
  emptySub: { ...typography.bodyMedium, color: colors.text.secondary, textAlign: "center" },
  txCard: { padding: spacing.md },
  txRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  txInfo: { flex: 1 },
  txTitle: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: "600" },
  txDate: { ...typography.bodySmall, color: colors.text.tertiary, marginTop: 2 },
  txAmount: { ...typography.headlineSmall, fontWeight: "700" },
});
