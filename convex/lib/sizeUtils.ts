/**
 * Size Utilities for Convex
 *
 * Parses and normalizes size strings for UK grocery items.
 * This is a Convex-compatible version of the client-side sizeNormalizer.ts.
 *
 * Used by:
 * - getSizesForStore query (size normalization + price per unit)
 * - Price cascade logic
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type UnitCategory = "volume" | "weight" | "count";

export type VolumeUnit = "ml" | "l" | "pt";
export type WeightUnit = "g" | "kg" | "oz" | "lb";
export type CountUnit = "pk" | "each";

export type NormalizedUnit = VolumeUnit | WeightUnit | CountUnit;

export interface ParsedSize {
  value: number;
  unit: NormalizedUnit;
  category: UnitCategory;
  /** Size normalized to base unit (ml for volume, g for weight, 1 for count) */
  normalizedValue: number;
  /** Display string e.g. "2pt", "500ml", "6pk" */
  display: string;
  /** Original input string */
  original: string;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/**
 * Unit conversions to base units (ml for volume, g for weight).
 */
export const UNIT_CONVERSIONS: Record<
  string,
  { factor: number; baseUnit: NormalizedUnit; category: UnitCategory }
> = {
  // Volume (normalize to ml)
  pt: { factor: 568, baseUnit: "ml", category: "volume" },
  pint: { factor: 568, baseUnit: "ml", category: "volume" },
  pints: { factor: 568, baseUnit: "ml", category: "volume" },
  l: { factor: 1000, baseUnit: "ml", category: "volume" },
  L: { factor: 1000, baseUnit: "ml", category: "volume" },
  litre: { factor: 1000, baseUnit: "ml", category: "volume" },
  liter: { factor: 1000, baseUnit: "ml", category: "volume" },
  litres: { factor: 1000, baseUnit: "ml", category: "volume" },
  liters: { factor: 1000, baseUnit: "ml", category: "volume" },
  ml: { factor: 1, baseUnit: "ml", category: "volume" },
  millilitre: { factor: 1, baseUnit: "ml", category: "volume" },
  milliliter: { factor: 1, baseUnit: "ml", category: "volume" },
  millilitres: { factor: 1, baseUnit: "ml", category: "volume" },
  milliliters: { factor: 1, baseUnit: "ml", category: "volume" },
  cl: { factor: 10, baseUnit: "ml", category: "volume" },
  centilitre: { factor: 10, baseUnit: "ml", category: "volume" },
  centiliter: { factor: 10, baseUnit: "ml", category: "volume" },

  // Weight (normalize to grams)
  kg: { factor: 1000, baseUnit: "g", category: "weight" },
  kilogram: { factor: 1000, baseUnit: "g", category: "weight" },
  kilograms: { factor: 1000, baseUnit: "g", category: "weight" },
  kilo: { factor: 1000, baseUnit: "g", category: "weight" },
  kilos: { factor: 1000, baseUnit: "g", category: "weight" },
  g: { factor: 1, baseUnit: "g", category: "weight" },
  gram: { factor: 1, baseUnit: "g", category: "weight" },
  grams: { factor: 1, baseUnit: "g", category: "weight" },
  oz: { factor: 28.35, baseUnit: "g", category: "weight" },
  ounce: { factor: 28.35, baseUnit: "g", category: "weight" },
  ounces: { factor: 28.35, baseUnit: "g", category: "weight" },
  lb: { factor: 453.6, baseUnit: "g", category: "weight" },
  lbs: { factor: 453.6, baseUnit: "g", category: "weight" },
  pound: { factor: 453.6, baseUnit: "g", category: "weight" },
  pounds: { factor: 453.6, baseUnit: "g", category: "weight" },

  // Count (normalize to 1)
  pk: { factor: 1, baseUnit: "pk", category: "count" },
  pack: { factor: 1, baseUnit: "pk", category: "count" },
  packs: { factor: 1, baseUnit: "pk", category: "count" },
  each: { factor: 1, baseUnit: "each", category: "count" },
  ea: { factor: 1, baseUnit: "each", category: "count" },
  pcs: { factor: 1, baseUnit: "each", category: "count" },
  pieces: { factor: 1, baseUnit: "each", category: "count" },
  x: { factor: 1, baseUnit: "pk", category: "count" },
};

/**
 * Display unit abbreviations for each normalized unit
 */
export const UNIT_DISPLAY: Record<NormalizedUnit, string> = {
  ml: "ml",
  l: "L",
  pt: "pt",
  g: "g",
  kg: "kg",
  oz: "oz",
  lb: "lb",
  pk: "pk",
  each: "each",
};

/**
 * Units suitable for price-per-unit display
 */
export const PRICE_PER_UNIT_LABELS: Record<UnitCategory, string> = {
  volume: "/100ml",
  weight: "/100g",
  count: "/each",
};

// -----------------------------------------------------------------------------
// Core Functions
// -----------------------------------------------------------------------------

