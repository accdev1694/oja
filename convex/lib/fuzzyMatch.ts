/**
 * Fuzzy Matching Utilities (Convex-compatible)
 *
 * Server-side copy of lib/text/fuzzyMatch.ts for use within Convex functions.
 * Convex cannot import from the app's lib/ directory.
 */

import { parseSize } from "./sizeUtils";

/**
 * Normalize an item name for comparison.
 */
export function normalizeItemName(name: string): string {
  let n = name.toLowerCase().trim();

  const prefixes = ["a ", "an ", "the ", "some ", "fresh ", "organic "];
  for (const prefix of prefixes) {
    if (n.startsWith(prefix)) {
      n = n.slice(prefix.length);
    }
  }

  if (n.endsWith("ies") && n.length > 4) {
    n = n.slice(0, -3) + "y";
  } else if (n.endsWith("ves") && n.length > 4) {
    n = n.slice(0, -3) + "f";
  } else if (n.endsWith("es") && n.length > 3) {
    n = n.slice(0, -2);
  } else if (n.endsWith("s") && n.length > 2 && !n.endsWith("ss")) {
    n = n.slice(0, -1);
  }

  return n.trim();
}

/**
 * Calculate Levenshtein distance between two strings.
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity percentage (0–100) between two strings.
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();

  if (normalized1 === normalized2) return 100;

  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(normalized1, normalized2);
  return ((maxLen - distance) / maxLen) * 100;
}

/**
 * Similarity threshold for duplicate detection.
 * - For normalized names >= 5 chars: 85% similarity catches typos
 * - For shorter names: exact normalized match only (too risky otherwise)
 */
const DUPLICATE_SIMILARITY_THRESHOLD = 85;

/**
 * Token-overlap similarity threshold for duplicate detection.
 * Catches cases where the same product scanned from different angles
 * produces names with different word order or extra/missing descriptors,
 * e.g. "12 medium free range egg" vs "12pk free range egg".
 */
const TOKEN_OVERLAP_THRESHOLD = 0.75;

/**
 * Tokenize a normalized name into meaningful words for overlap comparison.
 * Strips common filler words and normalizes pack/quantity formats.
 */
function tokenize(normalizedName: string): string[] {
  // Normalize pack formats: "12pk", "12 pack", "12x", bare "12" at start → "12"
  let s = normalizedName
    .replace(/(\d+)\s*pk\b/g, "$1")
    .replace(/(\d+)\s*pack\b/g, "$1")
    .replace(/(\d+)\s*x\b/g, "$1")
    .replace(/\bpack\s*of\s*(\d+)/g, "$1");

  const stopWords = new Set(["of", "the", "a", "an", "and", "in", "with", "for"]);
  return s
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopWords.has(w));
}

/**
 * Calculate token-overlap similarity (Jaccard-like) between two names.
 * Returns a value between 0 and 1. Uses the smaller set as denominator
 * so that a subset (e.g. 4/4 tokens match out of 5) scores high.
 */
function tokenOverlapSimilarity(norm1: string, norm2: string): number {
  const tokens1 = tokenize(norm1);
  const tokens2 = tokenize(norm2);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let overlap = 0;
  for (const t of set1) {
    if (set2.has(t)) overlap++;
  }

  // Use the smaller set size as denominator — if all tokens of the shorter
  // name appear in the longer one, that's a strong signal they're the same product
  const minSize = Math.min(set1.size, set2.size);
  return overlap / minSize;
}

/**
 * Check if two item names should be considered duplicates.
 * Handles: plurals, common prefixes, typos, case, whitespace,
 * and different descriptions of the same product from different scan angles.
 *
 * Returns true if the items are duplicates.
 */
