import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
} from "react-native-reanimated";
import Svg, { Path, Line, Circle } from "react-native-svg";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReceiptSparklesIllustrationProps {
  /** Outer container size (default 120) */
  size?: number;
}

interface SparkleConfig {
  cx: number;
  cy: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fourPointedStarPath(cx: number, cy: number, size: number): string {
  const r = size;
  const ri = r * 0.3;
  return [
    `M${cx},${cy - r}`,
    `L${cx + ri},${cy - ri}`,
    `L${cx + r},${cy}`,
    `L${cx + ri},${cy + ri}`,
    `L${cx},${cy + r}`,
    `L${cx - ri},${cy + ri}`,
    `L${cx - r},${cy}`,
    `L${cx - ri},${cy - ri}`,
    "Z",
  ].join(" ");
}

// Receipt body: rounded top corners, zigzag torn bottom
const RECEIPT_PATH = [
  "M38,22",
  "L82,22",
  "Q86,22 86,26",
  "L86,80",
  "L82,84 78,80 74,84 70,80 66,84 62,80 58,84 54,80 50,84 46,80 42,84 38,80",
  "L34,80",
  "L34,26",
  "Q34,22 38,22",
  "Z",
].join(" ");

// Checkmark path inside the teal circle
const CHECKMARK_PATH = "M73,68 L76,71 L83,64";

// ---------------------------------------------------------------------------
// Animated sparkle
// ---------------------------------------------------------------------------

function AnimatedSparkle({ config }: { config: SparkleConfig }) {
  const opacity = useSharedValue(0.4);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: config.duration }),
          withTiming(0.4, { duration: config.duration }),
        ),
        -1,
      ),
    );
    scale.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: config.duration }),
          withTiming(0.6, { duration: config.duration }),
        ),
        -1,
      ),
    );
  }, [opacity, scale, config.delay, config.duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const svgSize = config.size * 2;
  const center = config.size;

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          left: config.cx - config.size,
          top: config.cy - config.size,
          width: svgSize,
          height: svgSize,
        },
        animatedStyle,
      ]}
    >
      <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        <Path
          d={fourPointedStarPath(center, center, config.size)}
          fill={config.color}
        />
      </Svg>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReceiptSparklesIllustration({
  size = 120,
}: ReceiptSparklesIllustrationProps) {
  const sparkles = useMemo<SparkleConfig[]>(
    () => [
      { cx: 22, cy: 28, size: 8, color: "#00D4AA", duration: 1800, delay: 0 },
      { cx: 98, cy: 22, size: 6, color: "#F59E0B", duration: 2200, delay: 400 },
      { cx: 16, cy: 72, size: 5, color: "#FFB088", duration: 1600, delay: 800 },
      { cx: 102, cy: 62, size: 7, color: "#00D4AA", duration: 2000, delay: 200 },
    ],
    [],
  );

  const scale = size / 120;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Static receipt SVG */}
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {/* Receipt body */}
        <Path
          d={RECEIPT_PATH}
          fill="rgba(255, 255, 255, 0.15)"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={1}
        />

        {/* Text lines inside receipt */}
        <Line
          x1={42}
          y1={34}
          x2={78}
          y2={34}
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Line
          x1={42}
          y1={42}
          x2={72}
          y2={42}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Line
          x1={42}
          y1={50}
          x2={75}
          y2={50}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Line
          x1={54}
          y1={60}
          x2={78}
          y2={60}
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* Checkmark circle */}
        <Circle cx={78} cy={68} r={8} fill="#00D4AA" />
        <Path
          d={CHECKMARK_PATH}
          stroke="white"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Decorative dots */}
        <Circle cx={30} cy={18} r={2} fill="rgba(255, 255, 255, 0.3)" />
        <Circle cx={92} cy={42} r={1.5} fill="rgba(255, 255, 255, 0.25)" />
        <Circle cx={28} cy={55} r={1.5} fill="rgba(255, 255, 255, 0.2)" />
      </Svg>

      {/* Animated sparkles positioned absolutely over the SVG */}
      <View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
        {sparkles.map((sparkle, i) => (
          <AnimatedSparkle key={i} config={sparkle} />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  sparkle: {
    position: "absolute",
  },
});
