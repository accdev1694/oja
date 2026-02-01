/**
 * GlassCollapsible - Expandable/collapsible section for progressive disclosure.
 *
 * Keeps UI below 3 major sections visible at once (analysis.md #417).
 */
import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import { colors, typography, spacing } from "@/lib/design/glassTokens";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface GlassCollapsibleProps {
  /** Section title */
  title: string;
  /** Icon name (MaterialCommunityIcons) */
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Icon color */
  iconColor?: string;
  /** Whether the section starts expanded */
  defaultExpanded?: boolean;
  /** Optional trailing badge (e.g. count) */
  badge?: string | number;
  /** Children rendered when expanded */
  children: React.ReactNode;
}

export function GlassCollapsible({
  title,
  icon,
  iconColor = colors.accent.primary,
  defaultExpanded = false,
  badge,
  children,
}: GlassCollapsibleProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
    impactAsync(ImpactFeedbackStyle.Light);
  }, []);

  return (
    <View style={styles.container}>
      <Pressable onPress={toggle} style={styles.header} accessibilityRole="button">
        <View style={styles.headerLeft}>
          {icon && (
            <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
          )}
          <Text style={styles.title}>{title}</Text>
          {badge != null && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.text.tertiary}
        />
      </Pressable>
      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  badge: {
    backgroundColor: `${colors.accent.secondary}30`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    ...typography.bodySmall,
    color: colors.accent.secondary,
    fontWeight: "700",
    fontSize: 12,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
