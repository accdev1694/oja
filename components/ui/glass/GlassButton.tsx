/**
 * GlassButton - Glassmorphism styled button component
 *
 * Provides consistent button styling with glass effects,
 * multiple variants, and built-in haptic feedback.
 */

import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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

export type GlassButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type GlassButtonSize = "sm" | "md" | "lg";

export interface GlassButtonProps {
  /** Button style variant */
  variant?: GlassButtonVariant;
  /** Button size */
  size?: GlassButtonSize;
  /** Button label */
  children: string;
  /** Leading icon name (MaterialCommunityIcons) */
  iconLeft?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Trailing icon name */
  iconRight?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Press handler */
  onPress?: () => void;
  /** Disable haptic feedback */
  disableHaptics?: boolean;
  /** Custom styles */
  style?: StyleProp<ViewStyle>;
  /** Custom text styles */
  textStyle?: StyleProp<TextStyle>;
}

// =============================================================================
// STYLE PRESETS
// =============================================================================

const variantStyles: Record<
  GlassButtonVariant,
  {
    backgroundColor: string;
    borderWidth: number;
    borderColor: string;
    textColor: string;
  }
> = {
  primary: {
    backgroundColor: colors.accent.primary,
    borderWidth: 0,
    borderColor: "transparent",
    textColor: colors.text.inverse,
  },
  secondary: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.borderFocus,
    textColor: colors.text.primary,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.glass.border,
    textColor: colors.text.primary,
  },
  danger: {
    backgroundColor: colors.accent.error,
    borderWidth: 0,
    borderColor: "transparent",
    textColor: colors.text.primary,
  },
};

const sizeStyles: Record<
  GlassButtonSize,
  {
    height: number;
    paddingHorizontal: number;
    fontSize: number;
    iconSize: number;
    borderRadius: number;
  }
> = {
  sm: {
    height: 36,
    paddingHorizontal: spacing.md,
    fontSize: typography.labelMedium.fontSize,
    iconSize: 16,
    borderRadius: radii.md,
  },
  md: {
    height: 48,
    paddingHorizontal: spacing.xl,
    fontSize: typography.labelLarge.fontSize,
    iconSize: 20,
    borderRadius: radii.lg,
  },
  lg: {
    height: 56,
    paddingHorizontal: spacing["2xl"],
    fontSize: 18,
    iconSize: 24,
    borderRadius: radii.lg,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassButton({
  variant = "primary",
  size = "md",
  children,
  iconLeft,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  onPress,
  disableHaptics = false,
  style,
  textStyle,
}: GlassButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(animations.pressScale, animations.spring.stiff);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animations.spring.gentle);
  };

  const handlePress = () => {
    if (disabled || loading) return;

    if (!disableHaptics) {
      Haptics.impactAsync(
        variant === "danger"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
    }
    onPress?.();
  };

  const vStyles = variantStyles[variant];
  const sStyles = sizeStyles[size];

  const isDisabled = disabled || loading;
  const opacity = isDisabled ? 0.5 : 1;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          backgroundColor: vStyles.backgroundColor,
          borderWidth: vStyles.borderWidth,
          borderColor: vStyles.borderColor,
          height: sStyles.height,
          paddingHorizontal: sStyles.paddingHorizontal,
          borderRadius: sStyles.borderRadius,
          opacity,
        },
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={vStyles.textColor}
        />
      ) : (
        <View style={styles.content}>
          {iconLeft && (
            <MaterialCommunityIcons
              name={iconLeft}
              size={sStyles.iconSize}
              color={vStyles.textColor}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              {
                color: vStyles.textColor,
                fontSize: sStyles.fontSize,
              },
              textStyle,
            ]}
          >
            {children}
          </Text>
          {iconRight && (
            <MaterialCommunityIcons
              name={iconRight}
              size={sStyles.iconSize}
              color={vStyles.textColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fullWidth: {
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export function PrimaryButton(props: Omit<GlassButtonProps, "variant">) {
  return <GlassButton {...props} variant="primary" />;
}

export function SecondaryButton(props: Omit<GlassButtonProps, "variant">) {
  return <GlassButton {...props} variant="secondary" />;
}

export function GhostButton(props: Omit<GlassButtonProps, "variant">) {
  return <GlassButton {...props} variant="ghost" />;
}

export function DangerButton(props: Omit<GlassButtonProps, "variant">) {
  return <GlassButton {...props} variant="danger" />;
}

export default GlassButton;
