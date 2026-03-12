import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import { GlassCard, colors } from "@/components/ui/glass";
import { styles, CHART_WIDTH } from "./styles";

interface WeeklyDigestCardProps {
  digest: {
    thisWeekTotal: number;
    percentChange: number;
    tripsCount: number;
    budgetSaved: number;
    dailySparkline?: number[];
  };
  narrative: string;
  spendingRef: React.RefObject<View | null>;
}

export const WeeklyDigestCard = ({
  digest,
  narrative,
  spendingRef,
}: WeeklyDigestCardProps) => {
  return (
    <View ref={spendingRef}>
      <GlassCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="calendar-week"
            size={22}
            color={colors.accent.primary}
          />
          <Text style={styles.sectionTitle}>This Week</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatBox
            label="Spent"
            value={`£${digest.thisWeekTotal.toFixed(2)}`}
            icon="cash"
            color={colors.accent.primary}
          />
          <StatBox
            label="vs Last Week"
            value={`${digest.percentChange > 0 ? "+" : ""}${digest.percentChange.toFixed(0)}%`}
            icon={digest.percentChange > 0 ? "trending-up" : "trending-down"}
            color={
              digest.percentChange > 0
                ? colors.accent.error
                : colors.accent.success
            }
          />
          <StatBox
            label="Trips"
            value={`${digest.tripsCount}`}
            icon="shopping"
            color={colors.accent.secondary}
          />
          <StatBox
            label="Saved"
            value={`£${digest.budgetSaved.toFixed(2)}`}
            icon="piggy-bank"
            color={colors.accent.success}
          />
        </View>

        {/* Weekly Narrative */}
        <Text style={styles.weeklyNarrative}>
          {narrative}
        </Text>

        {/* Sparkline */}
        {digest.dailySparkline && digest.dailySparkline.some((v: number) => v > 0) && (
          <View style={styles.sparklineContainer}>
            <Text style={styles.sparklineLabel}>Daily spending</Text>
            <LineChart
              data={{
                labels: ["M", "T", "W", "T", "F", "S", "S"],
                datasets: [{ data: digest.dailySparkline.map((v: number) => v || 0.01) }],
              }}
              width={CHART_WIDTH}
              height={80}
              withDots={false}
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLabels={true}
              withHorizontalLabels={false}
              chartConfig={{
                backgroundGradientFrom: "transparent",
                backgroundGradientTo: "transparent",
                color: () => colors.accent.primary,
                labelColor: () => colors.text.tertiary,
                propsForBackgroundLines: { stroke: "transparent" },
                strokeWidth: 2,
                fillShadowGradientFrom: colors.accent.primary,
                fillShadowGradientTo: "transparent",
                fillShadowGradientFromOpacity: 0.3,
                fillShadowGradientToOpacity: 0,
              }}
              bezier
              style={styles.sparklineChart}
            />
          </View>
        )}
      </GlassCard>
    </View>
  );
};

const StatBox = React.memo(function StatBox({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  return (
    <View style={styles.statBox}>
      <MaterialCommunityIcons name={icon as any} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});
