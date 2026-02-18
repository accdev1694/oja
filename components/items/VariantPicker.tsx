/**
 * VariantPicker - Horizontal scrollable size picker for grocery items
 *
 * Displays available sizes (variants) for items like milk, butter, etc.
 * Each variant shows:
 * - Size (e.g., "2pt", "500ml", "250g")
 * - Price
 * - Price per unit for comparison
 * - "Your usual" badge if applicable
 *
 * Features:
 * - Glassmorphic styling
 * - Animated selection with haptics
 * - Skeleton loading state
 * - Empty state handling
 */

import React, { useCallback, memo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { haptic } from "@/lib/haptics/safeHaptics";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
} from "@/lib/design/glassTokens";

// =============================================================================
// TYPES
// =============================================================================

export interface VariantOption {
  /** Unique identifier for this variant (e.g., "whole-milk-2pt") */
  variantName: string;
  /** Display size (e.g., "2pt", "500ml", "250g") */
  size: string;
  /** Unit type for price-per-unit calculation */
  unit: string;
  /** Price in pounds, null if unknown */
  price: number | null;
  /** Source of the price data */
  priceSource: "personal" | "crowdsourced" | "ai_estimate";
  /** Whether this is the user's typical purchase */
  isUsual?: boolean;
  /** Short label from scan enrichment (e.g., "Tesco 6pk") */
  displayLabel?: string;
}

export interface VariantPickerProps {
  /** Base item name (e.g., "milk", "butter") - used for aria labels */
  baseItem: string;
  /** Available variant options */
  variants: VariantOption[];
  /** Currently selected variant name */
  selectedVariant?: string;
  /** Callback when a variant is selected */
  onSelect: (variantName: string) => void;
  /** Whether to show price per unit below price */
  showPricePerUnit?: boolean;
  /** Loading state - shows skeleton */
  isLoading?: boolean;
  /** Compact mode - smaller chips */
  compact?: boolean;
}

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
 * Calculate and format price per unit
 */
function calculatePricePerUnit(
  price: number | null,
  size: string,
  unit: string
): string | null {
  if (price === null) return null;

  // Parse numeric size from string (e.g., "2pt" -> 2, "500ml" -> 500)
  const numericMatch = size.match(/^(\d+(?:\.\d+)?)/);
  if (!numericMatch) return null;

  const numericSize = parseFloat(numericMatch[1]);
  if (numericSize <= 0) return null;

  const pricePerUnit = price / numericSize;

  // Format based on unit type
  const unitAbbrev = getUnitAbbreviation(unit);
  return `£${pricePerUnit.toFixed(2)}/${unitAbbrev}`;
}

/**
 * Get abbreviated unit for display
 */
function getUnitAbbreviation(unit: string): string {
  const abbreviations: Record<string, string> = {
    pint: "pt",
    pints: "pt",
    litre: "L",
    liter: "L",
    litres: "L",
    liters: "L",
    millilitre: "ml",
    milliliter: "ml",
    millilitres: "ml",
    milliliters: "ml",
    gram: "g",
    grams: "g",
    kilogram: "kg",
    kilograms: "kg",
    ounce: "oz",
    ounces: "oz",
    pound: "lb",
    pounds: "lb",
    each: "ea",
    pack: "pk",
    packs: "pk",
  };

  const lowerUnit = unit.toLowerCase();
  return abbreviations[lowerUnit] || unit.slice(0, 2);
}

/**
 * Get icon for price source
 */
function getPriceSourceIcon(
  source: VariantOption["priceSource"]
): "receipt" | "crowd-circle" | "robot" {
  switch (source) {
    case "personal":
      return "receipt";
    case "crowdsourced":
      return "crowd-circle" as "receipt"; // Fallback - this icon doesn't exist
    case "ai_estimate":
      return "robot";
  }
}

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

function VariantSkeleton({ compact }: { compact?: boolean }) {
  const height = compact ? 52 : 68;
  const width = compact ? 80 : 100;

  return (
    <View style={[styles.skeletonChip, { height, width }]}>
      <View style={styles.skeletonSize} />
      <View style={styles.skeletonPrice} />
    </View>
  );
}

// =============================================================================
// VARIANT CHIP COMPONENT
// =============================================================================

interface VariantChipProps {
  variant: VariantOption;
  isSelected: boolean;
  showPricePerUnit: boolean;
  compact: boolean;
  onPress: () => void;
}

