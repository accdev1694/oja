import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Line, Circle, Text as SvgText } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
} from "react-native-reanimated";

export type StockLevel = "stocked" | "good" | "half" | "low" | "out";

// Ordered from empty to full
export const STOCK_LEVEL_ORDER: StockLevel[] = [
  "out",
  "low",
  "half",
  "good",
  "stocked",
];

export const STOCK_LEVEL_PERCENTAGES: Record<StockLevel, number> = {
  out: 0,
  low: 25,
  half: 50,
  good: 75,
  stocked: 100,
};

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  out: "Out of stock",
  low: "Running low",
  half: "Half stocked",
  good: "Good supply",
  stocked: "Fully stocked",
};

export const STOCK_LEVEL_SHORT: Record<StockLevel, string> = {
  out: "Out",
  low: "Low",
  half: "Half",
  good: "Good",
  stocked: "Full",
};

// Colors for each stock level (used for text + needle assignment)
const GAUGE_COLORS: Record<StockLevel, string> = {
  out: "#EF4444", // Red
  low: "#F59E0B", // Amber
  half: "#EAB308", // Yellow
  good: "#34D399", // Light green
  stocked: "#10B981", // Green
};

// ============================================================================
// 180° SEMICIRCLE ARC GEOMETRY
// Arc runs from west (180°) to east (0°) across the top — a semicircle.
// 4 colored segments of 45° each, with small gaps between them.
// 5 graduation tick marks at segment boundaries where the needle lands.
// ============================================================================

const ARC_START = 180; // 9 o'clock (far left)
const ARC_END = 0; // 3 o'clock (far right), but in math terms we sweep to 360
// We work in standard math angles: 180° is left, 0°/360° is right.
// Sweep goes from 180° DOWN to 0° which means angles decrease: 180, 135, 90, 45, 0
const SEGMENT_COUNT = 4;
const SEGMENT_SWEEP = 45; // degrees per segment
const SEGMENT_GAP = 1.5; // degrees gap between segments

// Segment definitions: each has a start angle, end angle, and color
// Angles go from 180 (left) to 0 (right), so segment 1 starts at 180 and ends at 135
const SEGMENT_COLORS = ["#EF4444", "#F59E0B", "#EAB308", "#10B981"];

// Needle lands on the 5 graduation marks (segment boundaries)
// Angles: 180°, 135°, 90°, 45°, 0°
const LEVEL_ANGLES: Record<StockLevel, number> = {
  out: 180,
  low: 135,
  half: 90,
  good: 45,
  stocked: 0,
};

// Graduation tick angles (same as needle positions)
const TICK_ANGLES = [180, 135, 90, 45, 0];

const AnimatedLine = Animated.createAnimatedComponent(Line);

interface GaugeIndicatorProps {
  level: StockLevel;
  size?: "small" | "large";
}

// Convert degrees to radians
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Describe an SVG arc path from startAngle to endAngle (counter-clockwise in SVG)
// Since SVG Y-axis is inverted, angles work: 180° = left, 0° = right, 90° = top
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  // In SVG coordinate space, we negate Y for standard math angles
  const startRad = degToRad(startAngle);
  const endRad = degToRad(endAngle);
  const start = {
    x: cx + r * Math.cos(startRad),
    y: cy - r * Math.sin(startRad),
  };
  const end = {
    x: cx + r * Math.cos(endRad),
    y: cy - r * Math.sin(endRad),
  };
  // For a semicircle going left-to-right (180° to 0°), each segment < 180°
  // We sweep counter-clockwise in math, which is clockwise in SVG (sweep-flag=0)
  const angleDiff = startAngle - endAngle;
  const largeArc = angleDiff > 180 ? 1 : 0;
  // sweep-flag 0 = counter-clockwise in SVG = our left-to-right direction
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

/*
 * Layout strategy (180° semicircle):
 * - The arc sits in the upper portion as a half-circle (west → east)
 * - The bottom half is open — reserved for large percentage text
 * - Needle pivots from arc center, pointing outward to tick marks
 * - Graduation ticks at each of the 5 level positions
 *
 * Small (56px): card-row gauge with readable percentage
 * Large (180px): picker modal gauge with hero percentage
 */
