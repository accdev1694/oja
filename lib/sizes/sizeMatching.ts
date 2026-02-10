/**
 * Size Matching Utility
 *
 * Finds closest matching sizes when switching stores.
 * Uses configurable tolerance for auto-matching.
 *
 * Used by:
 * - Store switching (find equivalent sizes)
 * - Size suggestions (rank by closeness)
 */

import { parseSize, ParsedSize, UnitCategory } from "./sizeNormalizer";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SizeMatch {
  /** The matched size string */
  size: string;
  /** Parsed size data */
  parsed: ParsedSize;
  /** How close the match is (0 = exact, 1 = at tolerance limit) */
  matchScore: number;
  /** Whether this is an exact match */
  isExact: boolean;
  /** Whether this is within auto-match tolerance */
  isAutoMatchable: boolean;
  /** Percentage difference from target */
  percentDiff: number;
}

export interface SizeMatchResult {
  /** Best match found */
  bestMatch: SizeMatch | null;
  /** All matches sorted by closeness */
  allMatches: SizeMatch[];
  /** Whether an exact match was found */
  hasExactMatch: boolean;
  /** Whether a suitable auto-match was found */
  hasAutoMatch: boolean;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/**
 * Default tolerance for auto-matching sizes when switching stores.
 * 20% allows for slight variations (e.g., 250g → 227g butter)
 */
export const DEFAULT_TOLERANCE = 0.2;

/**
 * Tolerance for considering sizes "exact" (accounts for rounding)
 */
export const EXACT_TOLERANCE = 0.01;

// -----------------------------------------------------------------------------
// Core Functions
// -----------------------------------------------------------------------------

/**
 * Finds the closest matching size from a list of available sizes.
 *
 * @param targetSize - The size to match against
 * @param availableSizes - List of available sizes at the store
 * @param tolerance - Maximum percentage difference for auto-matching (default 20%)
 * @returns SizeMatchResult with best match and all matches
 *
 * @example
 * findClosestSize("250g", ["227g", "500g", "1kg"])
 * // => { bestMatch: { size: "227g", matchScore: 0.46, isAutoMatchable: true }, ... }
 *
 * findClosestSize("2pt", ["1pt", "2pt", "4pt"])
 * // => { bestMatch: { size: "2pt", matchScore: 0, isExact: true }, ... }
 */
export function findClosestSize(
  targetSize: string,
  availableSizes: string[],
  tolerance: number = DEFAULT_TOLERANCE
): SizeMatchResult {
  const targetParsed = parseSize(targetSize);

  if (!targetParsed) {
    return {
      bestMatch: null,
      allMatches: [],
      hasExactMatch: false,
      hasAutoMatch: false,
    };
  }

  const matches: SizeMatch[] = [];

  for (const size of availableSizes) {
    const parsed = parseSize(size);
    if (!parsed) continue;

    // Only compare sizes in the same category
    if (parsed.category !== targetParsed.category) continue;

    // Calculate percentage difference
    const diff = Math.abs(parsed.normalizedValue - targetParsed.normalizedValue);
    const percentDiff = diff / targetParsed.normalizedValue;

    // Match score: 0 = exact, 1 = at tolerance limit
    const matchScore = Math.min(percentDiff / tolerance, 1);

    matches.push({
      size,
      parsed,
      matchScore,
      isExact: percentDiff <= EXACT_TOLERANCE,
      isAutoMatchable: percentDiff <= tolerance,
      percentDiff,
    });
  }

  // Sort by percentage difference (closest first)
  matches.sort((a, b) => a.percentDiff - b.percentDiff);

  const bestMatch = matches[0] ?? null;

  return {
    bestMatch,
    allMatches: matches,
    hasExactMatch: matches.some((m) => m.isExact),
    hasAutoMatch: matches.some((m) => m.isAutoMatchable),
  };
}

/**
 * Checks if two sizes are equivalent (exact or very close match).
 *
 * @param size1 - First size string
 * @param size2 - Second size string
 * @returns True if sizes are equivalent
 *
 * @example
 * areSizesEquivalent("2pt", "2 pints")    // => true
 * areSizesEquivalent("1L", "1000ml")      // => true
 * areSizesEquivalent("500g", "0.5kg")     // => true
 * areSizesEquivalent("250g", "500g")      // => false
 */
export function areSizesEquivalent(size1: string, size2: string): boolean {
  const parsed1 = parseSize(size1);
  const parsed2 = parseSize(size2);

  if (!parsed1 || !parsed2) return false;
  if (parsed1.category !== parsed2.category) return false;

  const diff = Math.abs(parsed1.normalizedValue - parsed2.normalizedValue);
  const percentDiff = diff / Math.max(parsed1.normalizedValue, parsed2.normalizedValue);

  return percentDiff <= EXACT_TOLERANCE;
}

/**
 * Ranks sizes by their value (for sorting in UI).
 *
 * @param sizes - List of size strings
 * @returns Sorted list of sizes (smallest to largest)
 *
 * @example
 * rankSizesByValue(["4pt", "1pt", "2pt"]) // => ["1pt", "2pt", "4pt"]
 */
export function rankSizesByValue(sizes: string[]): string[] {
  return sizes
    .map((size) => ({ size, parsed: parseSize(size) }))
    .filter((item): item is { size: string; parsed: ParsedSize } => item.parsed !== null)
    .sort((a, b) => a.parsed.normalizedValue - b.parsed.normalizedValue)
    .map((item) => item.size);
}

/**
 * Groups sizes by their unit category.
 *
 * @param sizes - List of size strings
 * @returns Object with sizes grouped by category
 *
 * @example
 * groupSizesByCategory(["2pt", "500g", "1L", "250g"])
 * // => { volume: ["2pt", "1L"], weight: ["500g", "250g"], count: [] }
 */
export function groupSizesByCategory(sizes: string[]): Record<UnitCategory, string[]> {
  const groups: Record<UnitCategory, string[]> = {
    volume: [],
    weight: [],
    count: [],
  };

  for (const size of sizes) {
    const parsed = parseSize(size);
    if (parsed) {
      groups[parsed.category].push(size);
    }
  }

  return groups;
}

/**
 * Calculates the percentage difference between two sizes.
 *
 * @param size1 - First size string
 * @param size2 - Second size string
 * @returns Percentage difference (0-1), or null if not comparable
 *
 * @example
 * getSizePercentDiff("250g", "227g")  // => 0.092 (9.2% difference)
 * getSizePercentDiff("2pt", "500ml")  // => null (different categories in practical terms)
 */
export function getSizePercentDiff(size1: string, size2: string): number | null {
  const parsed1 = parseSize(size1);
  const parsed2 = parseSize(size2);

  if (!parsed1 || !parsed2) return null;
  if (parsed1.category !== parsed2.category) return null;

  const diff = Math.abs(parsed1.normalizedValue - parsed2.normalizedValue);
  return diff / Math.max(parsed1.normalizedValue, parsed2.normalizedValue);
}

/**
 * Suggests the most common/standard size from a list.
 * Prefers round numbers and common UK sizes.
 *
 * @param sizes - List of available sizes
 * @param category - Optional category to filter by
 * @returns Suggested "standard" size or null
 *
 * @example
 * suggestStandardSize(["227g", "250g", "500g"], "weight") // => "500g"
 * suggestStandardSize(["568ml", "1L", "2pt"], "volume")    // => "2pt"
 */
export function suggestStandardSize(sizes: string[], category?: UnitCategory): string | null {
  const parsedSizes = sizes
    .map((size) => ({ size, parsed: parseSize(size) }))
    .filter((item): item is { size: string; parsed: ParsedSize } => {
      if (!item.parsed) return false;
      if (category && item.parsed.category !== category) return false;
      return true;
    });

  if (parsedSizes.length === 0) return null;

  // Score each size: prefer round numbers and common sizes
  const scored = parsedSizes.map(({ size, parsed }) => {
    let score = 0;

    // Prefer round values
    if (parsed.normalizedValue % 1000 === 0) score += 3;
    else if (parsed.normalizedValue % 500 === 0) score += 2;
    else if (parsed.normalizedValue % 100 === 0) score += 1;

    // Prefer common UK sizes
    const commonVolumes = [568, 1136, 1000, 2000, 2272]; // 1pt, 2pt, 1L, 2L, 4pt
    const commonWeights = [250, 500, 1000, 400, 800]; // common pack sizes
    const commonCounts = [6, 12, 4, 8, 10];

    if (parsed.category === "volume" && commonVolumes.includes(parsed.normalizedValue)) {
      score += 2;
    } else if (parsed.category === "weight" && commonWeights.includes(parsed.normalizedValue)) {
      score += 2;
    } else if (parsed.category === "count" && commonCounts.includes(parsed.value)) {
      score += 2;
    }

    return { size, score };
  });

  // Return highest scored
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.size ?? null;
}
