/**
 * Item Name Parser — Internal Helpers
 *
 * Low-level pattern matching / normalisation helpers used by
 * `itemNameParser.ts`. Extracted here to keep the public parser file under
 * the 400-line limit (CLAUDE.md rule #10). Not intended for direct use by
 * callers — import from `itemNameParser.ts` instead.
 */

export const VAGUE_SIZES = ["per item", "item", "each", "unit", "piece"] as const;

// Common UK grocery units
export const VALID_UNITS = ["ml", "l", "g", "kg", "pt", "pint", "pints", "pack", "pk", "x", "oz"] as const;

export const SIZE_PATTERN =
  /^(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|pt|pint|pints|pack|pk|x|oz)s?)\s+(.+)$/i;
export const SIZE_END_PATTERN =
  /^(.+?)\s+(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|pt|pint|pints|pack|pk|x|oz)s?)$/i;

// Max characters for the final display string "{size} {name}"
export const MAX_DISPLAY_CHARS = 40;

// Pattern to find a metric measurement anywhere in a string
const METRIC_EXTRACT =
  /(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|pt|pint|pints|pack|pk|x|oz))/i;

/**
 * Canonicalize a "bare number" size into `{number}{unit}` form.
 *
 * Handles the common bug where AI/crowd data stores size="250" + unit="g"
 * (separated) instead of size="250g". Without this step the display layer
 * renders "250 Butter" (missing the unit) because the size field alone is
 * meaningless to the user.
 *
 * Returns null if the size is NOT a bare number (has letters already) or if
 * the provided unit isn't a known UK grocery unit — leaving the caller to
 * keep the original value untouched. This is deliberately narrow so it does
 * not disturb already-correct sizes like "500ml" or "237 ml".
 */
export function canonicaliseBareNumberSize(
  size: string,
  providedUnit?: string | null
): { size: string; unit: string } | null {
  const trimmed = size.trim();
  if (!trimmed) return null;

  // Only apply to bare numeric strings — if size already has letters, leave it.
  const bareNumberMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (!bareNumberMatch) return null;

  if (!providedUnit) return null;
  const normalizedUnit = providedUnit.toLowerCase().trim();
  if (!(VALID_UNITS as readonly string[]).includes(normalizedUnit)) return null;

  return { size: `${bareNumberMatch[1]}${normalizedUnit}`, unit: normalizedUnit };
}

/**
 * Clean duplicate/imperial measurements from a size string.
 * Handles both metric-first and imperial-first patterns:
 * "227g (8oz)" → "227g", "347ml/12 fl oz" → "347ml",
 * "8 FL OZ / 237 mL" → "237ml", "500g / 1.1lb" → "500g"
 */
export function cleanDuplicateUnits(size: string): string {
  let cleaned = size.trim();

  // Strip parenthetical duplicates: "227g (8oz)" → "227g"
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/, "").trim();

  // If the string contains a slash or pipe separator, find the metric measurement
  if (/[/|]/.test(cleaned)) {
    // Try metric-first: "347ml/12 fl oz" → "347ml"
    const metricFirst = cleaned.match(
      /^(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|pt|pint|pints|pack|pk|x|oz))\s*[/|]/i
    );
    if (metricFirst) {
      return metricFirst[1].trim().toLowerCase();
    }
    // Try metric anywhere (handles imperial-first): "8 FL OZ / 237 mL" → "237ml"
    const metricAnywhere = cleaned.match(METRIC_EXTRACT);
    if (metricAnywhere) {
      return metricAnywhere[1].trim().toLowerCase();
    }
  }

  return cleaned;
}

/**
 * Strip dual-unit measurement prefixes from a name string.
 * "8 FL OZ / 237 mL Leave-in Conditioner" → { cleaned: "Leave-in Conditioner", size: "237ml" }
 * "237ml Cantu Leave-in Conditioner" is handled by SIZE_PATTERN already.
 * This catches imperial/dual-unit prefixes that SIZE_PATTERN misses.
 */
export function stripDualUnitFromName(
  name: string
): { cleaned: string; size: string } | null {
  // Pattern: optional number+imperial, separator, number+metric, then the real name
  // e.g. "8 FL OZ / 237 mL Leave-in Conditioning Treatment"
  const dualUnitPrefix = name.match(
    /^\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|oz|lb|lbs?)\s*[/|]\s*(\d+(?:\.\d+)?\s*(?:ml|l|g|kg))\s+(.+)$/i
  );
  if (dualUnitPrefix) {
    return {
      cleaned: dualUnitPrefix[2].trim(),
      size: dualUnitPrefix[1].trim().toLowerCase(),
    };
  }

  // Reverse: metric first, then imperial: "237 mL / 8 FL OZ Leave-in..."
  const dualUnitPrefixReverse = name.match(
    /^(\d+(?:\.\d+)?\s*(?:ml|l|g|kg))\s*[/|]\s*\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|oz|lb|lbs?)\s+(.+)$/i
  );
  if (dualUnitPrefixReverse) {
    return {
      cleaned: dualUnitPrefixReverse[2].trim(),
      size: dualUnitPrefixReverse[1].trim().toLowerCase(),
    };
  }

  return null;
}

/**
 * Extract unit from a size string (e.g., "500ml" → "ml", "2 kg" → "kg")
 */
export function extractUnitFromSize(size: string): string | undefined {
  const trimmed = size.trim();

  // Try to match unit at the end (with or without space)
  // Examples: "500ml", "500 ml", "2kg", "2 kg"
  const unitMatch = trimmed.match(/\d+(?:\.\d+)?\s*([a-z]+)$/i);
  if (unitMatch) {
    const extractedUnit = unitMatch[1].toLowerCase();
    // Validate it's a known unit
    if ((VALID_UNITS as readonly string[]).includes(extractedUnit)) {
      return extractedUnit;
    }
  }

  return undefined;
}