const SIZE_CONFIG = {
  small: {
    viewBox: 90,
    cx: 45,
    cy: 44,
    radius: 26,
    arcStroke: 5,
    needleLength: 20,
    needleStroke: 2,
    centerDotR: 3,
    fontSize: 20,
    textY: 72,
    containerSize: 64,
    bgPad: 14,
    tickLength: 4,
    tickStroke: 1.5,
  },
  large: {
    viewBox: 200,
    cx: 100,
    cy: 88,
    radius: 64,
    arcStroke: 10,
    needleLength: 48,
    needleStroke: 3,
    centerDotR: 5,
    fontSize: 42,
    textY: 158,
    containerSize: 150,
    bgPad: 7,
    tickLength: 7,
    tickStroke: 2,
  },
};

export function GaugeIndicator({ level, size = "small" }: GaugeIndicatorProps) {
  const config = SIZE_CONFIG[size];
  const { cx, cy } = config;

  // Animated needle angle
  const needleAngle = useSharedValue(LEVEL_ANGLES[level]);

  useEffect(() => {
    needleAngle.value = withSpring(LEVEL_ANGLES[level], {
      damping: 10,
      stiffness: 120,
      mass: 0.6,
    });
  }, [level]);

  // Animated needle end point (using math angles with SVG Y-flip)
  const animatedNeedleProps = useAnimatedProps(() => {
    const angle = needleAngle.value;
    const rad = (angle * Math.PI) / 180;
    const endX = cx + config.needleLength * Math.cos(rad);
    const endY = cy - config.needleLength * Math.sin(rad);
    return {
      x2: String(endX),
      y2: String(endY),
    };
  });

  // Draw 4 arc segments with gaps between them
  const arcSegments = [];
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    // Segments go from left (180°) to right (0°)
    // Segment i starts at 180 - i*45 and ends at 180 - (i+1)*45
    const segStart = ARC_START - i * SEGMENT_SWEEP - SEGMENT_GAP / 2;
    const segEnd = ARC_START - (i + 1) * SEGMENT_SWEEP + SEGMENT_GAP / 2;
    const d = describeArc(cx, cy, config.radius, segStart, segEnd);
    arcSegments.push(
      <Path
        key={`seg-${i}`}
        d={d}
        fill="none"
        stroke={SEGMENT_COLORS[i]}
        strokeWidth={config.arcStroke}
        strokeLinecap="round"
      />
    );
  }

  // Draw graduation tick marks at the 5 boundary positions
  const ticks = TICK_ANGLES.map((angle, i) => {
    const rad = degToRad(angle);
    const innerR = config.radius - config.tickLength / 2 - config.arcStroke / 2 - 1;
    const outerR = config.radius + config.tickLength / 2 + config.arcStroke / 2 + 1;
    const x1 = cx + innerR * Math.cos(rad);
    const y1 = cy - innerR * Math.sin(rad);
    const x2 = cx + outerR * Math.cos(rad);
    const y2 = cy - outerR * Math.sin(rad);
    return (
      <Line
        key={`tick-${i}`}
        x1={String(x1)}
        y1={String(y1)}
        x2={String(x2)}
        y2={String(y2)}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={config.tickStroke}
        strokeLinecap="round"
      />
    );
  });

  const shortLabel = STOCK_LEVEL_SHORT[level];
  const textColor = GAUGE_COLORS[level];

  return (
    <View
      style={[
        styles.container,
        {
          width: config.containerSize,
          height: config.containerSize,
        },
      ]}
    >
      <Svg
        width={config.containerSize}
        height={config.containerSize}
        viewBox={`0 0 ${config.viewBox} ${config.viewBox}`}
      >
        {/* Dark background circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={config.radius + config.arcStroke / 2 + config.bgPad}
          fill="rgba(11, 20, 38, 0.85)"
        />

        {/* 4 colored arc segments */}
        {arcSegments}

        {/* Graduation tick marks */}
        {ticks}

        {/* Animated needle */}
        <AnimatedLine
          x1={String(cx)}
          y1={String(cy)}
          animatedProps={animatedNeedleProps}
          stroke="#FFFFFF"
          strokeWidth={config.needleStroke}
          strokeLinecap="round"
        />

        {/* Center pivot dot */}
        <Circle cx={cx} cy={cy} r={config.centerDotR} fill="#00D4AA" />

        {/* Percentage text in the open bottom half */}
        <SvgText
          x={cx}
          y={config.textY}
          textAnchor="middle"
          fontSize={config.fontSize}
          fontWeight="700"
          fill={textColor}
        >
          {shortLabel}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
