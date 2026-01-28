/**
 * GlassCheckbox - Glassmorphism styled checkbox component
 *
 * Animated checkbox with glass styling for shopping lists
 * and multi-select interfaces.
 */

import React from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  interpolateColor,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import {
  colors,
  animations,
} from "@/lib/design/glassTokens";

// =============================================================================
// TYPES
// =============================================================================

export type GlassCheckboxSize = "sm" | "md" | "lg";

export interface GlassCheckboxProps {
  /** Checked state */
  checked: boolean;
  /** Change handler */
  onCheckedChange?: (checked: boolean) => void;
  /** Toggle handler (alias for onCheckedChange, called with no args) */
  onToggle?: () => void;
  /** Checkbox size */
  size?: GlassCheckboxSize;
  /** Disabled state */
  disabled?: boolean;
  /** Indeterminate state (partial selection) */
  indeterminate?: boolean;
  /** Custom check color */
  checkColor?: string;
  /** Custom unchecked border color */
  borderColor?: string;
  /** Disable haptics */
  disableHaptics?: boolean;
  /** Container styles */
  style?: StyleProp<ViewStyle>;
}

// =============================================================================
// SIZE PRESETS
// =============================================================================

const sizeStyles: Record<
  GlassCheckboxSize,
  {
    size: number;
    borderRadius: number;
    iconSize: number;
    borderWidth: number;
  }
> = {
  sm: {
    size: 20,
    borderRadius: 6,
    iconSize: 14,
    borderWidth: 1.5,
  },
  md: {
    size: 24,
    borderRadius: 8,
    iconSize: 16,
    borderWidth: 2,
  },
  lg: {
    size: 32,
    borderRadius: 10,
    iconSize: 22,
    borderWidth: 2,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCheckbox({
  checked,
  onCheckedChange,
  onToggle,
  size = "md",
  disabled = false,
  indeterminate = false,
  checkColor = colors.accent.primary,
  borderColor = colors.glass.borderStrong,
  disableHaptics = false,
  style,
}: GlassCheckboxProps) {
  const scale = useSharedValue(1);
  const progress = useSharedValue(checked ? 1 : 0);

  const sStyles = sizeStyles[size];

  // Update animation when checked changes
  React.useEffect(() => {
    progress.value = withSpring(checked ? 1 : 0, animations.spring.bouncy);
  }, [checked, progress]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      ["transparent", checkColor]
    );

    const bColor = interpolateColor(
      progress.value,
      [0, 1],
      [borderColor, checkColor]
    );

    return {
      backgroundColor,
      borderColor: bColor,
      transform: [{ scale: scale.value }],
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  const handlePress = () => {
    if (disabled) return;

    if (!disableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Bounce animation
    scale.value = withSequence(
      withSpring(0.85, { damping: 10, stiffness: 400 }),
      withSpring(1, animations.spring.bouncy)
    );

    // Support both callback styles
    if (onToggle) {
      onToggle();
    } else if (onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  const iconName = indeterminate ? "minus" : "check";

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.container,
        {
          width: sStyles.size,
          height: sStyles.size,
          borderRadius: sStyles.borderRadius,
          borderWidth: sStyles.borderWidth,
          opacity: disabled ? 0.5 : 1,
        },
        animatedContainerStyle,
        style,
      ]}
    >
      <Animated.View style={animatedIconStyle}>
        <MaterialCommunityIcons
          name={iconName}
          size={sStyles.iconSize}
          color={colors.text.inverse}
        />
      </Animated.View>
    </AnimatedPressable>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

// =============================================================================
// CIRCULAR CHECKBOX VARIANT
// =============================================================================

export function GlassCircularCheckbox(props: GlassCheckboxProps) {
  const sStyles = sizeStyles[props.size || "md"];

  return (
    <GlassCheckbox
      {...props}
      style={[
        { borderRadius: sStyles.size / 2 },
        props.style,
      ]}
    />
  );
}

export default GlassCheckbox;
