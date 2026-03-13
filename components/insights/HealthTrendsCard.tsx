import React from "react";
import { View, Text } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { GlassCollapsible, colors } from "@/components/ui/glass";
import { styles, CHART_WIDTH } from "./styles";

interface HealthHistoryEntry {
  score: number;
}

interface HealthTrendsCardProps {
  healthHistory: HealthHistoryEntry[];
}

export const HealthTrendsCard = ({ healthHistory }: HealthTrendsCardProps) => {
  if (!healthHistory || healthHistory.length <= 1) return null;

  return (
    <View style={styles.section}>
      <GlassCollapsible
        title="Health Trends"
        icon="heart-pulse"
        iconColor="#4ADE80"
      >
        <LineChart
          data={{
            labels: healthHistory.slice(-6).map((_h, i) => `L${i + 1}`),
            datasets: [
              {
                data: healthHistory.slice(-6).map((h) => h.score),
              },
            ],
          }}
          width={CHART_WIDTH}
          height={150}
          yAxisLabel=""
          yAxisSuffix=""
          fromZero
          chartConfig={{
            backgroundGradientFrom: "transparent",
            backgroundGradientTo: "transparent",
            color: () => "#4ADE80",
            labelColor: () => colors.text.tertiary,
            propsForBackgroundLines: { stroke: colors.glass.border },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: "#4ADE80",
              fill: colors.background.primary,
            },
            strokeWidth: 2,
            fillShadowGradientFrom: "#4ADE80",
            fillShadowGradientTo: "transparent",
            fillShadowGradientFromOpacity: 0.2,
            fillShadowGradientToOpacity: 0,
            decimalPlaces: 0,
          }}
          bezier
          style={styles.chart}
        />
        <Text style={styles.healthTrendSummary}>
          Your average health score is{" "}
          <Text style={{ color: "#4ADE80", fontWeight: "700" }}>
            {Math.round(
              healthHistory.reduce((s, h) => s + h.score, 0) /
                healthHistory.length
            )}
          </Text>
          . {healthHistory[healthHistory.length - 1].score >= healthHistory[0].score ? "You're getting healthier! 🚀" : "Keep aiming for those swaps!"}
        </Text>
      </GlassCollapsible>
    </View>
  );
};
