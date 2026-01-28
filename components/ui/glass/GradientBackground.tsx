/**
 * GradientBackground - Full-screen gradient background component
 *
 * Provides the deep blue gradient background that is the foundation
 * of the Glass UI design system.
 */

import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { gradients, colors } from "@/lib/design/glassTokens";

// =============================================================================
// TYPES
// =============================================================================

export type GradientVariant = "main" | "subtle" | "radial";

export interface GradientBackgroundProps {
  /** Gradient style variant */
  variant?: GradientVariant;
  /** Include safe area handling */
  safeArea?: boolean;
  /** Safe area edges to respect */
  edges?: ("top" | "bottom" | "left" | "right")[];
  /** Custom gradient colors (overrides variant) */
  customColors?: readonly [string, string, ...string[]];
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Content */
  children: React.ReactNode;
}

// =============================================================================
// GRADIENT CONFIGS
// =============================================================================

const gradientConfigs: Record<
  GradientVariant,
  {
    colors: readonly [string, string, ...string[]];
    start: { x: number; y: number };
    end: { x: number; y: number };
    locations?: readonly [number, number, ...number[]];
  }
> = {
  main: {
    colors: gradients.backgroundMain,
    start: { x: 0, y: 0 },
    end: { x: 0.5, y: 1 },
    locations: [0, 0.5, 1] as const,
  },
  subtle: {
    colors: gradients.backgroundSubtle,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  radial: {
    colors: gradients.backgroundRadial,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function GradientBackground({
  variant = "main",
  safeArea = false,
  edges = ["top", "bottom"],
  customColors,
  style,
  children,
}: GradientBackgroundProps) {
  const config = gradientConfigs[variant];
  const gradientColors = customColors || config.colors;

  const content = (
    <LinearGradient
      colors={[...gradientColors]}
      start={config.start}
      end={config.end}
      locations={config.locations}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );

  if (safeArea) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[...gradientColors]}
          start={config.start}
          end={config.end}
          locations={config.locations}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea} edges={edges}>
          {children}
        </SafeAreaView>
      </View>
    );
  }

  return content;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});

// =============================================================================
// CONVENIENCE COMPONENTS
// =============================================================================

/**
 * Screen wrapper with gradient background and safe area
 */
export function GlassScreen({
  children,
  style,
  edges = ["top"],
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ("top" | "bottom" | "left" | "right")[];
}) {
  return (
    <GradientBackground safeArea edges={edges}>
      <View style={[styles.gradient, style]}>{children}</View>
    </GradientBackground>
  );
}

export default GradientBackground;
