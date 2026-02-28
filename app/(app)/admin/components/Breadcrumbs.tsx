import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/components/ui/glass";
import { AdminTab } from "../types";

interface BreadcrumbsProps {
  activeTab: AdminTab;
  selectionLabel?: string | null;
  onResetSelection?: () => void;
}

/**
 * Breadcrumbs Component
 * Displays the current location within the Admin Dashboard.
 */
export function Breadcrumbs({ activeTab, selectionLabel, onResetSelection }: BreadcrumbsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.baseText}>Admin</Text>
      
      <MaterialCommunityIcons name="chevron-right" size={14} color={colors.text.tertiary} />
      
      <Pressable onPress={onResetSelection}>
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
  tabText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  activeText: {
    color: colors.accent.primary,
    fontWeight: "700",
  },
});
