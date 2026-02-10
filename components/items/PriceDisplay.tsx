/**
 * PriceDisplay - Shows price with optional price-per-unit calculation
 *
 * Features:
 * - Main price display with currency
 * - Price-per-unit calculation for value comparison
 * - Handles unit normalization (ml -> 100ml, g -> 100g)
 * - AI estimate indicator
 * - Compact and full display modes
 * - Glassmorphic styling
 */

import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  colors,
  typography,
  spacing,
} from "@/lib/design/glassTokens";

// =============================================================================
// TYPES
// =============================================================================

export interface PriceDisplayProps {
  /** Price in pounds, null if unknown */
  price: number | null;
  /** Numeric size value (e.g., "2", "500", "4") */
  size?: string;
  /** Unit type (e.g., "pint", "ml", "pack") */
  unit?: string;
  /** Whether to show price-per-unit calculation (default: true) */
  showPerUnit?: boolean;
  /** Source of the price data */
  priceSource?: "personal" | "crowdsourced" | "ai_estimate";
  /** Compact mode - smaller text, inline display */
  compact?: boolean;
  /** Text alignment */
  align?: "left" | "center" | "right";
}

export interface PricePerUnitResult {
  /** Calculated price per unit */
  value: number;
  /** Display label (e.g., "£0.58/pt", "£0.23/100ml") */
  label: string;
}

// =============================================================================
// UNIT ABBREVIATIONS
// =============================================================================

const UNIT_ABBREVIATIONS: Record<string, string> = {
  // Volume
  pint: "pt",
  pints: "pt",
  litre: "L",
  liter: "L",
  litres: "L",
  liters: "L",
  l: "L",
  millilitre: "ml",
  milliliter: "ml",
  millilitres: "ml",
  milliliters: "ml",
  ml: "ml",
  // Weight
  gram: "g",
  grams: "g",
  g: "g",
  kilogram: "kg",
  kilograms: "kg",
  kg: "kg",
  ounce: "oz",
  ounces: "oz",
  oz: "oz",
  pound: "lb",
  pounds: "lb",
  lb: "lb",
  // Count
  each: "ea",
  pack: "pk",
  packs: "pk",
};

// Units that should be normalized to per-100 for easier comparison
const NORMALIZE_TO_100: Set<string> = new Set(["ml", "g"]);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get abbreviated unit for display
 */
function getUnitAbbreviation(unit: string): string {
  const lowerUnit = unit.toLowerCase().trim();
  return UNIT_ABBREVIATIONS[lowerUnit] || unit.slice(0, 2).toLowerCase();
}

/**
 * Format price for display
 */
export function formatPrice(price: number | null): string {
  if (price === null) return "--";
  return `£${price.toFixed(2)}`;
}

/**
 * Calculate price per unit with intelligent normalization
 *
 * For small units (ml, g), normalizes to per-100 for easier comparison.
 * For larger units (pint, L, kg, each), shows per-single-unit.
 */
export function calculatePricePerUnit(
  price: number,
  size: string,
  unit: string
): PricePerUnitResult | null {
  // Parse numeric size from string
  const numericSize = parseFloat(size);
  if (isNaN(numericSize) || numericSize <= 0) return null;

  const unitAbbrev = getUnitAbbreviation(unit);

  // Determine if we should normalize to per-100 units
  if (NORMALIZE_TO_100.has(unitAbbrev)) {
    // For ml and g, show price per 100 units
    const pricePer100 = (price / numericSize) * 100;
    return {
      value: pricePer100,
      label: `£${pricePer100.toFixed(2)}/100${unitAbbrev}`,
    };
  }

  // For other units (pint, L, kg, each, pack), show per single unit
  const pricePerUnit = price / numericSize;
  return {
    value: pricePerUnit,
    label: `£${pricePerUnit.toFixed(2)}/${unitAbbrev}`,
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PriceDisplay = memo(function PriceDisplay({
  price,
  size,
  unit,
  showPerUnit = true,
  priceSource,
  compact = false,
  align = "left",
}: PriceDisplayProps) {
  // Calculate price per unit
  const pricePerUnit = useMemo(() => {
    if (!showPerUnit || price === null || !size || !unit) return null;
    return calculatePricePerUnit(price, size, unit);
  }, [price, size, unit, showPerUnit]);

  // Determine alignment style
  const alignmentStyle = useMemo(() => {
    switch (align) {
      case "center":
        return styles.alignCenter;
      case "right":
        return styles.alignRight;
      default:
        return styles.alignLeft;
    }
  }, [align]);

  // Show AI estimate indicator
  const isAiEstimate = priceSource === "ai_estimate";

  // Render compact mode (inline)
  if (compact) {
    return (
      <View style={[styles.compactContainer, alignmentStyle]}>
        <Text style={styles.compactPrice}>
          {formatPrice(price)}
        </Text>
        {pricePerUnit && (
          <Text style={styles.compactPerUnit}>
            ({pricePerUnit.label})
          </Text>
        )}
        {isAiEstimate && price !== null && (
          <MaterialCommunityIcons
            name="auto-fix"
            size={10}
            color={colors.text.tertiary}
            style={styles.compactIcon}
          />
        )}
      </View>
    );
  }

  // Render full mode (stacked)
  return (
    <View style={[styles.container, alignmentStyle]}>
      {/* Main price row */}
      <View style={styles.priceRow}>
        <Text
          style={[
            styles.mainPrice,
            price === null && styles.priceUnknown,
          ]}
        >
          {formatPrice(price)}
        </Text>
        {isAiEstimate && price !== null && (
          <View style={styles.aiIndicator}>
            <MaterialCommunityIcons
              name="auto-fix"
              size={12}
              color={colors.text.tertiary}
            />
          </View>
        )}
      </View>

      {/* Price per unit row */}
      {pricePerUnit && (
        <Text style={styles.perUnitPrice}>
          {pricePerUnit.label}
        </Text>
      )}
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Container styles
  container: {
    flexDirection: "column",
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  // Alignment
  alignLeft: {
    alignItems: "flex-start",
  },
  alignCenter: {
    alignItems: "center",
  },
  alignRight: {
    alignItems: "flex-end",
  },

  // Full mode styles
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  mainPrice: {
    ...typography.labelLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  priceUnknown: {
    color: colors.text.disabled,
    fontStyle: "italic",
  },
  perUnitPrice: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  aiIndicator: {
    opacity: 0.7,
  },

  // Compact mode styles
  compactPrice: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  compactPerUnit: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  compactIcon: {
    marginLeft: 2,
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default PriceDisplay;
