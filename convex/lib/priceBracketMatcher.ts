/**
 * Price-Bracket Matcher
 *
 * When a receipt item lacks size/unit information, this module infers
 * the variant from the item's price by matching against known variant prices.
 *
 * Example: Receipt says "MILK £1.15" (no size) → matches to "Whole Milk 2 Pints"
 */

export interface ItemVariant {
  variantName: string;
  size: string;
  unit: string;
  estimatedPrice: number | null;
  baseItem: string;
}

export interface MatchResult {
  matched: boolean;
  variant?: ItemVariant;
  matchType: "exact" | "bracket" | "ambiguous" | "no_match";
  candidates: ItemVariant[];
  tolerance: number;
}

/**
 * Default price tolerance for bracket matching (20%)
 * This means a receipt price of £1.15 will match variants priced £0.92 - £1.38
 */
export const DEFAULT_TOLERANCE = 0.20;

/**
 * Extract base item name by stripping size/unit information.
 *
 * Examples:
 * - "Whole Milk 2 Pints" → "whole milk"
 * - "Coca Cola 2L" → "coca cola"
 * - "Butter 250g" → "butter"
 */
export function extractBaseItem(itemName: string): string {
  return itemName
    .toLowerCase()
    .replace(/\d+\s*(ml|l|g|kg|pt|pint|pints|pack|oz|lb|litre|litres|liter|liters)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Match a receipt item price against known variants.
 *
 * Returns the matched variant only if there's exactly one unambiguous match
 * within the price tolerance range.
 *
 * @param receiptPrice - The price from the receipt
 * @param variants - Known variants with estimated prices
 * @param tolerance - Price tolerance as decimal (default 0.20 = 20%)
 */
export function matchPriceBracket(
  receiptPrice: number,
  variants: ItemVariant[],
  tolerance: number = DEFAULT_TOLERANCE
): MatchResult {
  if (variants.length === 0) {
    return {
      matched: false,
      matchType: "no_match",
      candidates: [],
      tolerance,
    };
  }

  // Find all variants within tolerance range
  const candidates = variants.filter((v) => {
    if (v.estimatedPrice == null) return false;
    const diff = Math.abs(receiptPrice - v.estimatedPrice) / v.estimatedPrice;
    return diff <= tolerance;
  });

  // Check for exact match first (within 1%)
  const exactMatch = candidates.find((v) => {
    if (v.estimatedPrice == null) return false;
    const diff = Math.abs(receiptPrice - v.estimatedPrice) / v.estimatedPrice;
    return diff <= 0.01;
  });

  if (exactMatch) {
    return {
      matched: true,
      variant: exactMatch,
      matchType: "exact",
      candidates,
      tolerance,
    };
  }

  // Only return a match if exactly one candidate (unambiguous)
  if (candidates.length === 1) {
    return {
      matched: true,
      variant: candidates[0],
      matchType: "bracket",
      candidates,
      tolerance,
    };
  }

  if (candidates.length > 1) {
    return {
      matched: false,
      matchType: "ambiguous",
      candidates,
      tolerance,
    };
  }

  return {
    matched: false,
    matchType: "no_match",
    candidates: [],
    tolerance,
  };
}

/**
 * Find the closest variant by price when bracket matching fails.
 * Useful for suggesting the most likely variant even when ambiguous.
 */
export function findClosestVariant(
  receiptPrice: number,
  variants: ItemVariant[]
): ItemVariant | null {
  if (variants.length === 0) return null;

  const withPrices = variants.filter((v) => v.estimatedPrice != null);
  if (withPrices.length === 0) return null;

  return withPrices.reduce((closest, v) => {
    const closestDiff = Math.abs(receiptPrice - (closest.estimatedPrice ?? Infinity));
    const currentDiff = Math.abs(receiptPrice - (v.estimatedPrice ?? Infinity));
    return currentDiff < closestDiff ? v : closest;
  });
}

/**
 * Calculate the price difference as a percentage.
 */
export function calculatePriceDiff(
  receiptPrice: number,
  variantPrice: number
): number {
  return Math.abs(receiptPrice - variantPrice) / variantPrice;
}
