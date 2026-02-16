/**
 * GuidedBorder — Animated "chase light" border that draws the user's eye
 * to the current step in a sequential flow.
 *
 * Usage:
 *   <GuidedBorder active={!hasStore} borderRadius={12}>
 *     <YourButton />
 *   </GuidedBorder>
 */

import React, { useEffect, useState } from "react";
import { View, StyleSheet, type ViewStyle, type LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";
import { colors } from "@/lib/design/glassTokens";

// ─────────────────────────────────────────────────────────────────────────────
// Animated SVG element
// ─────────────────────────────────────────────────────────────────────────────

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GuidedBorderProps {
  /** Whether the chase-light animation is running */
  active: boolean;
  children: React.ReactNode;
  /** Must match the child's borderRadius (default 12) */
  borderRadius?: number;
  /** Light colour (default teal accent) */
  color?: string;
  /** Border thickness (default 1.5) */
  strokeWidth?: number;
  /** Full loop duration in ms (default 3000 — slow & elegant) */
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
  duration = 3000,
  style,
}: GuidedBorderProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const progress = useSharedValue(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout((prev) =>
      prev.width === Math.round(width) && prev.height === Math.round(height)
        ? prev
        : { width: Math.round(width), height: Math.round(height) }
    );
  };

  // ── Perimeter maths ──────────────────────────────────────────────────────
  const { width, height } = layout;
  const r = Math.min(borderRadius, width / 2, height / 2);
  const straightH = Math.max(0, width - 2 * r);
  const straightV = Math.max(0, height - 2 * r);
  const perimeter = 2 * straightH + 2 * straightV + 2 * Math.PI * r;

  // The "light" is ~18% of the perimeter
  const dashLength = perimeter * 0.18;
  const gapLength = perimeter - dashLength;

  // ── Animation lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    if (active && perimeter > 0) {
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1, // infinite
        false,
      );
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }
    return () => cancelAnimation(progress);
  }, [active, perimeter, duration, progress]);

  // ── Animated stroke offset ───────────────────────────────────────────────
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: -progress.value * perimeter,
  }));

  const svgPad = strokeWidth / 2;

  return (
    <View onLayout={handleLayout} style={[styles.container, style]}>
      {children}

      {active && width > 0 && (
        <Svg
          style={StyleSheet.absoluteFill}
          width={width}
          height={height}
          pointerEvents="none"
        >
          {/* Glow layer — wider, softer */}
          <AnimatedRect
            x={svgPad}
            y={svgPad}
            width={width - strokeWidth}
            height={height - strokeWidth}
            rx={r}
            ry={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth + 3}
            strokeDasharray={[dashLength, gapLength]}
            animatedProps={animatedProps}
            strokeLinecap="round"
            opacity={0.2}
          />
          {/* Core light — sharp */}
          <AnimatedRect
            x={svgPad}
            y={svgPad}
            width={width - strokeWidth}
            height={height - strokeWidth}
            rx={r}
            ry={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={[dashLength, gapLength]}
            animatedProps={animatedProps}
            strokeLinecap="round"
            opacity={0.9}
          />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
});
