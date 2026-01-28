import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";

export type StockLevel = "stocked" | "good" | "low" | "out";

interface LiquidFillIndicatorProps {
  level: StockLevel;
  size?: "small" | "medium" | "large";
  showWave?: boolean;
}

const FILL_PERCENTAGES: Record<StockLevel, number> = {
  stocked: 100,
  good: 75,
  low: 25,
  out: 0,
};

const LEVEL_COLORS: Record<StockLevel, string> = {
  stocked: "#10B981", // Green
  good: "#34D399", // Light green
  low: "#F59E0B", // Amber
  out: "#EF4444", // Red (for empty outline)
};

const SIZE_CONFIG = {
  small: { width: 32, height: 40, borderRadius: 6 },
  medium: { width: 48, height: 60, borderRadius: 8 },
  large: { width: 80, height: 100, borderRadius: 12 },
};

/**
 * LiquidFillIndicator - Animated container showing stock level as liquid fill
 *
 * Features:
 * - Smooth spring animation when level changes
 * - Color transitions between states
 * - Optional wave animation at liquid surface
 * - Three sizes for different contexts
 */
export function LiquidFillIndicator({
  level,
  size = "small",
  showWave = false,
}: LiquidFillIndicatorProps) {
  const fillPercentage = useSharedValue(FILL_PERCENTAGES[level]);
  const waveOffset = useSharedValue(0);
  const colorProgress = useSharedValue(0);

  const config = SIZE_CONFIG[size];
  const targetPercentage = FILL_PERCENTAGES[level];

  useEffect(() => {
    // Animate fill level with spring physics (like liquid settling)
    fillPercentage.value = withSpring(targetPercentage, {
      damping: 12,
      stiffness: 100,
      mass: 0.5,
    });

    // Update color
    colorProgress.value = withTiming(
      level === "stocked" ? 0 : level === "good" ? 1 : level === "low" ? 2 : 3,
      { duration: 300 }
    );
  }, [level, targetPercentage]);

  useEffect(() => {
    if (showWave && level !== "out") {
      // Subtle wave animation
      waveOffset.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        true
      );
    }
  }, [showWave, level]);

  const liquidStyle = useAnimatedStyle(() => {
    const fillHeight = (fillPercentage.value / 100) * config.height;

    // Interpolate color based on level
    const backgroundColor = interpolateColor(
      colorProgress.value,
      [0, 1, 2, 3],
      [LEVEL_COLORS.stocked, LEVEL_COLORS.good, LEVEL_COLORS.low, LEVEL_COLORS.out]
    );

    return {
      height: fillHeight,
      backgroundColor,
    };
  });

  const waveStyle = useAnimatedStyle(() => {
    if (!showWave || level === "out") {
      return { opacity: 0 };
    }

    return {
      opacity: 0.3,
      transform: [
        { translateX: waveOffset.value * 4 - 2 },
        { scaleY: 0.5 + waveOffset.value * 0.3 },
      ],
    };
  });

  const containerBorderColor = level === "out" ? LEVEL_COLORS.out : "#E5E7EB";

  return (
    <View
      style={[
        styles.container,
        {
          width: config.width,
          height: config.height,
          borderRadius: config.borderRadius,
          borderColor: containerBorderColor,
          borderWidth: level === "out" ? 2 : 1,
        },
      ]}
    >
      {/* Liquid fill */}
      <Animated.View
        style={[
          styles.liquid,
          {
            borderBottomLeftRadius: config.borderRadius - 2,
            borderBottomRightRadius: config.borderRadius - 2,
          },
          liquidStyle,
        ]}
      >
        {/* Wave effect at surface */}
        {showWave && (
          <Animated.View
            style={[
              styles.wave,
              {
                width: config.width - 4,
              },
              waveStyle,
            ]}
          />
        )}
      </Animated.View>

      {/* Glass reflection effect */}
      <View
        style={[
          styles.reflection,
          {
            height: config.height * 0.6,
            borderRadius: config.borderRadius - 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  liquid: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  wave: {
    position: "absolute",
    top: -4,
    left: 2,
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 4,
  },
  reflection: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
});

export { FILL_PERCENTAGES, LEVEL_COLORS };
