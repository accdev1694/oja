import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

export type StockLevel = "stocked" | "low" | "out";

// Ordered from empty to full
export const STOCK_LEVEL_ORDER: StockLevel[] = ["out", "low", "stocked"];

export const STOCK_LEVEL_PERCENTAGES: Record<StockLevel, number> = {
  out: 0,
  low: 50,
  stocked: 100,
};

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  out: "Out of stock",
  low: "Running low",
  stocked: "Fully stocked",
};

export const STOCK_LEVEL_SHORT: Record<StockLevel, string> = {
  out: "Out",
  low: "Low",
  stocked: "Full",
};

// Segment colors when active
const SEGMENT_COLORS = {
  top: "#10B981", // green — stocked
  mid: "#F59E0B", // amber — low
  bot: "#FF6B6B", // red   — out
};

// Which segments light up per level (bottom to top)
const ACTIVE_SEGMENTS: Record<StockLevel, [boolean, boolean, boolean]> = {
  //                       [bot,   mid,   top]
  out:     [true,  false, false],
  low:     [true,  true,  false],
  stocked: [true,  true,  true],
};

const INACTIVE_COLOR = "rgba(255, 255, 255, 0.08)";

interface GaugeIndicatorProps {
  level: StockLevel;
  size?: "small" | "large";
}

const SIZE_CONFIG = {
  small: { width: 8, height: 40, gap: 1, outerRadius: 4 },
  large: { width: 12, height: 64, gap: 2, outerRadius: 6 },
};

/**
 * Segmented gauge bar — 3 discrete segments that light up
 * based on stock level. Bottom-to-top: red, amber, green.
 */
export function GaugeIndicator({
  level,
  size = "small",
}: GaugeIndicatorProps) {
  const config = SIZE_CONFIG[size];

  // Animated opacity for each segment (0 = inactive, 1 = active)
  const botOpacity = useSharedValue(ACTIVE_SEGMENTS[level][0] ? 1 : 0);
  const midOpacity = useSharedValue(ACTIVE_SEGMENTS[level][1] ? 1 : 0);
  const topOpacity = useSharedValue(ACTIVE_SEGMENTS[level][2] ? 1 : 0);

  useEffect(() => {
    const [bot, mid, top] = ACTIVE_SEGMENTS[level];
    const spring = { damping: 14, stiffness: 140, mass: 0.5 };
    botOpacity.value = withSpring(bot ? 1 : 0, spring);
    midOpacity.value = withSpring(mid ? 1 : 0, spring);
    topOpacity.value = withSpring(top ? 1 : 0, spring);
  }, [level]);

  const botStyle = useAnimatedStyle(() => ({
    backgroundColor:
      botOpacity.value > 0.5 ? SEGMENT_COLORS.bot : INACTIVE_COLOR,
    opacity: botOpacity.value > 0.5 ? botOpacity.value : 0.6,
  }));

  const midStyle = useAnimatedStyle(() => ({
    backgroundColor:
      midOpacity.value > 0.5 ? SEGMENT_COLORS.mid : INACTIVE_COLOR,
    opacity: midOpacity.value > 0.5 ? midOpacity.value : 0.6,
  }));

  const topStyle = useAnimatedStyle(() => ({
    backgroundColor:
      topOpacity.value > 0.5 ? SEGMENT_COLORS.top : INACTIVE_COLOR,
    opacity: topOpacity.value > 0.5 ? topOpacity.value : 0.6,
  }));

  // Each segment gets equal height minus gaps
  const segmentHeight = (config.height - config.gap * 2) / 3;
  const r = config.outerRadius;

  return (
    <View
      style={[
        styles.track,
        {
          width: config.width,
          height: config.height,
          gap: config.gap,
        },
      ]}
    >
      {/* Top segment — green (stocked) — rounded top only */}
      <Animated.View
        style={[
          styles.segment,
          {
            width: config.width,
            height: segmentHeight,
            borderTopLeftRadius: r,
            borderTopRightRadius: r,
          },
          topStyle,
        ]}
      />
      {/* Middle segment — amber (low) — no rounding */}
      <Animated.View
        style={[
          styles.segment,
          {
            width: config.width,
            height: segmentHeight,
          },
          midStyle,
        ]}
      />
      {/* Bottom segment — red (out) — rounded bottom only */}
      <Animated.View
        style={[
          styles.segment,
          {
            width: config.width,
            height: segmentHeight,
            borderBottomLeftRadius: r,
            borderBottomRightRadius: r,
          },
          botStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "column",
    alignItems: "center",
  },
  segment: {},
});
