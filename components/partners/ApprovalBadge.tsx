import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/lib/design/glassTokens";

type ApprovalStatus = "pending" | "approved" | "rejected" | null | undefined;

interface ApprovalBadgeProps {
  status: ApprovalStatus;
  compact?: boolean;
}

const statusConfig: Record<
  string,
  { icon: string; label: string; color: string; bg: string }
> = {
  pending: {
    icon: "clock-outline",
    label: "Pending",
    color: colors.accent.warning,
    bg: "rgba(245, 158, 11, 0.15)",
  },
  approved: {
    icon: "check-circle-outline",
    label: "Approved",
    color: colors.accent.success,
    bg: "rgba(16, 185, 129, 0.15)",
  },
  rejected: {
    icon: "close-circle-outline",
    label: "Rejected",
    color: colors.accent.error,
    bg: "rgba(239, 68, 68, 0.15)",
  },
};

export function ApprovalBadge({ status, compact = false }: ApprovalBadgeProps) {
  if (!status) return null;

  const config = statusConfig[status];
  if (!config) return null;

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: config.bg }]}>
        <MaterialCommunityIcons
          name={config.icon as any}
          size={12}
          color={config.color}
        />
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <MaterialCommunityIcons
        name={config.icon as any}
        size={14}
        color={config.color}
      />
      <Text style={[styles.label, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  compactBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: "600",
  },
});
