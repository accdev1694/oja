/**
 * GlassCard - Foundational glassmorphism card component
 *
 * Provides a translucent, frosted glass appearance with
 * subtle borders and shadows. The primary building block
 * for the Glass UI design system.
 */

import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import {
  colors,
  borderRadius as radii,
  shadows,
  animations,
  blur as blurConfig,
} from "@/lib/design/glassTokens";

// =============================================================================
// TYPES
// =============================================================================

export type GlassCardVariant = "standard" | "elevated" | "sunken" | "bordered";
export type GlassIntensity = "subtle" | "medium" | "strong";
export type GlassBorderRadius = "sm" | "md" | "lg" | "xl" | "full";

export interface GlassCardProps {
  /** Card style variant */
  variant?: GlassCardVariant;
  /** Glass effect intensity */
  intensity?: GlassIntensity;
  /** Border radius size */
  borderRadius?: GlassBorderRadius;
  /** Optional accent border color */
  accentColor?: string;
  /** Make the card pressable */
  pressable?: boolean;
  /** Press handler (requires pressable=true) */
  onPress?: () => void;
  /** Long press handler */
  onLongPress?: () => void;
  /** Disable haptic feedback */
  disableHaptics?: boolean;
  /** Enable blur effect (iOS only, falls back on Android) */
  enableBlur?: boolean;
  /** Custom styles */
  style?: StyleProp<ViewStyle>;
  /** Card content */
  children: React.ReactNode;
}

// =============================================================================
// STYLE PRESETS
// =============================================================================

const intensityValues: Record<GlassIntensity, number> = {
  subtle: 0.06,
  medium: 0.1,
  strong: 0.15,
};

const getBackgroundColor = (
  variant: GlassCardVariant,
  intensity: GlassIntensity
): string => {
  const alpha = intensityValues[intensity];

  switch (variant) {
    case "standard":
      return `rgba(255, 255, 255, ${alpha})`;
    case "elevated":
      return `rgba(255, 255, 255, ${alpha + 0.04})`;
    case "sunken":
      return `rgba(0, 0, 0, ${0.15 + alpha})`;
    case "bordered":
      return `rgba(255, 255, 255, ${alpha - 0.02})`;
    default:
      return colors.glass.background;
  }
};

const getBorderWidth = (variant: GlassCardVariant): number => {
  switch (variant) {
    case "bordered":
      return 2;
    default:
      return 1;
  }
};

const getBorderColor = (
  variant: GlassCardVariant,
  accentColor?: string
): string => {
  if (accentColor) return accentColor;

  switch (variant) {
    case "elevated":
      return colors.glass.borderFocus;
    case "bordered":
      return colors.glass.borderStrong;
    default:
      return colors.glass.border;
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCard({
  variant = "standard",
  intensity = "medium",
  borderRadius = "lg",
  accentColor,
  pressable = false,
  onPress,
  onLongPress,
  disableHaptics = false,
  enableBlur = false,
  style,
  children,
}: GlassCardProps) {
  // Animation
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Handlers
  const handlePressIn = () => {
    if (pressable) {
      scale.value = withSpring(animations.pressScale, animations.spring.stiff);
    }
  };

  const handlePressOut = () => {
    if (pressable) {
      scale.value = withSpring(1, animations.spring.gentle);
    }
  };

  const handlePress = () => {
    if (!disableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const handleLongPress = () => {
    if (!disableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onLongPress?.();
  };

  // Computed styles
  const backgroundColor = getBackgroundColor(variant, intensity);
  const borderWidth = getBorderWidth(variant);
  const borderColor = getBorderColor(variant, accentColor);
  const radius = radii[borderRadius];

  const cardStyle: ViewStyle = {
    backgroundColor,
    borderWidth,
    borderColor,
    borderRadius: radius,
    overflow: "hidden",
    ...(variant === "elevated" ? shadows.lg : {}),
  };

  // Content wrapper
  const content = (
    <View style={styles.contentWrapper}>
      {children}
    </View>
  );

  // Blur-enabled card (iOS only)
  if (enableBlur && blurConfig.isSupported && Platform.OS === "ios") {
    const blurIntensity =
      intensity === "subtle"
        ? blurConfig.light.intensity
        : intensity === "medium"
          ? blurConfig.medium.intensity
          : blurConfig.heavy.intensity;

    if (pressable) {
      return (
        <AnimatedPressable
          onPress={handlePress}
          onLongPress={onLongPress ? handleLongPress : undefined}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[cardStyle, animatedStyle, style]}
        >
          <BlurView intensity={blurIntensity} tint="dark" style={styles.blur}>
            {content}
          </BlurView>
        </AnimatedPressable>
      );
    }

    return (
      <View style={[cardStyle, style]}>
        <BlurView intensity={blurIntensity} tint="dark" style={styles.blur}>
          {content}
        </BlurView>
      </View>
    );
  }

  // Non-blur card
  if (pressable) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onLongPress={onLongPress ? handleLongPress : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[cardStyle, animatedStyle, style]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return <View style={[cardStyle, style]}>{content}</View>;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  blur: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
});

// =============================================================================
// VARIANTS (pre-styled exports for convenience)
// =============================================================================

export function ElevatedGlassCard(
  props: Omit<GlassCardProps, "variant">
) {
  return <GlassCard {...props} variant="elevated" />;
}

export function SunkenGlassCard(
  props: Omit<GlassCardProps, "variant">
) {
  return <GlassCard {...props} variant="sunken" />;
}

export function BorderedGlassCard(
  props: Omit<GlassCardProps, "variant">
) {
  return <GlassCard {...props} variant="bordered" />;
}

export default GlassCard;