export function isDuplicateItemName(name1: string, name2: string): boolean {
  const norm1 = normalizeItemName(name1);
  const norm2 = normalizeItemName(name2);

  if (!norm1 || !norm2) return false;

  // Exact normalized match (catches plurals, articles, case)
  if (norm1 === norm2) return true;

  // Substring containment (e.g. "chicken breast" vs "chicken breasts" after normalize)
  // Only if the shorter string is meaningful (> 3 chars)
  const shorter = norm1.length <= norm2.length ? norm1 : norm2;
  const longer = norm1.length <= norm2.length ? norm2 : norm1;
  if (shorter.length > 3 && longer.includes(shorter)) {
    // Only count as duplicate if the contained string is >80% of the longer string
    // This prevents "rice" matching "rice pudding"
    if (shorter.length / longer.length > 0.8) return true;
  }

  // Levenshtein similarity for typo detection (only for longer names)
  const minLen = Math.min(norm1.length, norm2.length);
  if (minLen >= 5) {
    const similarity = calculateSimilarity(norm1, norm2);
    if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD) return true;
  }

  // Token-overlap check: catches different descriptions of the same product
  // e.g. "12 medium free range egg" vs "12pk free range egg"
  // Both share tokens {12, free, range, egg} → high overlap
  const tokenSim = tokenOverlapSimilarity(norm1, norm2);
  if (tokenSim >= TOKEN_OVERLAP_THRESHOLD) return true;

  return false;
}

/**
 * Find the first duplicate match in a list of existing names.
 * Returns the matching name or null.
 */
export function findDuplicateName(
  newName: string,
  existingNames: string[]
): string | null {
  for (const existing of existingNames) {
    if (isDuplicateItemName(newName, existing)) {
      return existing;
    }
  }
  return null;
}

export interface FuzzyMatch {
  name: string;
  similarity: number;
  isExact: boolean;
}

/**
 * Find the best fuzzy matches from a list of candidates.
 */
export function findFuzzyMatches(
  input: string,
  candidates: string[],
  options?: {
    minSimilarity?: number;
    maxResults?: number;
  }
): FuzzyMatch[] {
  const { minSimilarity = 70, maxResults = 10 } = options ?? {};
  const normalizedInput = normalizeItemName(input);

  if (!normalizedInput) return [];

  const effectiveThreshold =
    normalizedInput.length < 4 ? minSimilarity - 10 : minSimilarity;

  const matches: FuzzyMatch[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeItemName(candidate);
    if (!normalizedCandidate || seen.has(normalizedCandidate)) continue;
    seen.add(normalizedCandidate);

    if (normalizedInput === normalizedCandidate) {
      matches.push({ name: candidate, similarity: 100, isExact: true });
      continue;
    }

    if (
      normalizedInput.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedInput)
    ) {
      const sim = calculateSimilarity(normalizedInput, normalizedCandidate);
      matches.push({ name: candidate, similarity: Math.max(sim, 85), isExact: false });
      continue;
    }

    const similarity = calculateSimilarity(normalizedInput, normalizedCandidate);
    if (similarity >= effectiveThreshold) {
      matches.push({ name: candidate, similarity, isExact: false });
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity);
  return matches.slice(0, maxResults);
}

/**
 * Normalize a size string for duplicate comparison.
 * Uses parseSize() to convert to a canonical numeric+category form so that
 * equivalent sizes in different formats match (e.g. "2 pints" === "2pt",
 * "1 litre" === "1000ml").
 *
 * Returns empty string for undefined/null/empty (meaning "no size specified").
 */
export function normalizeSizeForDedup(
  size: string | undefined | null,
): string {
  if (!size || !size.trim()) return "";

  const parsed = parseSize(size);
  if (parsed) {
    // Use normalizedValue (base unit: ml for volume, g for weight, raw for count)
    // plus category to avoid cross-category collisions (e.g. 500ml vs 500g)
    return `${parsed.normalizedValue}:${parsed.category}`;
  }

  // Fallback for unparseable sizes: lowercase + strip whitespace
  return size.toLowerCase().trim().replace(/\s+/g, "");
}

/**
 * Check if two items should be considered duplicates considering BOTH name AND size.
 *
 * Rules:
 * - Names must match (via isDuplicateItemName fuzzy logic)
 * - Sizes must match (both absent, or both normalize to same value)
 * - Brand is ignored (by design — brand is a store-time decision)
 */
export function isDuplicateItem(
  name1: string,
  size1: string | undefined | null,
  name2: string,
  size2: string | undefined | null,
): boolean {
  if (!isDuplicateItemName(name1, name2)) return false;

  const normSize1 = normalizeSizeForDedup(size1);
  const normSize2 = normalizeSizeForDedup(size2);

  return normSize1 === normSize2;
}
