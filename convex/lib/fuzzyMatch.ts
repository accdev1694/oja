/**
 * Fuzzy Matching Utilities (Convex-compatible)
 *
 * Server-side copy of lib/text/fuzzyMatch.ts for use within Convex functions.
 * Convex cannot import from the app's lib/ directory.
 */

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
