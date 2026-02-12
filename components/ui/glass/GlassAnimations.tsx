/**
 * GlassAnimations - Reusable animation components and hooks
 *
 * Features:
 * - Pressable scale animations
 * - Fade in/out transitions
 * - Staggered list animations
 * - Micro-interaction feedback
 *
 * @example
 * // Animated pressable
 * <AnimatedPressable onPress={handlePress}>
 *   <YourContent />
 * </AnimatedPressable>
 *
 * // Animated list item
 * <AnimatedListItem index={0}>
 *   <YourItem />
 * </AnimatedListItem>
 */

import React, { useCallback, useEffect } from "react";
import { Pressable, PressableProps, ViewStyle, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Extrapolate,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  Layout,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { animations } from "@/lib/design/glassTokens";

// Need to import withRepeat
import { withRepeat } from "react-native-reanimated";

// =============================================================================
// ANIMATED PRESSABLE COMPONENT
// =============================================================================

export interface AnimatedPressableProps extends PressableProps {
  /** Scale when pressed (0-1), default 0.97 */
  pressScale?: number;
  /** Spring configuration */
  springConfig?: typeof animations.spring.gentle;
  /** Whether to trigger haptic feedback */
  enableHaptics?: boolean;
  /** Haptic feedback style */
  hapticStyle?: "light" | "medium" | "heavy";
  /** Animation style */
  animationType?: "scale" | "opacity" | "both";
  /** Container style */
  style?: ViewStyle;
  /** Children */
  children: React.ReactNode;
}

export function AnimatedPressable({
  pressScale = 0.97,
  springConfig = animations.spring.gentle,
  enableHaptics = true,
  hapticStyle = "light",
  animationType = "scale",
  style,
  children,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    const transforms: { scale?: number }[] = [];
    const styleObj: ViewStyle = {};

    if (animationType === "scale" || animationType === "both") {
      transforms.push({ scale: scale.value });
    }

    if (animationType === "opacity" || animationType === "both") {
      styleObj.opacity = opacity.value;
    }

    if (transforms.length > 0) {
      styleObj.transform = transforms as any;
    }

    return styleObj;
  });

  const handlePressIn = useCallback(
    (event: any) => {
      if (enableHaptics) {
        const feedbackStyle =
          hapticStyle === "light"
            ? Haptics.ImpactFeedbackStyle.Light
            : hapticStyle === "medium"
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Heavy;
        Haptics.impactAsync(feedbackStyle);
      }

      scale.value = withSpring(pressScale, animations.spring.stiff);
      opacity.value = withTiming(0.9, { duration: 100 });

      onPressIn?.(event);
    },
    [enableHaptics, hapticStyle, pressScale, onPressIn]
  );

  const handlePressOut = useCallback(
    (event: any) => {
      scale.value = withSpring(1, springConfig);
      opacity.value = withTiming(1, { duration: 100 });

      onPressOut?.(event);
    },
    [springConfig, onPressOut]
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...props}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

// =============================================================================
// ANIMATED LIST ITEM COMPONENT
// =============================================================================

export interface AnimatedListItemProps {
  /** Index in the list (for stagger delay) */
  index: number;
  /** Base delay between items in ms */
  staggerDelay?: number;
  /** Animation duration in ms */
  duration?: number;
  /** Animation type */
  animationType?: "fade" | "slide" | "fadeSlide" | "scale";
  /** Direction for slide animations */
  slideDirection?: "left" | "right" | "up" | "down";
  /** Whether to animate layout changes */
  animateLayout?: boolean;
  /** Container style */
  style?: ViewStyle;
  /** Children */
  children: React.ReactNode;
}

export function AnimatedListItem({
  index,
  staggerDelay = 50,
  duration = 300,
  animationType = "fadeSlide",
  slideDirection = "right",
  animateLayout = true,
  style,
  children,
}: AnimatedListItemProps) {
  const delay = index * staggerDelay;

  const getEnteringAnimation = () => {
    switch (animationType) {
      case "fade":
        return FadeIn.delay(delay).duration(duration);
      case "slide":
        return SlideInRight.delay(delay).duration(duration);
      case "scale":
        return FadeIn.delay(delay).duration(duration);
      case "fadeSlide":
      default:
        return FadeIn.delay(delay)
          .duration(duration)
          .withInitialValues({ opacity: 0, transform: [{ translateX: 20 }] });
    }
  };

  return (
    <Animated.View
      entering={getEnteringAnimation()}
      exiting={FadeOut.duration(200)}
      layout={animateLayout ? Layout.springify() : undefined}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

// =============================================================================
// ANIMATED BADGE COMPONENT
// =============================================================================

export interface AnimatedBadgeProps {
  /** Value to display */
  value: number | string;
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** Size */
  size?: "small" | "medium" | "large";
  /** Whether to animate value changes */
  animateChanges?: boolean;
  /** Style */
  style?: ViewStyle;
}

export function AnimatedBadge({
  value,
  backgroundColor = "#00D4AA",
  textColor = "#FFFFFF",
  size = "medium",
  animateChanges = true,
  style,
}: AnimatedBadgeProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (animateChanges) {
      scale.value = withSpring(1.2, animations.spring.stiff);
      scale.value = withDelay(100, withSpring(1, animations.spring.gentle));
    }
  }, [value, animateChanges]);

  const sizeStyles = {
    small: { minWidth: 18, height: 18, fontSize: 10, paddingHorizontal: 4 },
    medium: { minWidth: 22, height: 22, fontSize: 12, paddingHorizontal: 6 },
    large: { minWidth: 28, height: 28, fontSize: 14, paddingHorizontal: 8 },
  };

  const sizeConfig = sizeStyles[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor,
          minWidth: sizeConfig.minWidth,
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
        },
        animatedStyle,
        style,
      ]}
    >
      <Animated.Text
        style={[styles.badgeText, { color: textColor, fontSize: sizeConfig.fontSize }]}
      >
        {value}
      </Animated.Text>
    </Animated.View>
  );
}

