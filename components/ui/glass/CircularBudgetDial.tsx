/**
 * CircularBudgetDial - SVG-based circular arc showing budget progress
 *
 * Replaces the collapsible budget card with a visual dial.
 * ~330° arc with a small gap + separator line at the 6 o'clock position.
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors, typography, spacing } from "@/lib/design/glassTokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularBudgetDialProps {
  spent: number;
  budget: number;
  size?: number;
  currency?: string;
  onPress?: () => void;
}

export function CircularBudgetDial({
  spent,
  budget,
  size = 140,
  currency = "£",
  onPress,
}: CircularBudgetDialProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  const circumference = 2 * Math.PI * radius;

  // Fill starts at 6 o'clock (bottom) and goes full circle clockwise
  const startRotation = 180;

  // Separator line at 6 o'clock (bottom center) between end and start
  const separatorLength = 10;
  const separatorY1 = center + radius - separatorLength / 2;
  const separatorY2 = center + radius + separatorLength / 2;

  // Calculate fill ratio (capped at 1.0 for visual, but we show "over" text)
  const ratio = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const remaining = budget - spent;
  const isOver = spent > budget;

  // Budget state for color
  const getColor = () => {
    if (isOver) return colors.semantic.danger;
    if (spent > budget * 0.8) return colors.semantic.warning;
    return colors.semantic.success;
  };
  const fillColor = getColor();

  // Animated fill
  const animatedRatio = useSharedValue(0);

  useEffect(() => {
    animatedRatio.value = withTiming(ratio, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [ratio]);

  const animatedFillProps = useAnimatedProps(() => {
    const filledLength = circumference * animatedRatio.value;
    return {
      strokeDashoffset: circumference - filledLength,
    };
  });

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper onPress={onPress} style={[styles.container, { marginBottom: spacing.md }]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Track circle (background) */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Fill arc (progress) */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={fillColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeLinecap="round"
            rotation={startRotation}
            origin={`${center}, ${center}`}
            animatedProps={animatedFillProps}
          />
          {/* Separator line at 6 o'clock */}
          <Line
            x1={center}
            y1={separatorY1}
            x2={center}
            y2={separatorY2}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </Svg>

        {/* Center text overlay */}
        <View style={[styles.centerText, { width: size, height: size }]}>
          <Text
            style={[
              styles.amount,
              isOver && { color: colors.semantic.danger },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {currency}
            {Math.abs(remaining).toFixed(2)}
          </Text>
          <Text style={styles.label}>
            {isOver ? "over budget" : "remaining"}
          </Text>
          <Text style={styles.subLabel}>
            of {currency}
            {budget.toFixed(2)}
          </Text>
        </View>

        {/* Pencil badge to signal tappability */}
        {onPress && (
          <View style={styles.editBadge}>
            <MaterialCommunityIcons name="pencil" size={12} color={colors.text.secondary} />
          </View>
        )}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  centerText: {
    position: "absolute",
    top: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 4,
  },
  amount: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    fontWeight: "700",
  },
  label: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginTop: -2,
  },
  subLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontSize: 10,
    marginTop: 1,
  },
  editBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
