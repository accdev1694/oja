/**
 * StorePriceGrid - Grid layout for comparing prices across stores and sizes
 *
 * Displays a table/grid showing:
 * - Rows: Stores (with brand colors)
 * - Columns: Size variants
 * - Cells: Prices (with cheapest per size highlighted)
 * - Best value indicator (lowest price-per-unit)
 *
 * Features:
 * - Glassmorphic styling
 * - Store brand colors on row headers
 * - Highlights cheapest price per size column
 * - Shows "best value" badge for lowest price-per-unit
 * - Accessible with proper labels
 * - Haptic feedback on selection
 */

import React, { memo, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { haptic } from "@/lib/haptics/safeHaptics";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
  glassCardStyles,
} from "@/lib/design/glassTokens";
import {
  getStoreInfoSafe,
  getAllStores,
  type StoreInfo,
} from "@/convex/lib/storeNormalizer";

// =============================================================================
// TYPES
// =============================================================================

export interface StorePriceGridProps {
  /** Item name for display and accessibility */
  itemName: string;
  /** Available size variants */
  variants: { size: string; unit: string }[];
  /** Price data: storeId -> size -> price (null if unavailable) */
  priceData: Record<string, Record<string, number | null>>;
  /** Callback when a store row is selected */
  onStoreSelect?: (storeId: string) => void;
  /** Callback when a variant column is selected */
  onVariantSelect?: (size: string) => void;
  /** Currently selected store ID */
  selectedStore?: string;
  /** Currently selected size */
  selectedSize?: string;
  /** Whether to show price-per-unit calculations */
  showPricePerUnit?: boolean;
  /** Compact mode - smaller cells */
  compact?: boolean;
}

interface PriceAnalysis {
  /** Cheapest price per size column */
  cheapestPerSize: Record<string, { storeId: string; price: number }>;
  /** Best value overall (lowest price per unit) */
  bestValue: {
    storeId: string;
    size: string;
    pricePerUnit: number;
  } | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price for display
 */
function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return `£${price.toFixed(2)}`;
}

/**
 * Parse numeric value from size string (e.g., "2pt" -> 2, "500ml" -> 500)
 */
