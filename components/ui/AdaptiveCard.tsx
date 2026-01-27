import React from "react";
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useDeviceCapabilities } from "@/hooks/useDeviceCapabilities";
import { getDesignTokens, applyPlatformAdjustments } from "@/lib/design/tokens";

export interface AdaptiveCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevation?: "sm" | "md" | "lg";
  blurIntensity?: number;
}

/**
 * AdaptiveCard - Platform and tier-adaptive card component
 *
 * Premium tier (iOS 16+):
 * - Liquid Glass blur effect with translucent background
 * - High-quality shadows
 * - Smooth animations
 *
 * Enhanced tier (Android 12+, iOS 14-15):
 * - Gradient background mimicking blur
 * - Medium shadows
 * - Standard animations
 *
 * Baseline tier (older devices):
 * - Solid color background
 * - Minimal shadows
 * - Simple animations
 *
 * @example
 * <AdaptiveCard elevation="md">
 *   <Text>Content here</Text>
 * </AdaptiveCard>
 */
export function AdaptiveCard({
  children,
  style,
  elevation = "md",
  blurIntensity,
}: AdaptiveCardProps) {
  const { tier, supportsBlur } = useDeviceCapabilities();
  const tokens = applyPlatformAdjustments(getDesignTokens(tier));

  const shadowStyle = tokens.shadow[elevation];
  const containerStyle: ViewStyle = {
    borderRadius: tokens.borderRadius.md,
    overflow: "hidden",
    ...shadowStyle,
  };

  // Premium tier: Liquid Glass blur
  if (supportsBlur && tier === "premium") {
    return (
      <View style={[containerStyle, style]}>
        <BlurView
          intensity={blurIntensity ?? tokens.blur.intensity}
          tint={tokens.blur.tint}
          style={styles.blurContainer}
        >
          <View
            style={[
              styles.content,
              {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                padding: tokens.spacing.md,
              },
            ]}
          >
            {children}
          </View>
        </BlurView>
      </View>
    );
  }

  // Enhanced tier: Gradient fallback
  if (tier === "enhanced") {
    return (
      <View style={[containerStyle, style]}>
        <LinearGradient
          colors={[
            "rgba(255, 255, 255, 0.95)",
            "rgba(255, 250, 248, 0.98)",
            "rgba(255, 255, 255, 1)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientContainer}
        >
          <View
            style={[
              styles.content,
              {
                padding: tokens.spacing.md,
                borderWidth: 1,
                borderColor: tokens.colors.border,
                borderRadius: tokens.borderRadius.md,
              },
            ]}
          >
            {children}
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Baseline tier: Solid background
  return (
    <View
      style={[
        containerStyle,
        styles.solidContainer,
        {
          backgroundColor: tokens.colors.surface,
          padding: tokens.spacing.md,
          borderWidth: 1,
          borderColor: tokens.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  solidContainer: {
    // Base styles for solid background
  },
  content: {
    flex: 1,
  },
});