const VariantChip = memo(function VariantChip({
  variant,
  isSelected,
  showPricePerUnit,
  compact,
  onPress,
}: VariantChipProps) {
  const scale = useSharedValue(1);
  const selected = useSharedValue(isSelected ? 1 : 0);

  // Update selected value when prop changes
  React.useEffect(() => {
    selected.value = withSpring(isSelected ? 1 : 0, animations.spring.gentle);
  }, [isSelected, selected]);

  const animatedStyle = useAnimatedStyle(() => ({
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

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(animations.pressScale, animations.spring.stiff);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animations.spring.gentle);
  }, [scale]);

  const handlePress = useCallback(() => {
    haptic("selection");
    onPress();
  }, [onPress]);

  const pricePerUnit = showPricePerUnit
    ? calculatePricePerUnit(variant.price, variant.size, variant.unit)
    : null;

  return (
    <Animated.View style={[styles.chipContainer, animatedStyle]}>
      <Pressable
        style={[styles.chip, compact && styles.chipCompact]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${variant.size} for ${formatPrice(variant.price)}${variant.isUsual ? ", your usual" : ""}`}
      >
        {/* Your Usual Badge */}
        {variant.isUsual && (
          <View style={styles.usualBadge}>
            <MaterialCommunityIcons
              name="star"
              size={10}
              color={colors.accent.warm}
            />
          </View>
        )}

        {/* Size */}
        <Text
          style={[
            styles.sizeText,
            compact && styles.sizeTextCompact,
            isSelected && styles.sizeTextSelected,
          ]}
        >
          {variant.displayLabel || variant.size}
        </Text>

        {/* Price */}
        <Text
          style={[
            styles.priceText,
            compact && styles.priceTextCompact,
            isSelected && styles.priceTextSelected,
            variant.price === null && styles.priceTextMissing,
          ]}
        >
          {formatPrice(variant.price)}
        </Text>

        {/* Price Per Unit */}
        {pricePerUnit && !compact && (
          <Text style={styles.pricePerUnitText}>{pricePerUnit}</Text>
        )}

        {/* Price Source Indicator (subtle) */}
        {variant.priceSource === "ai_estimate" && variant.price !== null && (
          <View style={styles.aiIndicator}>
            <MaterialCommunityIcons
              name="auto-fix"
              size={10}
              color={colors.text.tertiary}
            />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VariantPicker({
  baseItem,
  variants,
  selectedVariant,
  onSelect,
  showPricePerUnit = true,
  isLoading = false,
  compact = false,
}: VariantPickerProps) {
  // Handle loading state
  if (isLoading) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        style={styles.scroll}
        keyboardShouldPersistTaps="always"
      >
        {[1, 2, 3].map((i) => (
          <VariantSkeleton key={i} compact={compact} />
        ))}
      </ScrollView>
    );
  }

  // Handle empty state
  if (!variants || variants.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No size options available</Text>
      </View>
    );
  }

  // Sort variants: "Your usual" first, then by size numerically
  const sortedVariants = [...variants].sort((a, b) => {
    // "Your usual" always first
    if (a.isUsual && !b.isUsual) return -1;
    if (!a.isUsual && b.isUsual) return 1;

    // Then sort by numeric size
    const aNum = parseFloat(a.size.match(/^(\d+(?:\.\d+)?)/)?.[1] || "0");
    const bNum = parseFloat(b.size.match(/^(\d+(?:\.\d+)?)/)?.[1] || "0");
    return aNum - bNum;
  });

  return (
    <View style={styles.wrapper}>
      {/* Optional label */}
      {!compact && (
        <Text style={styles.label}>
          Select size for {baseItem}
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        style={styles.scroll}
        keyboardShouldPersistTaps="always"
        accessibilityRole="radiogroup"
        accessibilityLabel={`Size options for ${baseItem}`}
      >
        {sortedVariants.map((variant, index) => (
          <VariantChip
            key={`${variant.variantName}-${index}`}
            variant={variant}
            isSelected={selectedVariant === variant.variantName}
            showPricePerUnit={showPricePerUnit}
            compact={compact}
            onPress={() => onSelect(variant.variantName)}
          />
        ))}
      </ScrollView>

      {/* Legend for first-time users */}
      {sortedVariants.some((v) => v.isUsual) && !compact && (
        <View style={styles.legend}>
          <MaterialCommunityIcons
            name="star"
            size={12}
            color={colors.accent.warm}
          />
          <Text style={styles.legendText}>Your usual</Text>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  scroll: {
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  label: {
    ...typography.labelSmall,
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  chipContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
    position: "relative",
  },
  chipCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 64,
  },
  sizeText: {
    ...typography.labelMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  sizeTextCompact: {
    fontSize: 13,
  },
  sizeTextSelected: {
    color: colors.accent.primary,
  },
  priceText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: 2,
  },
  priceTextCompact: {
    fontSize: 11,
  },
  priceTextSelected: {
    color: colors.accent.primaryLight,
  },
  priceTextMissing: {
    color: colors.text.disabled,
    fontStyle: "italic",
  },
  pricePerUnitText: {
    ...typography.bodySmall,
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  usualBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255, 176, 136, 0.2)",
    borderRadius: borderRadius.full,
    padding: 2,
  },
  aiIndicator: {
    position: "absolute",
    bottom: 4,
    right: 4,
    opacity: 0.6,
  },
  emptyContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontStyle: "italic",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  legendText: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.text.tertiary,
  },
  // Skeleton styles
  skeletonChip: {
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  skeletonSize: {
    width: 40,
    height: 14,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  skeletonPrice: {
    width: 32,
    height: 10,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default VariantPicker;
