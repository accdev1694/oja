/**
 * GuidedBorder — Steady teal border with a gentle breathing/heaving
 * pulse that draws the user's eye to the current step.
 *
 * Usage:
 *   <GuidedBorder active={!hasStore} borderRadius={12}>
 *     <YourButton />
 *   </GuidedBorder>
 */

import React, { useEffect } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { colors } from "@/lib/design/glassTokens";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GuidedBorderProps {
  /** Whether the teal border + pulse is active */
  active: boolean;
  children: React.ReactNode;
  /** Must match the child's borderRadius (default 12) */
  borderRadius?: number;
  /** Border colour (default teal accent) */
  color?: string;
  /** Border thickness (default 1.5) */
  strokeWidth?: number;
  /** Kept for API compat — unused */
  duration?: number;
  /** Extra styles applied to the outer wrapper */
  style?: ViewStyle;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function GuidedBorder({
  active,
  children,
  borderRadius = 12,
  color = colors.accent.primary,
  strokeWidth = 1.5,
  style,
}: GuidedBorderProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, // infinite
        false,
      );
    } else {
      cancelAnimation(scale);
      scale.value = 1;
    }
    return () => cancelAnimation(scale);
  }, [active, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        active && {
          borderWidth: strokeWidth,
          borderColor: color,
          borderRadius: borderRadius + strokeWidth,
        },
        active && animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
});
