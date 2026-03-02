import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassScreen,
  GlassCard,
  SimpleHeader,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

export default function PointsHistoryScreen() {
  const router = useRouter();
  const history = useQuery(api.points.getPointsHistory, { limit: 100 });
  const pointsBalance = useQuery(api.points.getPointsBalance);

  const groupedHistory = useMemo(() => {
    if (!history) return [];
    
    const groups: { month: string; transactions: any[] }[] = [];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    history.forEach(tx => {
      const date = new Date(tx.createdAt);
      const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      
      let group = groups.find(g => g.month === monthYear);
      if (!group) {
        group = { month: monthYear, transactions: [] };
        groups.push(group);
      }
      group.transactions.push(tx);
    });

    return groups;
  }, [history]);

  const getIconForType = (type: string) => {
    switch (type) {
      case "earn": return "camera";
      case "bonus": return "star";
      case "redeem": return "cash-register";
      case "refund": return "undo";
      case "expire": return "clock-alert";
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

  return (
    <GlassScreen>
      <SimpleHeader
        title="Points History"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Lifetime Stats */}
        {pointsBalance && (
          <View style={styles.statsRow}>
            <GlassCard variant="standard" style={styles.statCard}>
              <Text style={styles.statLabel}>Lifetime Earned</Text>
              <Text style={styles.statValue}>{pointsBalance.totalPoints.toLocaleString()}</Text>
            </GlassCard>
            <GlassCard variant="standard" style={styles.statCard}>
              <Text style={styles.statLabel}>Total Redeemed</Text>
              <Text style={styles.statValue}>{pointsBalance.pointsUsed.toLocaleString()}</Text>
            </GlassCard>
          </View>
        )}

        {!history ? (
          <Text style={styles.loadingText}>Loading history...</Text>
        ) : history.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <MaterialCommunityIcons name="history" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Points Yet</Text>
            <Text style={styles.emptySub}>Scan receipts to start earning points.</Text>
          </GlassCard>
        ) : (
          groupedHistory.map((group) => (
            <View key={group.month} style={styles.monthGroup}>
              <Text style={styles.monthHeader}>{group.month}</Text>
              {group.transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <GlassCard key={tx._id} style={styles.txCard} variant="standard">
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
              })}
            </View>
          ))
        )}
      </ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.md, gap: spacing.md },
  loadingText: { ...typography.bodyMedium, color: colors.text.secondary, textAlign: "center", marginTop: spacing.xl },
  
  // Stats
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
  statCard: { flex: 1, padding: spacing.md, alignItems: "center" },
  statLabel: { ...typography.labelSmall, color: colors.text.tertiary, textTransform: "uppercase" },
  statValue: { ...typography.headlineSmall, color: colors.accent.primary, fontWeight: "700", marginTop: 4 },

  // History
  monthGroup: { gap: spacing.sm },
  monthHeader: { ...typography.labelLarge, color: colors.text.secondary, marginLeft: spacing.xs, marginTop: spacing.sm, fontWeight: "600" },
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
