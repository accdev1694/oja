import React from "react";
import { View, Text } from "react-native";
import { GlassCollapsible, colors } from "@/components/ui/glass";
import { styles } from "./styles";

const CATEGORY_COLORS = colors.chart;

interface CategoryBreakdownCardProps {
  categoryBreakdown: any[];
  categoryTotal: number;
}

export const CategoryBreakdownCard = ({ 
  categoryBreakdown, 
  categoryTotal 
}: CategoryBreakdownCardProps) => {
  if (!categoryBreakdown || categoryBreakdown.length === 0) return null;

  return (
    <View style={styles.section}>
      <GlassCollapsible
        title="Top Categories"
        icon="chart-pie"
        iconColor={colors.accent.secondary}
        badge={categoryBreakdown.length}
      >
        <View style={styles.categoryList}>
          {categoryBreakdown.map((cat: any, i: number) => {
            const pct = categoryTotal > 0 ? (cat.total / categoryTotal) * 100 : 0;
            const barColor = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
            return (
              <View key={cat.category} style={styles.categoryRow}>
                <View style={styles.categoryLabelRow}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: barColor },
                    ]}
                  />
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {cat.category}
                  </Text>
                  <Text style={styles.categoryAmount}>
                    £{cat.total.toFixed(0)}
                  </Text>
                </View>
                <View style={styles.categoryBarTrack}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </GlassCollapsible>
    </View>
  );
};
