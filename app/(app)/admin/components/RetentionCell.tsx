import React from "react";
import { View, Text } from "react-native";
import { colors } from "@/components/ui/glass";
import { adminStyles as styles } from "../styles";

interface RetentionCellProps {
  value: number;
}

export function RetentionCell({ value }: RetentionCellProps) {
  let backgroundColor = "transparent";
  let textColor: string = colors.text.tertiary;

  if (value >= 40) {
    backgroundColor = `rgba(0, 212, 170, 0.4)`;
    textColor = colors.accent.primary;
  } else if (value >= 25) {
    backgroundColor = `rgba(0, 212, 170, 0.25)`;
    textColor = colors.accent.primary;
  } else if (value > 0) {
    backgroundColor = `rgba(0, 212, 170, 0.15)`;
    textColor = colors.text.secondary;
  }

  return (
    <View style={[styles.retentionCell, { backgroundColor, borderRadius: 4, margin: 2 }]}>
      <Text style={[styles.retentionCellText, { color: textColor }]}>
        {value > 0 ? `${value.toFixed(0)}%` : "-"}
      </Text>
    </View>
  );
}
