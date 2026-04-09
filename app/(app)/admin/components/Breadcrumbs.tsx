import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/components/ui/glass";
import { AdminTab } from "../types";

interface BreadcrumbsProps {
  activeTab: AdminTab;
  selectionLabel?: string | null;
  onResetSelection?: () => void;
  /** Called when the root "Admin" crumb is tapped — usually navigates back out of the admin screen. */
  onHome?: () => void;
}

/**
 * Breadcrumbs Component
 * Displays the current location within the Admin Dashboard.
 * "Admin" navigates out of the admin screen (via onHome), the tab crumb
 * clears the current selection (via onResetSelection), and the selection
 * label is display-only since it represents the current location.
 */
export function Breadcrumbs({ activeTab, selectionLabel, onResetSelection, onHome }: BreadcrumbsProps) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onHome} hitSlop={8}>
        <Text style={[styles.baseText, onHome && styles.linkText]}>Admin</Text>
      </Pressable>

      <MaterialCommunityIcons name="chevron-right" size={14} color={colors.text.tertiary} />

      <Pressable onPress={onResetSelection} hitSlop={8}>
        <Text style={[styles.tabText, !selectionLabel && styles.activeText]}>
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </Text>
      </Pressable>

      {selectionLabel && (
        <>
          <MaterialCommunityIcons name="chevron-right" size={14} color={colors.text.tertiary} />
          <Text style={[styles.tabText, styles.activeText]} numberOfLines={1}>
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
