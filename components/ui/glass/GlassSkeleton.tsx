/**
 * GlassSkeleton - Loading placeholder component with shimmer effect
 *
 * Features:
 * - Multiple preset shapes (text, card, avatar, button, list-item)
 * - Customizable dimensions
 * - Animated shimmer effect
 * - Glass styling consistency
 *
 * @example
 * // Simple text skeleton
 * <GlassSkeleton variant="text" width={200} />
 *
 * // Card skeleton
 * <GlassSkeleton variant="card" height={120} />
 *
 * // Custom skeleton
 * <GlassSkeleton width={100} height={100} borderRadius={50} />
 */

import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, borderRadius } from "@/lib/design/glassTokens";

// =============================================================================
// TYPES
// =============================================================================

export type SkeletonVariant =
  | "text"
  | "title"
  | "card"
  | "avatar"
  | "avatar-lg"
  | "button"
  | "list-item"
  | "icon"
  | "custom";

export interface GlassSkeletonProps {
  /** Preset shape variant */
  variant?: SkeletonVariant;
  /** Custom width (overrides variant default) */
  width?: number | `${number}%`;
  /** Custom height (overrides variant default) */
  height?: number;
  /** Border radius (overrides variant default) */
  borderRadius?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Whether to animate the shimmer */
  animated?: boolean;
}

// =============================================================================
// VARIANT PRESETS
// =============================================================================

const VARIANT_PRESETS: Record<
  SkeletonVariant,
  { width: number | `${number}%`; height: number; borderRadius: number }
> = {
  text: { width: "100%", height: 16, borderRadius: 4 },
  title: { width: "70%", height: 24, borderRadius: 6 },
  card: { width: "100%", height: 100, borderRadius: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  "avatar-lg": { width: 64, height: 64, borderRadius: 32 },
  button: { width: "100%", height: 48, borderRadius: 12 },
  "list-item": { width: "100%", height: 72, borderRadius: 12 },
  icon: { width: 24, height: 24, borderRadius: 4 },
  custom: { width: 100, height: 100, borderRadius: 8 },
};

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

export function GlassSkeleton({
  variant = "text",
  width,
  height,
  borderRadius: customBorderRadius,
  style,
  animated = true,
}: GlassSkeletonProps) {
  const preset = VARIANT_PRESETS[variant];
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      shimmerProgress.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      );
    }
  }, [animated]);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerProgress.value,
      [0, 1],
      [-200, 200]
    );
    return {
      transform: [{ translateX }],
    };
  });

  const finalWidth = width ?? preset.width;
  const finalHeight = height ?? preset.height;
  const finalBorderRadius = customBorderRadius ?? preset.borderRadius;

  return (
    <View
      style={[
        styles.container,
        {
          width: finalWidth,
          height: finalHeight,
          borderRadius: finalBorderRadius,
        },
        style,
      ]}
    >
      {animated && (
        <Animated.View style={[styles.shimmerWrapper, shimmerStyle]}>
          <LinearGradient
            colors={[
              "transparent",
              `${colors.glass.backgroundStrong}`,
              "transparent",
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      )}
    </View>
  );
}

// =============================================================================
// SKELETON GROUPS
// =============================================================================

export interface SkeletonCardProps {
  style?: ViewStyle;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <View style={[styles.skeletonCard, style]}>
      <View style={styles.skeletonCardRow}>
        <GlassSkeleton variant="avatar" />
        <View style={styles.skeletonCardContent}>
          <GlassSkeleton variant="title" width="80%" />
          <GlassSkeleton variant="text" width="60%" />
        </View>
      </View>
    </View>
  );
}

export interface SkeletonListItemProps {
  hasIcon?: boolean;
  hasSubtitle?: boolean;
  style?: ViewStyle;
}

export function SkeletonListItem({
  hasIcon = true,
  hasSubtitle = true,
  style,
}: SkeletonListItemProps) {
  return (
    <View style={[styles.skeletonListItem, style]}>
      {hasIcon && <GlassSkeleton variant="avatar" />}
      <View style={styles.skeletonListContent}>
        <GlassSkeleton variant="text" width="70%" />
        {hasSubtitle && <GlassSkeleton variant="text" width="50%" height={12} />}
      </View>
      <GlassSkeleton variant="icon" />
    </View>
  );
}

export interface SkeletonStatCardProps {
  style?: ViewStyle;
}

export function SkeletonStatCard({ style }: SkeletonStatCardProps) {
  return (
    <View style={[styles.skeletonStatCard, style]}>
      <GlassSkeleton variant="icon" width={36} height={36} borderRadius={18} />
      <GlassSkeleton variant="title" width={40} height={32} />
      <GlassSkeleton variant="text" width={60} height={12} />
    </View>
  );
}

export interface SkeletonPantryItemProps {
  style?: ViewStyle;
}

export function SkeletonPantryItem({ style }: SkeletonPantryItemProps) {
  return (
    <View style={[styles.skeletonPantryItem, style]}>
      <View style={styles.skeletonPantryTop}>
        <GlassSkeleton variant="avatar" width={48} height={48} borderRadius={24} />
        <View style={styles.skeletonPantryBadges}>
          <GlassSkeleton variant="icon" width={50} height={20} borderRadius={10} />
          <GlassSkeleton variant="icon" width={35} height={20} borderRadius={10} />
        </View>
      </View>
      <GlassSkeleton variant="text" width="80%" height={18} />
      <GlassSkeleton variant="text" width="50%" height={14} />
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass.backgroundStrong,
    overflow: "hidden",
  },
  shimmerWrapper: {
    ...StyleSheet.absoluteFillObject,
    width: 200,
  },
  shimmerGradient: {
    flex: 1,
  },

  // Skeleton Card
  skeletonCard: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  skeletonCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  skeletonCardContent: {
    flex: 1,
    gap: spacing.xs,
  },

  // Skeleton List Item
  skeletonListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  skeletonListContent: {
    flex: 1,
    gap: spacing.xs,
  },

  // Skeleton Stat Card
  skeletonStatCard: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glass.border,
    width: "48%",
    flexGrow: 1,
  },

  // Skeleton Pantry Item
  skeletonPantryItem: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  skeletonPantryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  skeletonPantryBadges: {
    flexDirection: "row",
    gap: spacing.xs,
  },
});
