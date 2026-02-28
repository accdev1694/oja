import React, { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/components/ui/glass";
import * as Haptics from "expo-haptics";
import type { Id } from "@/convex/_generated/dataModel";

// Discriminated union for filter data
type UserFilterData = {
  type: "users";
  searchQuery?: string;
  statusFilter?: string;
  planFilter?: string;
};

type ReceiptFilterData = {
  type: "receipts";
  storeFilter?: string;
  statusFilter?: string;
  dateRange?: { from: number; to: number };
};

type FilterData = UserFilterData | ReceiptFilterData;

interface SavedFilter {
  _id: string;
  name: string;
  filterData: FilterData;
}

interface SavedFilterPillsProps {
  tab: "users" | "receipts";
  onSelect: (filterData: FilterData) => void;
}

/**
 * SavedFilterPills Component
 * Displays a horizontal list of saved search presets.
 */
export function SavedFilterPills({ tab, onSelect }: SavedFilterPillsProps) {
  const filters = useQuery(api.admin.getSavedFilters, { tab }) as SavedFilter[] | undefined;
  const deleteFilter = useMutation(api.admin.deleteSavedFilter);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteFilter({ id: id as Id<"savedFilters"> });
      Haptics.selectionAsync();
    } catch (e) {
      console.error("Failed to delete filter", e);
    }
  }, [deleteFilter]);

  if (!filters || filters.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Saved Presets:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {filters.map((f) => (
          <View key={f._id} style={styles.pillWrapper}>
            <Pressable 
              onPress={() => { onSelect(f.filterData); Haptics.selectionAsync(); }}
              style={styles.pill}
            >
              <Text style={styles.pillText}>{f.name}</Text>
            </Pressable>
            <Pressable onPress={() => handleDelete(f._id)} style={styles.deleteBtn}>
              <MaterialCommunityIcons name="close" size={12} color={colors.text.tertiary} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  label: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  scroll: {
    gap: spacing.xs,
  },
  pillWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.glass.border}40`,
    borderRadius: 16,
    paddingLeft: 10,
    paddingRight: 4,
    height: 28,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  pill: {
    height: "100%",
    justifyContent: "center",
    marginRight: 4,
  },
  pillText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontSize: 11,
  },
  deleteBtn: {
    padding: 4,
  },
});
