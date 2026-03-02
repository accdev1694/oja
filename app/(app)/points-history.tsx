import React from "react";
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
  const history = useQuery(api.points.getPointsHistory, { limit: 50 });

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
        {!history ? (
          <Text style={styles.loadingText}>Loading history...</Text>
        ) : history.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <MaterialCommunityIcons name="history" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Points Yet</Text>
            <Text style={styles.emptySub}>Scan receipts to start earning points.</Text>
          </GlassCard>
        ) : (
          history.map((tx) => {
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
          })
        )}
      </ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.md, gap: spacing.sm },
  loadingText: { ...typography.bodyMedium, color: colors.text.secondary, textAlign: "center", marginTop: spacing.xl },
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
