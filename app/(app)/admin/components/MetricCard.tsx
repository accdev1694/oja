import React, { ComponentProps } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/components/ui/glass";
import { adminStyles as styles } from "../styles";

interface MetricCardProps {
  label: string;
  value: number;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  /** Optional trend percentage (e.g. 12 for +12%, -5 for -5%) */
  trend?: number;
}

export function MetricCard({ label, value, icon, trend }: MetricCardProps) {
  const safeValue = typeof value === "number" ? value : 0;
  
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.accent.primary} />
      <Text style={styles.metricValue}>{safeValue.toLocaleString()}</Text>
      
      {trend !== undefined && (
        <View style={localStyles.trendContainer}>
          <MaterialCommunityIcons 
            name={trend >= 0 ? "arrow-up" : "arrow-down"} 
            size={10} 
            color={trend >= 0 ? colors.semantic.success : colors.semantic.danger} 
          />
          <Text style={[
            localStyles.trendText, 
            { color: trend >= 0 ? colors.semantic.success : colors.semantic.danger }
          ]}>
            {Math.abs(trend)}%
          </Text>
        </View>
      )}
      
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const localStyles = StyleSheet.create({
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
