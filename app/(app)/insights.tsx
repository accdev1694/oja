import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassHeader,
  SkeletonCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export default function InsightsScreen() {
  const router = useRouter();
  const digest = useQuery(api.insights.getWeeklyDigest);
  const savingsJar = useQuery(api.insights.getSavingsJar);
  const streaks = useQuery(api.insights.getStreaks);
  const achievements = useQuery(api.insights.getAchievements);
  const personalBests = useQuery(api.insights.getPersonalBests);
  const monthlyTrends = useQuery(api.insights.getMonthlyTrends);

  const loading = digest === undefined;

  if (loading) {
    return (
      <GlassScreen>
        <GlassHeader title="Insights" showBack onBack={() => router.back()} />
        <View style={styles.loading}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <GlassHeader title="Insights" subtitle="Your shopping intelligence" showBack onBack={() => router.back()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Weekly Digest */}
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="calendar-week" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>This Week</Text>
          </View>
          {digest && (
            <View style={styles.statsGrid}>
              <StatBox label="Spent" value={`£${digest.thisWeekTotal.toFixed(2)}`} icon="cash" color={colors.accent.primary} />
              <StatBox
                label="vs Last Week"
                value={`${digest.percentChange > 0 ? "+" : ""}${digest.percentChange.toFixed(0)}%`}
                icon={digest.percentChange > 0 ? "trending-up" : "trending-down"}
                color={digest.percentChange > 0 ? colors.semantic.danger : colors.semantic.success}
              />
              <StatBox label="Trips" value={`${digest.tripsCount}`} icon="shopping" color={colors.accent.secondary} />
              <StatBox label="Saved" value={`£${digest.budgetSaved.toFixed(2)}`} icon="piggy-bank" color={colors.semantic.success} />
            </View>
          )}
        </GlassCard>

        {/* Savings Jar */}
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="piggy-bank" size={24} color={colors.semantic.success} />
            <Text style={styles.sectionTitle}>Savings Jar</Text>
          </View>
          {savingsJar && (
            <View style={styles.savingsJarContent}>
              <Text style={styles.bigNumber}>£{savingsJar.totalSaved.toFixed(2)}</Text>
              <Text style={styles.savingsSubtext}>
                Saved across {savingsJar.tripsCount} trip{savingsJar.tripsCount !== 1 ? "s" : ""}
                {savingsJar.averageSaved > 0 && ` • £${savingsJar.averageSaved.toFixed(2)} avg`}
              </Text>
            </View>
          )}
        </GlassCard>

        {/* Streaks */}
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="fire" size={24} color={colors.accent.secondary} />
            <Text style={styles.sectionTitle}>Streaks</Text>
          </View>
          {streaks && streaks.length > 0 ? (
            streaks.map((streak: any) => (
              <View key={streak._id} style={styles.streakRow}>
                <View style={styles.streakInfo}>
                  <Text style={styles.streakType}>{streak.type.replace(/_/g, " ")}</Text>
                  <Text style={styles.streakCount}>{streak.currentCount} days</Text>
                </View>
                <Text style={styles.streakBest}>Best: {streak.longestCount}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Complete shopping trips to build streaks!</Text>
          )}
        </GlassCard>

        {/* Personal Bests */}
        {personalBests && (
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="trophy" size={24} color={colors.accent.secondary} />
              <Text style={styles.sectionTitle}>Personal Bests</Text>
            </View>
            <View style={styles.bestsGrid}>
              <BestItem icon="cash-minus" label="Biggest Saving" value={`£${personalBests.biggestSaving.toFixed(2)}`} />
              <BestItem icon="fire" label="Longest Streak" value={`${personalBests.longestStreak} days`} />
              <BestItem icon="cart" label="Most Items" value={`${personalBests.mostItemsInTrip}`} />
              <BestItem icon="tag-outline" label="Cheapest Trip" value={`£${personalBests.cheapestTrip.toFixed(2)}`} />
            </View>
          </GlassCard>
        )}

        {/* Achievements */}
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="medal" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Achievements</Text>
          </View>
          {achievements && achievements.length > 0 ? (
            <View style={styles.achievementsGrid}>
              {achievements.map((a: any) => (
                <View key={a._id} style={styles.achievementBadge}>
                  <MaterialCommunityIcons name={a.icon as any || "star"} size={28} color={colors.accent.secondary} />
                  <Text style={styles.achievementTitle}>{a.title}</Text>
                  <Text style={styles.achievementDesc}>{a.description}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Keep shopping to unlock achievements!</Text>
          )}
        </GlassCard>

        {/* Monthly Trends */}
        {monthlyTrends && monthlyTrends.length > 0 && (
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="chart-line" size={24} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Monthly Trends</Text>
            </View>
            {monthlyTrends.map((m: any) => (
              <View key={m.month} style={styles.trendRow}>
                <Text style={styles.trendMonth}>{m.month}</Text>
                <Text style={styles.trendAmount}>£{m.total.toFixed(2)}</Text>
                <Text style={styles.trendTrips}>{m.trips} trips</Text>
              </View>
            ))}
          </GlassCard>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </GlassScreen>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BestItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.bestItem}>
      <MaterialCommunityIcons name={icon as any} size={20} color={colors.accent.secondary} />
      <Text style={styles.bestValue}>{value}</Text>
      <Text style={styles.bestLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  section: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { ...typography.headlineSmall, color: colors.text.primary },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statBox: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    padding: spacing.md,
    gap: 4,
  },
  statValue: { ...typography.headlineSmall, fontWeight: "700" },
  statLabel: { ...typography.bodySmall, color: colors.text.tertiary },
  savingsJarContent: { alignItems: "center", paddingVertical: spacing.md },
  bigNumber: { fontSize: 40, fontWeight: "800", color: colors.semantic.success },
  savingsSubtext: { ...typography.bodyMedium, color: colors.text.tertiary, marginTop: spacing.xs },
  streakRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  streakInfo: { gap: 2 },
  streakType: { ...typography.bodyMedium, color: colors.text.primary, fontWeight: "600", textTransform: "capitalize" },
  streakCount: { ...typography.bodySmall, color: colors.accent.secondary },
  streakBest: { ...typography.bodySmall, color: colors.text.tertiary },
  bestsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  bestItem: {
    width: "47%",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    padding: spacing.md,
    gap: 4,
  },
  bestValue: { ...typography.bodyLarge, color: colors.accent.secondary, fontWeight: "700" },
  bestLabel: { ...typography.bodySmall, color: colors.text.tertiary },
  achievementsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  achievementBadge: {
    width: "30%",
    alignItems: "center",
    backgroundColor: `${colors.accent.secondary}15`,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 4,
  },
  achievementTitle: { ...typography.labelSmall, color: colors.text.primary, textAlign: "center" },
  achievementDesc: { ...typography.bodySmall, color: colors.text.tertiary, textAlign: "center", fontSize: 10 },
  emptyText: { ...typography.bodyMedium, color: colors.text.tertiary, textAlign: "center", paddingVertical: spacing.md },
  trendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  trendMonth: { ...typography.bodyMedium, color: colors.text.primary, fontWeight: "500", width: 80 },
  trendAmount: { ...typography.bodyMedium, color: colors.accent.primary, fontWeight: "600" },
  trendTrips: { ...typography.bodySmall, color: colors.text.tertiary, width: 60, textAlign: "right" },
});
