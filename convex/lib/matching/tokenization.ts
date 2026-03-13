/**
 * Tokenization & Token Overlap
 *
 * Handles text normalization, brand stripping, stop word removal,
 * and token-based similarity scoring for item name matching.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Common words to ignore in matching */
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for", "with",
  "pack", "pk", "x", "box", "bag", "each", "per", "kg", "g", "ml", "l", "oz",
]);

/** UK supermarket brand prefixes to strip */
const BRAND_PREFIXES = [
  "tesco", "asda", "sainsbury", "sainsburys", "morrisons", "waitrose", "aldi",
  "lidl", "coop", "co-op", "iceland", "marks", "spencer", "m&s", "ocado",
  "amazon", "fresh", "finest", "everyday", "essential", "basics", "smart price",
  "by sainsbury", "hubbards", "stamford", "hearty food", "grower's harvest",
];

// ─────────────────────────────────────────────────────────────────────────────
// Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tokenize an item name into meaningful keywords.
 * Strips brands, stop words, sizes, and normalizes.
 */
export function tokenize(name: string): string[] {
  let normalized = name.toLowerCase().trim();

  // Strip brand prefixes
  for (const brand of BRAND_PREFIXES) {
    if (normalized.startsWith(brand + " ") || normalized.startsWith(brand + "'s ")) {
      normalized = normalized.replace(new RegExp(`^${brand}('s)?\\s+`, "i"), "");
    }
  }

  // Remove size patterns (e.g., "500g", "2 pint", "35-38")
  normalized = normalized
    .replace(/\d+\s*-\s*\d+/g, "")           // Size ranges like "35-38"
    .replace(/\d+\s*(g|kg|ml|l|oz|lb|pt|pint|pints|pack|pk|x)\b/gi, "")
    .replace(/\d{6,}/g, "")                   // Product codes (6+ digits)
    .replace(/[^\w\s]/g, " ")                 // Remove punctuation
    .replace(/\s+/g, " ")                     // Normalize whitespace
    .trim();

  // Split and filter
  const tokens = normalized
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  return [...new Set(tokens)]; // Deduplicate
}

/**
 * Calculate token overlap score between two names.
 * Returns 0-100 where 100 = perfect overlap.
 */
export function calculateTokenOverlap(name1: string, name2: string): number {
  const tokens1 = tokenize(name1);
  const tokens2 = tokenize(name2);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let overlap = 0;
  for (const t of set1) {
    if (set2.has(t)) overlap++;
  }

  // Use Jaccard-like similarity but weighted toward smaller set
  // If all tokens of shorter name appear in longer, that's a strong match
  const minSize = Math.min(set1.size, set2.size);
  const maxSize = Math.max(set1.size, set2.size);

  // Primary: overlap / min (catches subset matches)
  const subsetScore = overlap / minSize;
  // Secondary: overlap / max (penalizes very different lengths)
  const jaccardScore = overlap / maxSize;

  // Weighted average: 70% subset, 30% jaccard
  return Math.round((subsetScore * 0.7 + jaccardScore * 0.3) * 100);
}
