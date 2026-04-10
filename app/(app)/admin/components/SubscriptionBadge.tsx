import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography } from "@/components/ui/glass";
import type { SubscriptionBadgeVariant, SubscriptionDisplayInfo } from "../types";

interface SubscriptionBadgeProps {
  display: SubscriptionDisplayInfo;
  size?: "compact" | "full";
}

interface VariantStyle {
  bg: string;
  fg: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}

const VARIANT_STYLES: Record<SubscriptionBadgeVariant, VariantStyle> = {
  free: {
    bg: `${colors.text.tertiary}20`,
    fg: colors.text.secondary,
    icon: "account-outline",
  },
  trial: {
    bg: `${colors.accent.primary}20`,
    fg: colors.accent.primary,
    icon: "clock-outline",
  },
  trial_expiring: {
    bg: `${colors.semantic.warning}25`,
    fg: colors.semantic.warning,
    icon: "clock-alert-outline",
  },
  premium_monthly: {
    bg: `${colors.semantic.success}20`,
    fg: colors.semantic.success,
    icon: "star-outline",
  },
  premium_annual: {
    bg: `${colors.semantic.success}25`,
    fg: colors.semantic.success,
    icon: "crown-outline",
  },
  expired: {
    bg: `${colors.semantic.danger}20`,
    fg: colors.semantic.danger,
    icon: "clock-remove-outline",
  },
  cancelled: {
    bg: `${colors.semantic.warning}20`,
    fg: colors.semantic.warning,
    icon: "close-circle-outline",
  },
  admin: {
    bg: `${colors.accent.primary}20`,
    fg: colors.accent.primary,
    icon: "shield-check",
  },
};

export function SubscriptionBadge({ display, size = "full" }: SubscriptionBadgeProps) {
  // Fallback to "free" style if an unknown variant arrives (e.g., cached older API response)
  const style = VARIANT_STYLES[display.variant] ?? VARIANT_STYLES.free;
  const isCompact = size === "compact";
  const text = isCompact ? display.shortLabel : display.label;
  const iconSize = isCompact ? 11 : 14;

  return (
    <View
      style={[
        styles.badge,
        isCompact ? styles.badgeCompact : styles.badgeFull,
        { backgroundColor: style.bg },
      ]}
    >
      <MaterialCommunityIcons name={style.icon} size={iconSize} color={style.fg} />
      <Text
        style={[
          isCompact ? styles.textCompact : styles.textFull,
          { color: style.fg },
        ]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  badgeFull: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  textCompact: {
    ...typography.labelSmall,
    fontWeight: "700",
  },
  textFull: {
    ...typography.labelMedium,
    fontWeight: "700",
  },
});
