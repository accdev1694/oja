/**
 * CircularBudgetDial - SVG-based circular arc showing budget progress
 *
 * - Green arc fills clockwise from 6 o'clock as budget is used
 * - At 100%, green completes full circle back to 6 o'clock
 * - Over budget: red arc continues past 6 o'clock clockwise
 * - Shrinking (e.g., during shopping) animates anticlockwise
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

  // Start at 6 o'clock (bottom) - SVG starts at 3 o'clock, so rotate 90°
  const startRotation = 90;

  // Separator line at 6 o'clock (bottom center)
  const separatorLength = 10;
  const separatorY1 = center + radius - separatorLength / 2;
  const separatorY2 = center + radius + separatorLength / 2;

  // Calculate ratios
  const greenRatio = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const overRatio = budget > 0 ? Math.max((spent - budget) / budget, 0) : 0;
  // Cap over-budget at 100% extra (200% total) for visual sanity
  const cappedOverRatio = Math.min(overRatio, 1);

  const remaining = budget - spent;
  const isOver = spent > budget;

  // Green color changes as we approach budget
  const getGreenColor = () => {
    if (spent > budget * 0.8 && spent <= budget) return colors.semantic.warning;
    return colors.semantic.success;
  };
  const greenColor = getGreenColor();

  const getSentiment = () => {
    if (budget <= 0) return null;
    if (isOver) return "Over budget — time to review";
    if (spent > budget * 0.8) return "Getting close — stay focused";
    if (spent > budget * 0.5) return "On track — doing well";
    return "Looking good — lots of room left";
  };
  const sentiment = getSentiment();
  const sentimentColor = isOver ? colors.semantic.danger : greenColor;

  // Animated values for smooth transitions (both grow and shrink)
  const animatedGreenRatio = useSharedValue(0);
  const animatedRedRatio = useSharedValue(0);

  useEffect(() => {
    animatedGreenRatio.value = withTiming(greenRatio, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    animatedRedRatio.value = withTiming(cappedOverRatio, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [greenRatio, cappedOverRatio]);

  // Green arc props (0-100% of budget)
  const animatedGreenProps = useAnimatedProps(() => {
    const filledLength = circumference * animatedGreenRatio.value;
    return {
      strokeDashoffset: circumference - filledLength,
    };
  });

  // Red arc props (over-budget overflow)
  const animatedRedProps = useAnimatedProps(() => {
    const filledLength = circumference * animatedRedRatio.value;
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
          {/* Green fill arc (0-100% of budget) */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={greenColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeLinecap="round"
            rotation={startRotation}
            origin={`${center}, ${center}`}
            animatedProps={animatedGreenProps}
          />
          {/* Red overflow arc (over-budget, continues past 6 o'clock) */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.semantic.danger}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeLinecap="round"
            rotation={startRotation}
            origin={`${center}, ${center}`}
            animatedProps={animatedRedProps}
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
          {/* Budget (biggest) */}
          <Text
            style={styles.budgetAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {currency}
            {budget.toFixed(2)}
          </Text>

          {/* Spent (with state color) */}
          <Text style={[styles.spentLabel, { color: sentimentColor }]}>
            {currency}
            {spent.toFixed(2)} spent
          </Text>

          {/* Left/Over (with state color) */}
          <Text
            style={[
              styles.remainingLabel,
              { color: isOver ? colors.semantic.danger : colors.semantic.success },
            ]}
          >
            {isOver
              ? `${currency}${Math.abs(remaining).toFixed(2)} over`
              : `${currency}${remaining.toFixed(2)} left`}
          </Text>
        </View>

        {/* Pencil badge to signal tappability */}
        {onPress && (
          <View style={styles.editBadge}>
            <MaterialCommunityIcons name="pencil" size={12} color={colors.text.secondary} />
          </View>
        )}
      </View>
      {sentiment && (
        <Text style={[styles.sentiment, { color: sentimentColor }]}>{sentiment}</Text>
      )}
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
  },
  budgetAmount: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    fontWeight: "700",
    fontSize: 20,
  },
  spentLabel: {
    ...typography.labelSmall,
    fontSize: 11,
    marginTop: 2,
  },
  remainingLabel: {
    ...typography.labelSmall,
    fontSize: 11,
    marginTop: 1,
    fontWeight: "600",
  },
  sentiment: {
    ...typography.labelSmall,
    marginTop: 6,
    opacity: 0.85,
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
