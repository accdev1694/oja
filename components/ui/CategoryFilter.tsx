/**
 * CategoryFilter - Horizontal scrollable category filter chips
 *
 * Reusable across Stock screen, Shopping List detail, and Stock picker.
 * Shows "All" chip + one chip per category found in the data.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/lib/design/glassTokens";

interface CategoryFilterProps {
  /** List of unique category names derived from items */
  categories: string[];
  /** Currently selected category (null = "All") */
  selected: string | null;
  /** Callback when a category is selected */
  onSelect: (category: string | null) => void;
  /** Optional: show item counts per category */
  counts?: Record<string, number>;
}

export function CategoryFilter({
  categories,
  selected,
  onSelect,
  counts,
}: CategoryFilterProps) {
  if (categories.length <= 1) return null;

  const handlePress = (category: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(category);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      {/* "All" chip */}
      <Pressable
        style={[styles.chip, selected === null && styles.chipActive]}
        onPress={() => handlePress(null)}
      >
        <Text style={[styles.chipText, selected === null && styles.chipTextActive]}>
          All
        </Text>
      </Pressable>

      {/* Category chips */}
      {categories.map((cat) => {
        const isActive = selected === cat;
        const count = counts?.[cat];
        return (
          <Pressable
            key={cat}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => handlePress(cat)}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {cat}
              {count !== undefined ? ` (${count})` : ""}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  chipActive: {
    backgroundColor: "rgba(0, 212, 170, 0.15)",
    borderColor: "rgba(0, 212, 170, 0.4)",
  },
  chipText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
});

export default CategoryFilter;
