/**
 * SizeOptionCard - Individual size option card for size/price modal
 *
 * A larger card format (vs compact chips) for bottom sheet modals.
 * Displays:
 * - Size (e.g., "2pt", "500ml")
 * - Price
 * - Price per unit for comparison
 * - "Your usual" badge (star) for user's typical purchase
 * - "Best value" badge for lowest price-per-unit option
 * - Price source indicator (personal, crowdsourced, AI)
 *
 * Features:
 * - Glassmorphic styling
 * - Animated selection with spring physics
 * - Haptic feedback on interaction
 * - Skeleton loading state
 * - Full accessibility support
 */

import React, { useCallback, memo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  AccessibilityInfo,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  interpolate,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { haptic } from "@/lib/haptics/safeHaptics";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
  shadows,
} from "@/lib/design/glassTokens";

// =============================================================================
// TYPES
// =============================================================================

export type PriceSource = "personal" | "crowdsourced" | "ai";

export interface SizeOptionCardProps {
  /** Display size (e.g., "2pt", "500ml") */
  size: string;
  /** Price in pounds, null if unknown */
  price: number | null;
  /** Calculated price per unit, null if cannot compute */
  pricePerUnit: number | null;
  /** Unit label for price-per-unit display (e.g., "/pt", "/100ml") */
  unitLabel: string;
  /** Source of the price data */
  priceSource: PriceSource;
  /** Confidence score for AI estimates (0-1) */
  confidence: number;
  /** Whether this is the user's typical purchase */
  isUsual: boolean;
  /** Whether this option has the best value (lowest price-per-unit) */
  isBestValue: boolean;
  /** Whether this option is currently selected */
  isSelected: boolean;
  /** Callback when the card is pressed */
  onSelect: () => void;
  /** Whether the card is disabled */
  disabled?: boolean;
}

export interface SizeOptionCardSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CARD_MIN_WIDTH = 100;
const CARD_HEIGHT = 88;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format price for display
 */
function formatPrice(price: number | null): string {
  if (price === null) return "--";
  return `£${price.toFixed(2)}`;
}

/**
 * Format price per unit for display
 */
function formatPricePerUnit(pricePerUnit: number | null, unitLabel: string): string {
  if (pricePerUnit === null) return "--";
  return `£${pricePerUnit.toFixed(2)}${unitLabel}`;
}

/**
 * Get icon name for price source
 */
function getPriceSourceIcon(source: PriceSource): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (source) {
    case "personal":
      return "receipt";
    case "crowdsourced":
      return "account-group";
    case "ai":
      return "auto-fix";
  }
}

/**
 * Get accessibility label for price source
 */
function getPriceSourceLabel(source: PriceSource): string {
  switch (source) {
    case "personal":
      return "from your receipts";
    case "crowdsourced":
      return "from community data";
    case "ai":
      return "AI estimated";
  }
}

/**
 * Get color for price source indicator
 */
function getPriceSourceColor(source: PriceSource): string {
  switch (source) {
    case "personal":
      return colors.accent.primary;
    case "crowdsourced":
      return colors.accent.secondary;
    case "ai":
      return colors.text.tertiary;
  }
}

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

function SizeOptionCardSkeletonItem() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withTiming(1, { duration: 1000 });
    const interval = setInterval(() => {
      shimmer.value = 0;
      shimmer.value = withTiming(1, { duration: 1000 });
    }, 1500);
    return () => clearInterval(interval);
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }));

  return (
    <Animated.View
      style={[styles.skeletonCard, shimmerStyle]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.skeletonSize} />
      <View style={styles.skeletonPrice} />
      <View style={styles.skeletonPricePerUnit} />
    </Animated.View>
  );
}

