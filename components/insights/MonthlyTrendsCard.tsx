import React from "react";
import { View, Text } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCollapsible, colors } from "@/components/ui/glass";
import { styles, CHART_WIDTH } from "./styles";

interface MonthlyTrendsCardProps {
  monthlyTrends: {
    months: any[];
  };
}

export const MonthlyTrendsCard = ({ monthlyTrends }: MonthlyTrendsCardProps) => {
  if (!monthlyTrends || monthlyTrends.months.length <= 1) return null;

  return (
    <View style={styles.section}>
      <GlassCollapsible
        title="Monthly Trends"
        icon="chart-line"
        iconColor={colors.accent.primary}
      >
        <LineChart
          data={{
            labels: monthlyTrends.months.map((m: any) => m.label),
            datasets: [
              {
                data: monthlyTrends.months.map((m: any) => m.total || 0.01),
              },
            ],
          }}
          width={CHART_WIDTH}
          height={180}
          yAxisLabel="£"
          yAxisSuffix=""
          withDots={true}
          withInnerLines={false}
          withOuterLines={false}
          chartConfig={{
            backgroundGradientFrom: "transparent",
            backgroundGradientTo: "transparent",
            color: () => colors.accent.primary,
            labelColor: () => colors.text.tertiary,
            propsForBackgroundLines: { stroke: colors.glass.border },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: colors.accent.primary,
              fill: colors.background.primary,
            },
            strokeWidth: 2,
            fillShadowGradientFrom: colors.accent.primary,
            fillShadowGradientTo: "transparent",
            fillShadowGradientFromOpacity: 0.2,
            fillShadowGradientToOpacity: 0,
            decimalPlaces: 0,
          }}
          bezier
          style={styles.chart}
        />

        {/* Month-over-month changes */}
        <View style={styles.monthChanges}>
          {monthlyTrends.months.slice(-3).map((m: any) => (
            <View key={m.month} style={styles.monthChangeItem}>
              <Text style={styles.monthChangeLabel}>{m.label}</Text>
              <Text style={styles.monthChangeAmount}>
                £{m.total.toFixed(0)}
              </Text>
              {m.change !== 0 && (
                <View
                  style={[
                    styles.changeBadge,
                    {
                      backgroundColor:
                        m.change > 0
                          ? `${colors.accent.error}20`
                          : `${colors.accent.success}20`,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={m.change > 0 ? "arrow-up" : "arrow-down"}
                    size={12}
                    color={
                      m.change > 0
                        ? colors.accent.error
                        : colors.accent.success
                    }
                  />
                  <Text
                    style={[
                      styles.changeText,
                      {
                        color:
                          m.change > 0
                            ? colors.accent.error
                            : colors.accent.success,
                      },
                    ]}
                  >
                    {Math.abs(m.change).toFixed(0)}%
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </GlassCollapsible>
    </View>
  );
};
