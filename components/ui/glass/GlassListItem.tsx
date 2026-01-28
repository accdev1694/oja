/**
 * GlassListItem - Glassmorphism styled list item component
 *
 * Used for pantry items, shopping list items, and settings rows.
 * Supports icons, checkboxes, swipe actions, and various layouts.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import {
  colors,
  borderRadius as radii,
  typography,
  spacing,
  animations,
} from "@/lib/design/glassTokens";

// =============================================================================
// TYPES
// =============================================================================

export type GlassListItemVariant = "standard" | "compact" | "detailed";

export interface GlassListItemProps {
  /** Item title */
  title: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Third line of text */
  caption?: string;
  /** Leading icon name */
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Custom icon color */
  iconColor?: string;
  /** Icon background color */
  iconBackgroundColor?: string;
  /** Show checkbox instead of icon */
  checkbox?: boolean;
  /** Checkbox checked state */
  checked?: boolean;
  /** Checkbox change handler */
  onCheckedChange?: (checked: boolean) => void;
  /** Trailing element (price, arrow, badge, etc.) */
  trailing?: React.ReactNode;
  /** Show chevron arrow on right */
  showChevron?: boolean;
  /** Item variant */
  variant?: GlassListItemVariant;
  /** Numbered badge (01, 02, etc.) */
  number?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Selected/highlighted state */
  selected?: boolean;
  /** Accent border color when selected */
  accentColor?: string;
  /** Press handler */
  onPress?: () => void;
  /** Long press handler */
  onLongPress?: () => void;
  /** Container styles */
  style?: StyleProp<ViewStyle>;
  /** Animation delay for staggered lists */
  animationDelay?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassListItem({
  title,
  subtitle,
  caption,
  icon,
  iconColor = colors.text.primary,
  iconBackgroundColor = colors.glass.backgroundHover,
  checkbox = false,
  checked = false,
  onCheckedChange,
  trailing,
  showChevron = false,
  variant = "standard",
  number,
  disabled = false,
  selected = false,
  accentColor,
  onPress,
  onLongPress,
  style,
  animationDelay = 0,
}: GlassListItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98, animations.spring.stiff);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animations.spring.gentle);
  };

  const handlePress = () => {
    if (disabled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (checkbox && onCheckedChange) {
      onCheckedChange(!checked);
    } else {
      onPress?.();
    }
  };

  const handleLongPress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.();
  };

  // Styles based on variant
  const isCompact = variant === "compact";
  const isDetailed = variant === "detailed";

  const containerPadding = isCompact ? spacing.md : spacing.lg;
  const iconSize = isCompact ? 36 : 44;
  const iconInnerSize = isCompact ? 18 : 22;

  // Background and border for selected state
  const backgroundColor = selected
    ? colors.glass.backgroundActive
    : colors.glass.background;
  const borderColor = selected && accentColor
    ? accentColor
    : colors.glass.border;
  const borderWidth = selected && accentColor ? 2 : 1;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      entering={FadeIn.delay(animationDelay).duration(200)}
      exiting={FadeOut.duration(150)}
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          padding: containerPadding,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      {/* Number Badge */}
      {number !== undefined && (
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>
            {number.toString().padStart(2, "0")}
          </Text>
        </View>
      )}

      {/* Checkbox */}
      {checkbox && (
        <View
          style={[
            styles.checkbox,
            checked && styles.checkboxChecked,
          ]}
        >
          {checked && (
            <MaterialCommunityIcons
              name="check"
              size={16}
              color={colors.text.inverse}
            />
          )}
        </View>
      )}

      {/* Icon */}
      {!checkbox && icon && (
        <View
          style={[
            styles.iconContainer,
            {
              width: iconSize,
              height: iconSize,
              borderRadius: iconSize / 2,
              backgroundColor: iconBackgroundColor,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={iconInnerSize}
            color={iconColor}
          />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            checked && styles.titleChecked,
            isCompact && styles.titleCompact,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              checked && styles.subtitleChecked,
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}

        {isDetailed && caption && (
          <Text style={styles.caption} numberOfLines={1}>
            {caption}
          </Text>
        )}
      </View>

      {/* Trailing */}
      {trailing && <View style={styles.trailing}>{trailing}</View>}

      {/* Chevron */}
      {showChevron && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={colors.text.tertiary}
          style={styles.chevron}
        />
      )}
    </AnimatedPressable>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.lg,
    marginBottom: spacing.md,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass.backgroundHover,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  numberText: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.glass.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "500",
  },
  titleCompact: {
    ...typography.bodyMedium,
  },
  titleChecked: {
    textDecorationLine: "line-through",
    color: colors.text.tertiary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: 2,
  },
  subtitleChecked: {
    color: colors.text.tertiary,
  },
  caption: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  trailing: {
    marginLeft: spacing.md,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});

// =============================================================================
// CONVENIENCE COMPONENTS
// =============================================================================

/** Settings list item with chevron */
export function GlassSettingsItem(
  props: Omit<GlassListItemProps, "showChevron" | "variant">
) {
  return <GlassListItem {...props} showChevron variant="standard" />;
}

/** Checkable list item */
export function GlassCheckItem(
  props: Omit<GlassListItemProps, "checkbox">
) {
  return <GlassListItem {...props} checkbox />;
}

/** Compact list item for dense lists */
export function GlassCompactItem(
  props: Omit<GlassListItemProps, "variant">
) {
  return <GlassListItem {...props} variant="compact" />;
}

export default GlassListItem;
