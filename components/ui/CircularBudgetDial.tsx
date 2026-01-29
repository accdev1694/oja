import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors, typography, spacing } from "./glass";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularBudgetDialProps {
  value: number;
  onChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  size?: number;
  strokeWidth?: number;
}

export function CircularBudgetDial({
  value,
  onChange,
  minValue = 0,
  maxValue = 500,
  step = 5,
  size = 220,
  strokeWidth = 16,
}: CircularBudgetDialProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Shared values for animation
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const isActive = useSharedValue(false);

  // Convert value to angle (0-360 degrees, starting from top)
  const valueToAngle = (val: number) => {
    const normalized = (val - minValue) / (maxValue - minValue);
    return normalized * 270; // Use 270 degrees of the circle (from -135 to 135)
  };

  // Convert angle to value
  const angleToValue = (angle: number) => {
    const normalized = Math.max(0, Math.min(270, angle)) / 270;
    const rawValue = minValue + normalized * (maxValue - minValue);
    return Math.round(rawValue / step) * step;
  };

  // Initialize rotation from value
  useEffect(() => {
    rotation.value = valueToAngle(value);
  }, [value]);

  // Haptic feedback helper
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const triggerMilestoneHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Track last snapped value to avoid repeated haptics
  let lastSnappedValue = value;

  // Pan gesture for the dial
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isActive.value = true;
      scale.value = withSpring(1.05, { damping: 15 });
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      // Calculate angle from gesture position relative to center
      const dx = event.x - center;
      const dy = event.y - center;

      // Calculate angle in degrees (0 at top, clockwise)
      let angle = Math.atan2(dx, -dy) * (180 / Math.PI);

      // Normalize to 0-360
      if (angle < 0) angle += 360;

      // Map to our 270-degree range (starting from -135 degrees / 225 in normalized)
      // Offset by 135 to start from bottom-left
      let mappedAngle = angle - 225;
      if (mappedAngle < 0) mappedAngle += 360;

      // Clamp to 0-270
      mappedAngle = Math.max(0, Math.min(270, mappedAngle));

      rotation.value = mappedAngle;

      const newValue = angleToValue(mappedAngle);

      // Trigger haptic on value change
      if (newValue !== lastSnappedValue) {
        // Milestone haptics at £50 increments
        if (newValue % 50 === 0) {
          runOnJS(triggerMilestoneHaptic)();
        } else if (newValue % step === 0) {
          runOnJS(triggerHaptic)();
        }
        lastSnappedValue = newValue;
        runOnJS(onChange)(newValue);
      }
    })
    .onEnd(() => {
      isActive.value = false;
      scale.value = withSpring(1, { damping: 15 });
    });

  // Calculate node position based on rotation
  const nodeStyle = useAnimatedStyle(() => {
    const angleRad = ((rotation.value - 135) * Math.PI) / 180;
    const x = center + radius * Math.sin(angleRad);
    const y = center - radius * Math.cos(angleRad);

    return {
      transform: [
        { translateX: x - 20 },
        { translateY: y - 20 },
        { scale: scale.value },
      ],
    };
  });

  // Calculate progress arc
  const progressProps = useAnimatedProps(() => {
    const progress = rotation.value / 270;
    const strokeDashoffset = circumference * (1 - progress * 0.75);

    return {
      strokeDashoffset,
    };
  });

  // Calculate impulse fund
  const impulseFund = value * 0.1;
  const totalLimit = value + impulseFund;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles.dialContainer}>
          {/* SVG Circle Track */}
          <Svg width={size} height={size} style={styles.svg}>
            <Defs>
              <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={colors.accent.primary} />
                <Stop offset="100%" stopColor={colors.accent.secondary} />
              </LinearGradient>
            </Defs>

            {/* Background track */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.glass.border}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
              rotation={-225}
              origin={`${center}, ${center}`}
            />

            {/* Progress arc */}
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#progressGradient)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animatedProps={progressProps}
              rotation={-225}
              origin={`${center}, ${center}`}
            />
          </Svg>

          {/* Draggable Node */}
          <Animated.View style={[styles.node, nodeStyle]}>
            <View style={styles.nodeInner}>
              <View style={styles.nodeCenter} />
            </View>
          </Animated.View>

          {/* Center Content */}
          <View style={styles.centerContent}>
            <Text style={styles.currencySymbol}>£</Text>
            <Text style={styles.valueText}>{value}</Text>
            <Text style={styles.labelText}>Budget</Text>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Impulse Fund Info */}
      <View style={styles.impulseFundInfo}>
        <View style={styles.impulseFundRow}>
          <Text style={styles.impulseFundLabel}>+10% Impulse Fund</Text>
          <Text style={styles.impulseFundValue}>£{impulseFund.toFixed(0)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Limit</Text>
          <Text style={styles.totalValue}>£{totalLimit.toFixed(0)}</Text>
        </View>
      </View>

      {/* Quick Select Buttons */}
      <View style={styles.quickSelect}>
        {[25, 50, 100, 150, 200].map((preset) => (
          <Pressable
            key={preset}
            style={[
              styles.quickSelectButton,
              value === preset && styles.quickSelectButtonActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onChange(preset);
            }}
          >
            <Text
              style={[
                styles.quickSelectText,
                value === preset && styles.quickSelectTextActive,
              ]}
            >
              £{preset}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  dialContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
  node: {
    position: "absolute",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  nodeInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: colors.accent.primary,
  },
  nodeCenter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent.primary,
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  currencySymbol: {
    ...typography.headlineSmall,
    color: colors.accent.primary,
    marginBottom: -4,
  },
  valueText: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.text.primary,
    letterSpacing: -2,
  },
  labelText: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
    marginTop: -4,
  },
  impulseFundInfo: {
    marginTop: spacing.lg,
    width: "100%",
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  impulseFundRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  impulseFundLabel: {
    ...typography.bodySmall,
    color: colors.accent.secondary,
  },
  impulseFundValue: {
    ...typography.labelMedium,
    color: colors.accent.secondary,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  totalLabel: {
    ...typography.labelMedium,
    color: colors.text.primary,
  },
  totalValue: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "700",
  },
  quickSelect: {
    flexDirection: "row",
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  quickSelectButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  quickSelectButtonActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  quickSelectText: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  quickSelectTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
