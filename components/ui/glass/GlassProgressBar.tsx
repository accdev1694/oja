/**
 * GlassProgressBar - Glassmorphism styled progress bar component
 *
 * Used for budget tracking, completion status, and other
 * progress indicators with glass styling and gradient fills.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  colors,
  gradients,
  borderRadius as radii,
  typography,
  spacing,
  animations,
} from "@/lib/design/glassTokens";

// =============================================================================
// TYPES
// =============================================================================

export type BudgetStatus = "healthy" | "caution" | "exceeded" | "neutral";
export type ProgressBarSize = "sm" | "md" | "lg";

export interface GlassProgressBarProps {
  /** Current progress value (0-100) */
  progress: number;
  /** Maximum value (defaults to 100) */
  max?: number;
  /** Budget status for color coding */
  status?: BudgetStatus;
  /** Custom gradient colors (overrides status) */
  gradientColors?: readonly [string, string];
  /** Progress bar size */
  size?: ProgressBarSize;
  /** Show percentage label */
  showLabel?: boolean;
  /** Custom label format */
  labelFormat?: (progress: number, max: number) => string;
  /** Show glow effect */
  showGlow?: boolean;
  /** Animate changes */
  animated?: boolean;
  /** Container styles */
  style?: StyleProp<ViewStyle>;
}

// =============================================================================
// SIZE PRESETS
// =============================================================================

const sizeStyles: Record<ProgressBarSize, { height: number; borderRadius: number }> = {
  sm: { height: 6, borderRadius: 3 },
  md: { height: 10, borderRadius: 5 },
  lg: { height: 16, borderRadius: 8 },
};

// =============================================================================
// STATUS COLORS
// =============================================================================

const statusGradients: Record<BudgetStatus, readonly [string, string]> = {
  healthy: gradients.budgetHealthy,
  caution: gradients.budgetCaution,
  exceeded: gradients.budgetExceeded,
  neutral: [colors.text.tertiary, colors.text.disabled] as const,
};

const statusGlowColors: Record<BudgetStatus, string> = {
  healthy: colors.budget.healthyGlow,
  caution: colors.budget.cautionGlow,
  exceeded: colors.budget.exceededGlow,
  neutral: "transparent",
};

// =============================================================================
// COMPONENT
// =============================================================================

const AnimatedView = Animated.createAnimatedComponent(View);

export function GlassProgressBar({
  progress,
  max = 100,
  status = "neutral",
  gradientColors,
  size = "md",
  showLabel = false,
  labelFormat,
  showGlow = true,
  animated = true,
  style,
}: GlassProgressBarProps) {
  const progressAnim = useSharedValue(0);
  const sStyles = sizeStyles[size];

  // Calculate percentage
  const percentage = Math.min(Math.max((progress / max) * 100, 0), 100);

  // Determine status based on percentage if not provided
  const effectiveStatus = status !== "neutral" ? status :
    percentage >= 100 ? "exceeded" :
    percentage >= 80 ? "caution" :
    "healthy";

  // Update animation
  React.useEffect(() => {
    if (animated) {
      progressAnim.value = withSpring(percentage, animations.spring.gentle);
    } else {
      progressAnim.value = percentage;
    }
  }, [percentage, animated, progressAnim]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));

  // Colors
  const fillGradient = gradientColors || statusGradients[effectiveStatus];
  const glowColor = statusGlowColors[effectiveStatus];

  // Label
  const label = labelFormat
    ? labelFormat(progress, max)
    : `${Math.round(percentage)}%`;

  return (
    <View style={[styles.container, style]}>
      {/* Track */}
      <View
        style={[
          styles.track,
          {
            height: sStyles.height,
            borderRadius: sStyles.borderRadius,
          },
        ]}
      >
        {/* Progress Fill */}
        <AnimatedView
          style={[
            styles.progressContainer,
            {
              borderRadius: sStyles.borderRadius,
            },
            animatedProgressStyle,
          ]}
        >
          <LinearGradient
            colors={[...fillGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.progressFill,
              {
                borderRadius: sStyles.borderRadius,
              },
            ]}
          />

          {/* Glow Effect */}
          {showGlow && percentage > 0 && (
            <View
              style={[
                styles.glow,
                {
                  backgroundColor: glowColor,
                  borderRadius: sStyles.borderRadius,
                },
              ]}
            />
          )}
        </AnimatedView>
      </View>

      {/* Label */}
      {showLabel && (
        <Text style={styles.label}>{label}</Text>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  track: {
    backgroundColor: colors.glass.background,
    overflow: "hidden",
  },
  progressContainer: {
    height: "100%",
    overflow: "hidden",
  },
  progressFill: {
    flex: 1,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  label: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "right",
  },
});

// =============================================================================
// BUDGET PROGRESS BAR
// =============================================================================

export interface BudgetProgressBarProps {
  /** Amount spent */
  spent: number;
  /** Budget limit */
  budget: number;
  /** Currency symbol */
  currency?: string;
  /** Show amounts label */
  showAmounts?: boolean;
  /** Progress bar size */
  size?: ProgressBarSize;
  /** Container styles */
  style?: StyleProp<ViewStyle>;
}

export function BudgetProgressBar({
  spent,
  budget,
  currency = "$",
  showAmounts = true,
  size = "md",
  style,
}: BudgetProgressBarProps) {
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;

  // Determine status
  const status: BudgetStatus =
    percentage >= 100 ? "exceeded" :
    percentage >= 80 ? "caution" :
    budget === 0 ? "neutral" :
    "healthy";

  const remaining = Math.max(budget - spent, 0);
  const isOverBudget = spent > budget;

  return (
    <View style={style}>
      <GlassProgressBar
        progress={spent}
        max={budget}
        status={status}
        size={size}
        showGlow
      />

      {showAmounts && (
        <View style={budgetStyles.amountsContainer}>
          <Text style={budgetStyles.spentText}>
            {currency}{spent.toFixed(2)}
          </Text>
          <Text
            style={[
              budgetStyles.remainingText,
              isOverBudget && budgetStyles.overBudgetText,
            ]}
          >
            {isOverBudget ? "Over by " : ""}
            {currency}{isOverBudget ? (spent - budget).toFixed(2) : remaining.toFixed(2)}
            {!isOverBudget && " left"}
          </Text>
        </View>
      )}
    </View>
  );
}

const budgetStyles = StyleSheet.create({
  amountsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  spentText: {
    ...typography.labelMedium,
    color: colors.text.primary,
  },
  remainingText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  overBudgetText: {
    color: colors.accent.error,
  },
});

export default GlassProgressBar;
