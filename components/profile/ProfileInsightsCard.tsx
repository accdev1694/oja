import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";

import { api } from "@/convex/_generated/api";
import {
  GlassCard,
  AnimatedSection,
  SkeletonCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

/**
 * Inline preview of the user's Weekly Insights — shown on the Profile tab
 * above the NavigationLinks so users get a glanceable summary without
 * having to open the full /insights screen. Tapping opens /insights.
 *
 * Sources `api.insights.getWeeklyDigest` which is already generated and
 * returns this-week vs last-week spending, budget saved and trip counts.
 */
export function ProfileInsightsCard({ animationDelay = 75 }: { animationDelay?: number }) {
  const router = useRouter();
  const digest = useQuery(api.insights.getWeeklyDigest, {});

  // Loading — Convex returns `undefined` while the query is in flight.
  // Render a skeleton so the profile layout doesn't pop when data arrives.
  if (digest === undefined) {
    return (
      <View style={styles.skeletonWrapper}>
        <SkeletonCard />
      </View>
    );
  }

  // Unauthenticated / no data — `null` means the server returned nothing.
  // Nothing worth surfacing → stay hidden.
  if (digest === null) return null;
  const hasActivity =
    digest.thisWeekTotal > 0 || digest.budgetSaved > 0 || digest.tripsCount > 0;
  if (!hasActivity) return null;

  // Treat anything that rounds to 0 as "no change" so we never display
  // "-0%" from a tiny negative percentChange like -0.3.
  const rawChange = digest.percentChange;
  const roundedChange = Math.abs(rawChange) < 0.5 ? 0 : Math.round(rawChange);
  const hasComparison = digest.lastWeekTotal > 0;
  const trendDown = roundedChange < 0;
  const trendUp = roundedChange > 0;
  const trendColor = trendDown
    ? colors.semantic.success
    : trendUp
      ? colors.semantic.danger
      : colors.text.tertiary;
  const trendIcon = trendDown
    ? "trending-down"
    : trendUp
      ? "trending-up"
      : "trending-neutral";
  const trendLabel = `${trendUp ? "+" : ""}${roundedChange}%`;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(app)/insights");
  };

  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={animationDelay}>
      <Pressable onPress={handlePress}>
        <GlassCard
          variant="bordered"
          accentColor={colors.accent.primary}
          style={styles.card}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <MaterialCommunityIcons
                name="chart-line"
                size={18}
                color={colors.accent.primary}
              />
              <Text style={styles.title}>This week</Text>
            </View>
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>View all</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={16}
                color={colors.text.tertiary}
              />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {"\u00a3"}
                {digest.thisWeekTotal.toFixed(2)}
              </Text>
              <View style={styles.statLabelRow}>
                <Text style={styles.statLabel}>Spent</Text>
                {hasComparison && (
                  <View style={styles.trendChip}>
                    <MaterialCommunityIcons
                      name={trendIcon}
                      size={12}
                      color={trendColor}
                    />
                    <Text style={[styles.trendText, { color: trendColor }]}>
                      {trendLabel}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.semantic.success }]}>
                {"\u00a3"}
                {digest.budgetSaved.toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.stat}>
              <Text style={styles.statValue}>{digest.tripsCount}</Text>
              <Text style={styles.statLabel}>
                {digest.tripsCount === 1 ? "Trip" : "Trips"}
              </Text>
            </View>
          </View>
        </GlassCard>
      </Pressable>
    </AnimatedSection>
  );
}

const styles = StyleSheet.create({
  skeletonWrapper: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
  },
  tapHintText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: "uppercase",
  },
  trendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  trendText: {
    ...typography.labelSmall,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.glass.border,
  },
});
