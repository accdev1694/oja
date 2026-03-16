import React, { useCallback, useRef, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  GlassSearchInput,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

const DATE_OPTIONS = [
  { key: null, label: "All" },
  { key: "month", label: "This Month" },
  { key: "3months", label: "3 Months" },
  { key: "year", label: "This Year" },
];

const HistoryFilters = React.memo(function HistoryFilters({
  searchQuery,
  storeFilter,
  dateFilter,
  stores,
  onSearchChange,
  onStoreChange,
  onDateChange,
}: any) {
  const searchTimeout = useRef<any>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  const handleSearchChange = useCallback((text: any) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      onSearchChange(text);
    }, 300);
  }, [onSearchChange]);

  const handleStorePress = useCallback((store: any) => {
    Haptics.selectionAsync();
    onStoreChange(store === storeFilter ? null : store);
  }, [storeFilter, onStoreChange]);

  const handleDatePress = useCallback((date: any) => {
    Haptics.selectionAsync();
    onDateChange(date === dateFilter ? null : date);
  }, [dateFilter, onDateChange]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <GlassSearchInput
        placeholder="Search trips..."
        defaultValue={searchQuery}
        onChangeText={handleSearchChange}
        style={styles.searchBar}
      />

      {/* Date filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {DATE_OPTIONS.map((opt) => {
          const active = opt.key === dateFilter;
          return (
            <Pressable
              key={opt.key ?? "all-date"}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => handleDatePress(opt.key)}
            >
              <MaterialCommunityIcons
                name="calendar"
                size={14}
                color={active ? colors.accent.primary : colors.text.tertiary}
              />
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Store filter pills (only if stores exist) */}
      {stores.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          <Pressable
            style={[styles.pill, !storeFilter && styles.pillActive]}
            onPress={() => handleStorePress(null)}
          >
            <MaterialCommunityIcons
              name="store"
              size={14}
              color={!storeFilter ? colors.accent.primary : colors.text.tertiary}
            />
            <Text style={[styles.pillText, !storeFilter && styles.pillTextActive]}>
              All Stores
            </Text>
          </Pressable>
          {stores.map((store: any) => {
            const active = store === storeFilter;
            return (
              <Pressable
                key={store}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => handleStorePress(store)}
              >
                <MaterialCommunityIcons
                  name="store"
                  size={14}
                  color={active ? colors.accent.primary : colors.text.tertiary}
                />
                <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
                  {store}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
});

export { HistoryFilters };

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBar: {
    marginBottom: spacing.xs,
  },
  pillRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.glass.border}40`,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 32,
    borderWidth: 1,
    borderColor: colors.glass.border,
    gap: spacing.xs,
  },
  pillActive: {
    backgroundColor: `${colors.accent.primary}20`,
    borderColor: colors.accent.primary,
  },
  pillText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  pillTextActive: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
});
