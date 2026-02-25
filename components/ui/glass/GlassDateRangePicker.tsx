import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography, spacing, borderRadius } from "@/lib/design/glassTokens";
import { GlassCard } from "./GlassCard";
import { GlassButton } from "./GlassButton";
import { GlassCapsuleSwitcher } from "./GlassCapsuleSwitcher";
import { haptic } from "@/lib/haptics/safeHaptics";

export interface DateRange {
  startDate: number | null;
  endDate: number | null;
}

interface GlassDateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onClear: () => void;
  title?: string;
}

export function GlassDateRangePicker({
  value,
  onChange,
  onClear,
  title = "Date Range",
}: GlassDateRangePickerProps) {
  const [showPicker, setShowPicker] = useState<"start" | "end" | null>(null);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(null);
    if (event.type === "set" && selectedDate) {
      const timestamp = selectedDate.getTime();
      if (showPicker === "start") {
        onChange({ ...value, startDate: timestamp });
      } else {
        // Set end date to end of day
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        onChange({ ...value, endDate: endOfDay.getTime() });
      }
      haptic("light");
    }
  };

  const setQuickFilter = (type: "week" | "month") => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    
    const start = new Date(now);
    if (type === "week") {
      start.setDate(now.getDate() - 7);
    } else {
      start.setMonth(now.getMonth() - 1);
    }
    start.setHours(0, 0, 0, 0);

    onChange({
      startDate: start.getTime(),
      endDate: end.getTime(),
    });
    haptic("medium");
  };

  const formatDate = (ts: number | null) => {
    if (!ts) return "Select Date";
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <GlassCard style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="calendar-range" size={20} color={colors.accent.primary} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {(value.startDate || value.endDate) && (
          <Pressable onPress={onClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.pickerRow}>
        <Pressable 
          style={[styles.dateBox, showPicker === "start" && styles.activeBox]} 
          onPress={() => setShowPicker("start")}
        >
          <Text style={styles.label}>From</Text>
          <Text style={styles.dateValue}>{formatDate(value.startDate)}</Text>
        </Pressable>

        <View style={styles.arrow}>
          <MaterialCommunityIcons name="arrow-right" size={16} color={colors.text.tertiary} />
        </View>

        <Pressable 
          style={[styles.dateBox, showPicker === "end" && styles.activeBox]} 
          onPress={() => setShowPicker("end")}
        >
          <Text style={styles.label}>To</Text>
          <Text style={styles.dateValue}>{formatDate(value.endDate)}</Text>
        </Pressable>
      </View>

      <View style={styles.quickFilters}>
        <GlassButton 
          variant="ghost" 
          size="sm" 
          onPress={() => setQuickFilter("week")}
          style={styles.filterBtn}
        >Last 7 Days</GlassButton>
        <GlassButton 
          variant="ghost" 
          size="sm" 
          onPress={() => setQuickFilter("month")}
          style={styles.filterBtn}
        >Last 30 Days</GlassButton>
      </View>

      {showPicker && (
        <DateTimePicker
          value={new Date(showPicker === "start" ? (value.startDate || Date.now()) : (value.endDate || Date.now()))}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          maximumDate={showPicker === "start" && value.endDate ? new Date(value.endDate) : new Date()}
          minimumDate={showPicker === "end" && value.startDate ? new Date(value.startDate) : undefined}
        />
      )}
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    ...typography.labelMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  clearBtn: {
    padding: spacing.xs,
  },
  clearText: {
    ...typography.labelSmall,
    color: colors.accent.primary,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateBox: {
    flex: 1,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  activeBox: {
    borderColor: colors.accent.primary,
    backgroundColor: `${colors.accent.primary}10`,
  },
  label: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontSize: 10,
    marginBottom: 2,
  },
  dateValue: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: "500",
  },
  arrow: {
    paddingHorizontal: 2,
  },
  quickFilters: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterBtn: {
    flex: 1,
    backgroundColor: colors.glass.background,
  },
});
