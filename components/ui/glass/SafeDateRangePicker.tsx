/**
 * Safe Date Range Picker Wrapper
 *
 * Falls back to simple implementation if native module isn't linked
 * Requires dev build rebuild to enable native date picker: npx expo run:android
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography, spacing } from "@/lib/design/glassTokens";
import { GlassCard } from "./GlassCard";
import { GlassButton } from "./GlassButton";
import { haptic } from "@/lib/haptics/safeHaptics";

export interface DateRange {
  startDate: number | null;
  endDate: number | null;
}

interface SafeDateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onClear: () => void;
  title?: string;
}

/**
 * Fallback implementation using quick filters only
 * Native date picker requires dev build rebuild
 */
export function SafeDateRangePicker({
  value,
  onChange,
  onClear,
  title = "Date Range",
}: SafeDateRangePickerProps) {
  const setQuickFilter = (days: number) => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    onChange({
      startDate: start.getTime(),
      endDate: end.getTime(),
    });
    haptic("light");
  };

  const hasRange = value.startDate !== null || value.endDate !== null;

  return (
    <GlassCard style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="calendar-range" size={20} color={colors.accent.primary} />
        <Text style={styles.title}>{title}</Text>
        {hasRange && (
          <Pressable onPress={onClear} hitSlop={8}>
            <MaterialCommunityIcons name="close-circle" size={20} color={colors.text.tertiary} />
          </Pressable>
        )}
      </View>

      <View style={styles.quickFilters}>
        <GlassButton
          onPress={() => setQuickFilter(7)}
          variant="secondary"
          size="sm"
          style={styles.quickButton}
        >
          Last 7 Days
        </GlassButton>
        <GlassButton
          onPress={() => setQuickFilter(30)}
          variant="secondary"
          size="sm"
          style={styles.quickButton}
        >
          Last 30 Days
        </GlassButton>
      </View>

      {hasRange && (
        <View style={styles.selectedRange}>
          <Text style={styles.selectedText}>
            {value.startDate && new Date(value.startDate).toLocaleDateString()}
            {" → "}
            {value.endDate && new Date(value.endDate).toLocaleDateString()}
          </Text>
        </View>
      )}

      <Text style={styles.note}>
        💡 Full date picker requires dev build rebuild
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  quickFilters: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickButton: {
    flex: 1,
  },
  selectedRange: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: `${colors.accent.primary}20`,
    borderRadius: 8,
  },
  selectedText: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    textAlign: "center",
  },
  note: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontSize: 10,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
});
