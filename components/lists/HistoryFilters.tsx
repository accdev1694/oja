import React, { useCallback, useRef, useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import {
  GlassSearchInput,
  GlassDropdown,
  spacing,
} from "@/components/ui/glass";

const DATE_OPTIONS = [
  { value: null, label: "All Time", icon: "calendar" },
  { value: "month", label: "This Month", icon: "calendar" },
  { value: "3months", label: "3 Months", icon: "calendar" },
  { value: "year", label: "This Year", icon: "calendar" },
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

  const storeOptions = useMemo(() => {
    const opts = [{ value: null, label: "All Stores", icon: "store" }];
    for (const store of stores) {
      opts.push({ value: store, label: store, icon: "store" });
    }
    return opts;
  }, [stores]);

  return (
    <View style={styles.container}>
      <GlassSearchInput
        placeholder="Search trips..."
        defaultValue={searchQuery}
        onChangeText={handleSearchChange}
        style={styles.searchBar}
      />

      <View style={styles.dropdownRow}>
        <GlassDropdown
          label="Sort by time"
          options={DATE_OPTIONS}
          selected={dateFilter}
          onSelect={onDateChange}
          placeholder="All Time"
          style={styles.dropdown}
        />
        {stores.length > 0 && (
          <GlassDropdown
            label="Sort by store"
            options={storeOptions}
            selected={storeFilter}
            onSelect={onStoreChange}
            placeholder="All Stores"
            style={styles.dropdown}
          />
        )}
      </View>
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
  dropdownRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dropdown: {
    flex: 1,
  },
});
