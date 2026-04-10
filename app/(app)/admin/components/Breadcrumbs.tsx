import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/components/ui/glass";
import { AdminTab } from "../types";

interface BreadcrumbsProps {
  activeTab: AdminTab;
  selectionLabel?: string | null;
  onResetSelection?: () => void;
  /**
   * Called when the "Admin" root crumb is tapped. Should return to the
   * Overview tab and clear any in-tab selection — acting as "admin home",
   * NOT as an exit from the admin screen. Exit lives on AdminTabBar.
   */
  onGoHome?: () => void;
}

/**
 * Breadcrumbs Component
 * Displays the current location within the Admin Dashboard.
 *
 * "Admin" navigates to the Overview tab (admin home).
 * The tab crumb clears the current selection within the tab.
 * The selection label is display-only since it represents the current location.
 */
export function Breadcrumbs({ activeTab, selectionLabel, onResetSelection, onGoHome }: BreadcrumbsProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onGoHome}
        hitSlop={8}
        accessibilityRole="link"
        accessibilityLabel="Admin home (Overview)"
      >
        <Text style={[styles.baseText, onGoHome && styles.linkText]}>Admin</Text>
      </Pressable>

      <MaterialCommunityIcons name="chevron-right" size={14} color={colors.text.tertiary} />

      <Pressable
        onPress={onResetSelection}
        hitSlop={8}
        accessibilityRole="link"
        accessibilityLabel={`${activeTab} tab${selectionLabel ? " (clear selection)" : ""}`}
      >
        <Text style={[styles.tabText, !selectionLabel && styles.activeText]}>
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </Text>
      </Pressable>

      {selectionLabel && (
        <>
          <MaterialCommunityIcons name="chevron-right" size={14} color={colors.text.tertiary} />
          <Text
            style={[styles.tabText, styles.activeText]}
            numberOfLines={1}
          >
            {selectionLabel}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  baseText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  linkText: {
    color: colors.text.secondary,
  },
  tabText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  activeText: {
    color: colors.accent.primary,
    fontWeight: "700",
  },
});