// =============================================================================
// SHIMMER EFFECT COMPONENT
// =============================================================================

export interface ShimmerEffectProps {
  /** Width of shimmer area */
  width: number | `${number}%`;
  /** Height of shimmer area */
  height: number;
  /** Border radius */
  borderRadius?: number;
  /** Style */
  style?: ViewStyle;
}

export function ShimmerEffect({
  width,
  height,
  borderRadius = 8,
  style,
}: ShimmerEffectProps) {
  const shimmerPosition = useSharedValue(0);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          shimmerPosition.value,
          [0, 1],
          [-200, 200],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.shimmerContainer,
        { width, height, borderRadius },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmerGradient, animatedStyle]} />
    </Animated.View>
  );
}

// =============================================================================
// PULSE ANIMATION COMPONENT
// =============================================================================

export interface PulseAnimationProps {
  /** Children to wrap */
  children: React.ReactNode;
  /** Whether animation is active */
  isActive?: boolean;
  /** Pulse scale */
  pulseScale?: number;
  /** Duration in ms */
  duration?: number;
  /** Style */
  style?: ViewStyle;
}

export function PulseAnimation({
  children,
  isActive = true,
  pulseScale = 1.05,
  duration = 1000,
  style,
}: PulseAnimationProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withTiming(pulseScale, { duration: duration / 2 }),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [isActive, pulseScale, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
  );
}

// =============================================================================
// SUCCESS CHECK ANIMATION
// =============================================================================

export interface SuccessCheckProps {
  /** Whether check is visible */
  visible: boolean;
  /** Size */
  size?: number;
  /** Color */
  color?: string;
  /** On animation complete callback */
  onComplete?: () => void;
}

export function SuccessCheck({
  visible,
  size = 48,
  color = "#00D4AA",
  onComplete,
}: SuccessCheckProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, animations.spring.bouncy);

      // Call onComplete after animation
      if (onComplete) {
        const timeout = setTimeout(onComplete, 600);
        return () => clearTimeout(timeout);
      }
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.successCheck,
        { width: size, height: size, borderRadius: size / 2 },
        animatedStyle,
      ]}
    >
      <Animated.Text style={[styles.checkmark, { fontSize: size * 0.6, color }]}>
        ✓
      </Animated.Text>
    </Animated.View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  badge: {
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontWeight: "700",
  },
  shimmerContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  shimmerGradient: {
    ...StyleSheet.absoluteFillObject,
    width: 100,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  successCheck: {
    backgroundColor: "rgba(0, 212, 170, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    fontWeight: "bold",
  },
});

// =============================================================================
// ANIMATION PRESETS EXPORT
// =============================================================================

export const animationPresets = {
  fadeIn: FadeIn.duration(300),
  fadeOut: FadeOut.duration(200),
  slideIn: SlideInRight.duration(300),
  slideOut: SlideOutLeft.duration(200),
  springBouncy: animations.spring.bouncy,
  springGentle: animations.spring.gentle,
  springStiff: animations.spring.stiff,
};