/**
 * Parses a size string into a structured ParsedSize object.
 *
 * @param sizeString - Raw size string e.g. "2 pints", "500ml", "6-pack"
 * @returns ParsedSize object or null if parsing fails
 *
 * @example
 * parseSize("2 pints") // => { value: 2, unit: "pt", normalizedValue: 1136, display: "2pt", ... }
 * parseSize("500ml")   // => { value: 500, unit: "ml", normalizedValue: 500, display: "500ml", ... }
 * parseSize("1.5kg")   // => { value: 1.5, unit: "kg", normalizedValue: 1500, display: "1.5kg", ... }
 */
export function parseSize(sizeString: string): ParsedSize | null {
  if (!sizeString || typeof sizeString !== "string") {
    return null;
  }

  const original = sizeString.trim();
  const cleaned = original.toLowerCase().replace(/\s+/g, "");

  // Match number (including decimals) followed by unit
  // Examples: "2pt", "500ml", "1.5kg", "6-pack", "2 pints"
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*[-x]?\s*([a-z]+)$/);

  if (!match) {
    // Try alternative format: "pack of 6", "6 x 500ml"
    const altMatch = cleaned.match(/^(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*([a-z]+)$/);
    if (altMatch) {
      // "6 x 500ml" = 3000ml
      const count = parseFloat(altMatch[1]);
      const value = parseFloat(altMatch[2]);
      const unitStr = altMatch[3];
      const conversion = UNIT_CONVERSIONS[unitStr];
      if (conversion) {
        const totalValue = count * value;
        const normalizedValue = totalValue * conversion.factor;
        return {
          value: totalValue,
          unit: conversion.baseUnit,
          category: conversion.category,
          normalizedValue,
          display: `${count}x${value}${UNIT_DISPLAY[conversion.baseUnit]}`,
          original,
        };
      }
    }
    return null;
  }

  const value = parseFloat(match[1]);
  const unitStr = match[2];

  const conversion = UNIT_CONVERSIONS[unitStr];
  if (!conversion) {
    return null;
  }

  const normalizedValue = value * conversion.factor;

  // Choose the best display unit based on value
  let displayUnit = conversion.baseUnit;
  let displayValue = value;

  // Convert to larger unit if appropriate for display
  if (conversion.category === "volume") {
    // Check for pint sizes first (common UK milk sizes: 1pt, 2pt, 4pt, 6pt)
    if (
      normalizedValue % 568 === 0 &&
      normalizedValue >= 568 &&
      normalizedValue <= 3408
    ) {
      // Prefer pints for UK milk sizes
      displayUnit = "pt";
      displayValue = normalizedValue / 568;
    } else if (normalizedValue >= 1000) {
      displayUnit = "l";
      displayValue = normalizedValue / 1000;
    } else {
      displayUnit = "ml";
      displayValue = normalizedValue;
    }
  } else if (conversion.category === "weight") {
    if (normalizedValue >= 1000) {
      displayUnit = "kg";
      displayValue = normalizedValue / 1000;
    } else {
      displayUnit = "g";
      displayValue = normalizedValue;
    }
  }

  // Format display value (remove trailing zeros)
  const formattedValue =
    displayValue % 1 === 0
      ? displayValue.toString()
      : displayValue.toFixed(1).replace(/\.0$/, "");

  return {
    value,
    unit: conversion.baseUnit,
    category: conversion.category,
    normalizedValue,
    display: `${formattedValue}${UNIT_DISPLAY[displayUnit]}`,
    original,
  };
}

/**
 * Normalizes a size string to a consistent display format.
 *
 * @param sizeString - Raw size string
 * @returns Normalized display string or original if parsing fails
 *
 * @example
 * normalizeSize("2 pints") // => "2pt"
 * normalizeSize("500 ml")  // => "500ml"
 * normalizeSize("1.5 kg")  // => "1.5kg"
 */
export function normalizeSize(sizeString: string): string {
  const parsed = parseSize(sizeString);
  return parsed?.display ?? sizeString;
}

/**
 * Calculates the price per 100 units (100ml or 100g) or per each for count items.
 *
 * @param price - Total price
 * @param sizeString - Size string
 * @returns Price per 100 units (or per each), or null if calculation fails
 *
 * @example
 * calculatePricePerUnit(1.45, "2pt") // => 0.1276 (per 100ml)
 * calculatePricePerUnit(2.50, "250g") // => 1.00 (per 100g)
 */
export function calculatePricePerUnit(
  price: number,
  sizeString: string
): number | null {
  const parsed = parseSize(sizeString);
  if (!parsed) return null;

  if (parsed.category === "count") {
    // For count items, price per unit = price / count
    return price / parsed.value;
  }

  // For volume/weight, calculate per 100 units
  return (price / parsed.normalizedValue) * 100;
}

/**
 * Gets the unit label for price-per-unit display.
 *
 * @param sizeString - Size string to determine category
 * @returns Unit label string (e.g., "/100ml", "/100g", "/each")
 */
export function getUnitLabel(sizeString: string): string {
  const parsed = parseSize(sizeString);
  if (!parsed) return "/each";
  return PRICE_PER_UNIT_LABELS[parsed.category];
}
