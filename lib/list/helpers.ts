/**
 * Shared helpers for shopping list logic.
 * Pure utility functions with no component dependencies.
 */

/**
 * Normalize a string for comparison
 */
export function normalizeForComparison(str: string): string {
  let normalized = str.toLowerCase().trim();

  // Remove common prefixes
  const prefixes = ["a ", "an ", "the ", "some ", "fresh ", "organic "];
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length);
    }
  }

  // Remove trailing 's' or 'es' for basic pluralization
  if (normalized.endsWith("ies")) {
    normalized = normalized.slice(0, -3) + "y";
  } else if (normalized.endsWith("es")) {
    normalized = normalized.slice(0, -2);
  } else if (normalized.endsWith("s") && normalized.length > 2) {
    normalized = normalized.slice(0, -1);
  }

  return normalized.trim();
}

/**
 * Check if two item names are similar
 */
export function areItemsSimilar(name1: string, name2: string): boolean {
  const norm1 = normalizeForComparison(name1);
  const norm2 = normalizeForComparison(name2);

  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  const words1 = norm1.split(/\s+/).filter((w) => w.length > 2);
  const words2 = norm2.split(/\s+/).filter((w) => w.length > 2);

  for (const word of words1) {
    if (words2.some((w) => w === word || w.includes(word) || word.includes(w))) {
      return true;
    }
  }

  return false;
}

/**
 * Get a confidence label for a price based on its source and report count.
 * reportCount: 0 = "~est.", 1-2 = "at StoreName", 3-9 = "avg", 10+ = no qualifier
 */
export function getPriceLabel(
  price: number,
  priceSource: "personal" | "crowdsourced" | "ai_estimate",
  reportCount: number,
  storeName: string | null
): { prefix: string; suffix: string } {
  if (priceSource === "ai_estimate" || reportCount === 0) {
    return { prefix: "~", suffix: "est." };
  }
  if (reportCount <= 2 && storeName) {
    return { prefix: "", suffix: `at ${storeName}` };
  }
  if (reportCount < 10) {
    return { prefix: "", suffix: "avg" };
  }
  return { prefix: "", suffix: "" };
}
