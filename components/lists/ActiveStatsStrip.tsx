import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import {
  GlassCard,
  AnimatedSection,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

/**
 * ActiveStatsStrip — "ready to go" glanceable insight surfaced on the
 * Lists tab when the user is in Active mode.
 *
 * Shows this week's budget usage: sum of actualTotal vs budget across
 * completed trips in the last 7 days. Hidden entirely when the user has
 * no completed trips with a budget this week, so we never show an empty
 * zero card.
 *
 * Numbers come from `api.shoppingLists.getActiveListsStats` which
 * centralises the computation server-side.
 */
export const ActiveStatsStrip = React.memo(function ActiveStatsStrip({
  animationDelay = 85,
}: {
  animationDelay?: number;
}) {
  const stats = useQuery(api.shoppingLists.getActiveListsStats, {});

  if (!stats) return null;
  if (!stats.hasWeekBudget) return null;

  const overBudget = stats.weekSpent > stats.weekBudget;
  const budgetAccent = overBudget ? colors.semantic.danger : colors.semantic.success;
  const budgetLabel = overBudget ? "Over budget" : "Left this week";
  const budgetValue = overBudget
    ? `\u00a3${(stats.weekSpent - stats.weekBudget).toFixed(2)}`
    : `\u00a3${Math.max(0, stats.weekRemaining).toFixed(2)}`;

  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={animationDelay}>
      <View style={styles.container}>
        <GlassCard variant="standard" style={styles.statCard}>
          <MaterialCommunityIcons
            name="wallet-outline"
            size={18}
            color={budgetAccent}
          />
          <Text style={[styles.statValue, { color: budgetAccent }]}>
            {budgetValue}
          </Text>
          <Text style={styles.statLabel}>{budgetLabel}</Text>
          <Text style={styles.statFootnote}>
            {"\u00a3"}
            {stats.weekSpent.toFixed(2)} / {"\u00a3"}
            {stats.weekBudget.toFixed(2)}
          </Text>
        </GlassCard>
      </View>
    </AnimatedSection>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  statCard: {
    padding: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    ...typography.headlineSmall,
    fontWeight: "700",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: "uppercase",
  },
  statFootnote: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontSize: 10,
    marginTop: 1,
  },
});