function parseNumericSize(size: string): number | null {
  const match = size.match(/^(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Calculate price per unit
 */
function calculatePricePerUnit(
  price: number,
  size: string
): number | null {
  const numericSize = parseNumericSize(size);
  if (!numericSize || numericSize <= 0) return null;
  return price / numericSize;
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
    each: "ea",
    pack: "pk",
    packs: "pk",
  };

  const lowerUnit = unit.toLowerCase();
  return abbreviations[lowerUnit] || unit.slice(0, 2);
}

/**
 * Analyze prices to find cheapest per size and best value overall
 */
function analyzePrices(
  priceData: Record<string, Record<string, number | null>>,
  variants: { size: string; unit: string }[]
): PriceAnalysis {
  const cheapestPerSize: Record<string, { storeId: string; price: number }> = {};
  let bestValue: PriceAnalysis["bestValue"] = null;

  // Find cheapest per size
  for (const variant of variants) {
    const { size } = variant;
    let cheapest: { storeId: string; price: number } | null = null;

    for (const [storeId, storePrices] of Object.entries(priceData)) {
      const price = storePrices[size];
      if (price !== null && price !== undefined) {
        if (!cheapest || price < cheapest.price) {
          cheapest = { storeId, price };
        }
      }
    }

    if (cheapest) {
      cheapestPerSize[size] = cheapest;
    }
  }

  // Find best value (lowest price per unit)
  for (const [storeId, storePrices] of Object.entries(priceData)) {
    for (const variant of variants) {
      const { size } = variant;
      const price = storePrices[size];
      if (price !== null && price !== undefined) {
        const pricePerUnit = calculatePricePerUnit(price, size);
        if (pricePerUnit !== null) {
          if (!bestValue || pricePerUnit < bestValue.pricePerUnit) {
            bestValue = { storeId, size, pricePerUnit };
          }
        }
      }
    }
  }

  return { cheapestPerSize, bestValue };
}

/**
 * Create transparent version of a color
 */
function getTransparentColor(hexColor: string, opacity: number): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Store row header with brand color
 */
const StoreRowHeader = memo(function StoreRowHeader({
  storeInfo,
  isSelected,
  onPress,
  compact,
}: {
  storeInfo: StoreInfo;
  isSelected: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    scale.value = withSpring(0.98, animations.spring.stiff);
  }, [onPress, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animations.spring.gentle);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (!onPress) return;
    haptic("selection");
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.storeHeader,
          compact && styles.storeHeaderCompact,
          isSelected && styles.storeHeaderSelected,
          { borderLeftColor: storeInfo.color },
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`${storeInfo.displayName}${isSelected ? ", selected" : ""}`}
        accessibilityState={{ selected: isSelected }}
      >
        <View
          style={[
            styles.storeColorDot,
            { backgroundColor: storeInfo.color },
          ]}
        />
        <Text
          style={[
            styles.storeName,
            compact && styles.storeNameCompact,
            isSelected && styles.storeNameSelected,
          ]}
          numberOfLines={1}
        >
          {storeInfo.displayName}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

/**
 * Price cell in the grid
 */
const PriceCell = memo(function PriceCell({
  price,
  isCheapest,
  isBestValue,
  isSelected,
  onPress,
  compact,
}: {
  price: number | null;
  isCheapest: boolean;
  isBestValue: boolean;
  isSelected: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    scale.value = withSpring(0.95, animations.spring.stiff);
  }, [onPress, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animations.spring.gentle);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (!onPress) return;
    haptic("light");
    onPress();
  }, [onPress]);

  const isEmpty = price === null;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.priceCell,
          compact && styles.priceCellCompact,
          isCheapest && styles.priceCellCheapest,
          isBestValue && styles.priceCellBestValue,
          isSelected && styles.priceCellSelected,
          isEmpty && styles.priceCellEmpty,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress || isEmpty}
        accessibilityRole="button"
        accessibilityLabel={`${formatPrice(price)}${isCheapest ? ", cheapest" : ""}${isBestValue ? ", best value" : ""}`}
      >
        <Text
          style={[
            styles.priceText,
            compact && styles.priceTextCompact,
            isCheapest && styles.priceTextCheapest,
            isBestValue && styles.priceTextBestValue,
            isEmpty && styles.priceTextEmpty,
          ]}
        >
          {formatPrice(price)}
        </Text>

        {/* Best Value Badge */}
        {isBestValue && !compact && (
          <View style={styles.bestValueBadge}>
            <MaterialCommunityIcons
              name="trophy"
              size={10}
              color={colors.accent.warm}
            />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

/**
 * Size column header
 */
const SizeColumnHeader = memo(function SizeColumnHeader({
  size,
  unit,
  isSelected,
  onPress,
  compact,
}: {
  size: string;
  unit: string;
  isSelected: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  const handlePress = useCallback(() => {
    if (!onPress) return;
    haptic("selection");
    onPress();
  }, [onPress]);

  const unitAbbrev = getUnitAbbreviation(unit);
  const displaySize = size.includes(unitAbbrev) ? size : `${size}${unitAbbrev}`;

  return (
    <Pressable
      style={[
        styles.sizeHeader,
        compact && styles.sizeHeaderCompact,
        isSelected && styles.sizeHeaderSelected,
      ]}
      onPress={handlePress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${displaySize}${isSelected ? ", selected" : ""}`}
      accessibilityState={{ selected: isSelected }}
    >
      <Text
        style={[
          styles.sizeText,
          compact && styles.sizeTextCompact,
          isSelected && styles.sizeTextSelected,
        ]}
      >
        {displaySize}
      </Text>
    </Pressable>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const StorePriceGrid = memo(function StorePriceGrid({
  itemName,
  variants,
  priceData,
  onStoreSelect,
  onVariantSelect,
  selectedStore,
  selectedSize,
  showPricePerUnit = true,
  compact = false,
}: StorePriceGridProps) {
  // Get stores that have price data
  const storesWithPrices = useMemo(() => {
    const storeIds = Object.keys(priceData);
    return storeIds
      .map((id) => getStoreInfoSafe(id))
      .filter((info): info is StoreInfo => info !== null)
      .sort((a, b) => b.marketShare - a.marketShare); // Sort by market share
  }, [priceData]);

  // Analyze prices for highlights
  const analysis = useMemo(
    () => analyzePrices(priceData, variants),
    [priceData, variants]
  );

  // Empty state
  if (storesWithPrices.length === 0 || variants.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="store-outline"
          size={32}
          color={colors.text.tertiary}
        />
        <Text style={styles.emptyText}>
          No store price data available for {itemName}
        </Text>
        <Text style={styles.emptySubtext}>
          Scan receipts to build price comparisons
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with item name */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, compact && styles.headerTitleCompact]}>
          {itemName}
        </Text>
        {showPricePerUnit && analysis.bestValue && (
          <View style={styles.bestValueIndicator}>
            <MaterialCommunityIcons
              name="trophy"
              size={14}
              color={colors.accent.warm}
            />
            <Text style={styles.bestValueLabel}>Best value</Text>
          </View>
        )}
      </View>

      {/* Scrollable grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.grid, compact && styles.gridCompact]}>
          {/* Header row with size columns */}
          <View style={styles.headerRow}>
            {/* Empty corner cell */}
            <View style={[styles.cornerCell, compact && styles.cornerCellCompact]} />

            {/* Size column headers */}
            {variants.map((variant) => (
              <SizeColumnHeader
                key={variant.size}
                size={variant.size}
                unit={variant.unit}
                isSelected={selectedSize === variant.size}
                onPress={onVariantSelect ? () => onVariantSelect(variant.size) : undefined}
                compact={compact}
              />
            ))}
          </View>

          {/* Store rows */}
          {storesWithPrices.map((store) => {
            const storePrices = priceData[store.id] || {};
            const isStoreSelected = selectedStore === store.id;

            return (
              <View
                key={store.id}
                style={[
                  styles.storeRow,
                  isStoreSelected && styles.storeRowSelected,
                ]}
              >
                {/* Store header */}
                <StoreRowHeader
                  storeInfo={store}
                  isSelected={isStoreSelected}
                  onPress={onStoreSelect ? () => onStoreSelect(store.id) : undefined}
                  compact={compact}
                />

                {/* Price cells */}
                {variants.map((variant) => {
                  const price = storePrices[variant.size] ?? null;
                  const cheapestInfo = analysis.cheapestPerSize[variant.size];
                  const isCheapest = cheapestInfo?.storeId === store.id && price !== null;
                  const isBestValue =
                    analysis.bestValue?.storeId === store.id &&
                    analysis.bestValue?.size === variant.size;
                  const isSelected =
                    isStoreSelected && selectedSize === variant.size;

                  return (
                    <PriceCell
                      key={`${store.id}-${variant.size}`}
                      price={price}
                      isCheapest={isCheapest}
                      isBestValue={isBestValue}
                      isSelected={isSelected}
                      onPress={
                        onStoreSelect && onVariantSelect
                          ? () => {
                              onStoreSelect(store.id);
                              onVariantSelect(variant.size);
                            }
                          : undefined
                      }
                      compact={compact}
                    />
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotCheapest]} />
          <Text style={styles.legendText}>Cheapest per size</Text>
        </View>
        {showPricePerUnit && (
          <View style={styles.legendItem}>
            <MaterialCommunityIcons
              name="trophy"
              size={12}
              color={colors.accent.warm}
            />
            <Text style={styles.legendText}>Best value</Text>
          </View>
        )}
      </View>
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    ...glassCardStyles.standard,
    padding: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  headerTitleCompact: {
    ...typography.labelLarge,
  },
  bestValueIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: getTransparentColor(colors.accent.warm, 0.15),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  bestValueLabel: {
    ...typography.bodySmall,
    color: colors.accent.warm,
    fontWeight: "600",
  },
  scrollContent: {
    paddingRight: spacing.md,
  },
  grid: {
    gap: spacing.xs,
  },
  gridCompact: {
    gap: 2,
  },
  headerRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cornerCell: {
    width: 100,
    height: 36,
  },
  cornerCellCompact: {
    width: 80,
    height: 28,
  },
  sizeHeader: {
    width: 72,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  sizeHeaderCompact: {
    width: 56,
    height: 28,
  },
  sizeHeaderSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: getTransparentColor(colors.accent.primary, 0.15),
  },
  sizeText: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },
  sizeTextCompact: {
    ...typography.labelSmall,
    fontSize: 11,
  },
  sizeTextSelected: {
    color: colors.accent.primary,
  },
  storeRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  storeRowSelected: {
    // Applied to row container when store is selected
  },
  storeHeader: {
    width: 100,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderLeftWidth: 3,
  },
  storeHeaderCompact: {
    width: 80,
    height: 32,
    paddingHorizontal: spacing.xs,
  },
  storeHeaderSelected: {
    backgroundColor: colors.glass.backgroundHover,
    borderColor: colors.glass.borderFocus,
  },
  storeColorDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  storeName: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: "500",
    flex: 1,
  },
  storeNameCompact: {
    fontSize: 11,
  },
  storeNameSelected: {
    fontWeight: "600",
  },
  priceCell: {
    width: 72,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
    position: "relative",
  },
  priceCellCompact: {
    width: 56,
    height: 32,
  },
  priceCellCheapest: {
    backgroundColor: getTransparentColor(colors.accent.success, 0.15),
    borderColor: colors.accent.success,
  },
  priceCellBestValue: {
    backgroundColor: getTransparentColor(colors.accent.warm, 0.2),
    borderColor: colors.accent.warm,
    borderWidth: 2,
  },
  priceCellSelected: {
    borderColor: colors.accent.primary,
    borderWidth: 2,
  },
  priceCellEmpty: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderColor: "transparent",
  },
  priceText: {
    ...typography.labelMedium,
    color: colors.text.primary,
  },
  priceTextCompact: {
    ...typography.labelSmall,
    fontSize: 11,
  },
  priceTextCheapest: {
    color: colors.accent.success,
    fontWeight: "700",
  },
  priceTextBestValue: {
    color: colors.accent.warm,
    fontWeight: "700",
  },
  priceTextEmpty: {
    color: colors.text.disabled,
    fontStyle: "italic",
  },
  bestValueBadge: {
    position: "absolute",
    top: 2,
    right: 2,
  },
  legend: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
    borderWidth: 2,
  },
  legendDotCheapest: {
    backgroundColor: getTransparentColor(colors.accent.success, 0.3),
    borderColor: colors.accent.success,
  },
  legendText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    ...glassCardStyles.standard,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default StorePriceGrid;