export function SizeOptionCardSkeleton({ count = 3 }: SizeOptionCardSkeletonProps) {
  return (
    <View
      style={styles.skeletonContainer}
      accessible
      accessibilityLabel="Loading size options"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: count }).map((_, index) => (
        <SizeOptionCardSkeletonItem key={index} />
      ))}
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const SizeOptionCard = memo(function SizeOptionCard({
  size,
  price,
  pricePerUnit,
  unitLabel,
  priceSource,
  confidence,
  isUsual,
  isBestValue,
  isSelected,
  onSelect,
  disabled = false,
}: SizeOptionCardProps) {
  // Animation values
  const scale = useSharedValue(1);
  const selected = useSharedValue(isSelected ? 1 : 0);
  const checkmarkScale = useSharedValue(isSelected ? 1 : 0);

  // Update animations when selection changes
  useEffect(() => {
    selected.value = withSpring(isSelected ? 1 : 0, animations.spring.gentle);
    checkmarkScale.value = withSpring(
      isSelected ? 1 : 0,
      animations.spring.bouncy
    );
  }, [isSelected, selected, checkmarkScale]);

  // Animated styles for the card container
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(
      selected.value,
      [0, 1],
      [colors.glass.border, colors.accent.primary]
    ),
    backgroundColor: interpolateColor(
      selected.value,
      [0, 1],
      [colors.glass.background, "rgba(0, 212, 170, 0.15)"]
    ),
  }));

  // Animated styles for the checkmark
  const animatedCheckmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkScale.value,
  }));

  // Press handlers
  const handlePressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(animations.pressScale, animations.spring.stiff);
  }, [disabled, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animations.spring.gentle);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    haptic("selection");
    onSelect();
  }, [disabled, onSelect]);

  // Build accessibility label
  const accessibilityLabel = [
    size,
    formatPrice(price),
    pricePerUnit !== null ? formatPricePerUnit(pricePerUnit, unitLabel) : null,
    isUsual ? "your usual" : null,
    isBestValue ? "best value" : null,
    price !== null ? getPriceSourceLabel(priceSource) : null,
    isSelected ? "selected" : null,
  ]
    .filter(Boolean)
    .join(", ");

  // Determine if we should show low confidence warning
  const showLowConfidence = priceSource === "ai" && confidence < 0.6;

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        animatedCardStyle,
        disabled && styles.cardDisabled,
      ]}
    >
      <Pressable
        style={styles.card}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="radio"
        accessibilityState={{
          selected: isSelected,
          disabled,
        }}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to select this size option"
      >
        {/* Badges Row (top-right corner) - hidden from screen readers as info is in the main label */}
        <View style={styles.badgesRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {/* Your Usual Badge */}
          {isUsual && (
            <View style={styles.usualBadge}>
              <MaterialCommunityIcons
                name="star"
                size={12}
                color={colors.accent.warm}
              />
            </View>
          )}

          {/* Best Value Badge */}
          {isBestValue && !isUsual && (
            <View style={styles.bestValueBadge}>
              <MaterialCommunityIcons
                name="tag-check"
                size={12}
                color={colors.accent.success}
              />
            </View>
          )}
        </View>

        {/* Size */}
        <Text
          style={[
            styles.sizeText,
            isSelected && styles.sizeTextSelected,
            disabled && styles.textDisabled,
          ]}
          numberOfLines={1}
        >
          {size}
        </Text>

        {/* Price */}
        <Text
          style={[
            styles.priceText,
            isSelected && styles.priceTextSelected,
            price === null && styles.priceTextMissing,
            disabled && styles.textDisabled,
          ]}
          numberOfLines={1}
        >
          {formatPrice(price)}
        </Text>

        {/* Price Per Unit Row */}
        <View style={styles.pricePerUnitRow}>
          <Text
            style={[
              styles.pricePerUnitText,
              isBestValue && styles.pricePerUnitBestValue,
              disabled && styles.textDisabled,
            ]}
            numberOfLines={1}
          >
            {formatPricePerUnit(pricePerUnit, unitLabel)}
          </Text>

          {/* Best Value Star (inline) */}
          {isBestValue && pricePerUnit !== null && (
            <MaterialCommunityIcons
              name="star"
              size={10}
              color={colors.accent.success}
              style={styles.bestValueStar}
            />
          )}
        </View>

        {/* Price Source Indicator (bottom-left) - hidden from screen readers as info is in the main label */}
        {price !== null && (
          <View style={styles.priceSourceContainer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <MaterialCommunityIcons
              name={getPriceSourceIcon(priceSource)}
              size={10}
              color={getPriceSourceColor(priceSource)}
            />
            {showLowConfidence && (
              <Text style={styles.confidenceText}>~</Text>
            )}
          </View>
        )}

        {/* Selection Checkmark (bottom-center) - hidden as selection state is in accessibilityState */}
        <Animated.View style={[styles.checkmarkContainer, animatedCheckmarkStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.checkmarkCircle}>
            <MaterialCommunityIcons
              name="check"
              size={12}
              color={colors.text.inverse}
            />
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Card Container
  cardContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    overflow: "hidden",
    minWidth: CARD_MIN_WIDTH,
    ...shadows.sm,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  card: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
    minHeight: CARD_HEIGHT,
    position: "relative",
  },

  // Badges Row
  badgesRow: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: "row",
    gap: spacing.xs,
  },
  usualBadge: {
    backgroundColor: "rgba(255, 176, 136, 0.2)",
    borderRadius: borderRadius.full,
    padding: 3,
  },
  bestValueBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: borderRadius.full,
    padding: 3,
  },

  // Size Text
  sizeText: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: "700",
    textAlign: "center",
  },
  sizeTextSelected: {
    color: colors.accent.primary,
  },

  // Price Text
  priceText: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  priceTextSelected: {
    color: colors.accent.primaryLight,
  },
  priceTextMissing: {
    color: colors.text.disabled,
    fontStyle: "italic",
  },

  // Price Per Unit Row
  pricePerUnitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    gap: 2,
  },
  pricePerUnitText: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: "center",
  },
  pricePerUnitBestValue: {
    color: colors.accent.success,
    fontWeight: "600",
  },
  bestValueStar: {
    marginLeft: 2,
  },

  // Price Source Indicator
  priceSourceContainer: {
    position: "absolute",
    bottom: spacing.xs,
    left: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    opacity: 0.7,
  },
  confidenceText: {
    ...typography.bodySmall,
    fontSize: 10,
    color: colors.text.tertiary,
  },

  // Checkmark
  checkmarkContainer: {
    position: "absolute",
    bottom: spacing.xs,
    alignSelf: "center",
  },
  checkmarkCircle: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Disabled state
  textDisabled: {
    color: colors.text.disabled,
  },

  // Skeleton styles
  skeletonContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  skeletonCard: {
    minWidth: CARD_MIN_WIDTH,
    minHeight: CARD_HEIGHT,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  skeletonSize: {
    width: 48,
    height: 18,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  skeletonPrice: {
    width: 40,
    height: 14,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  skeletonPricePerUnit: {
    width: 52,
    height: 10,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default SizeOptionCard;
