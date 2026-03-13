import {
  normalizeItemName,
  calculateSimilarity,
} from "@/lib/text/fuzzyMatch";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const STORAGE_KEY = "oja:scannedProducts";
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit for security and cost control
const QUEUE_DEDUP_THRESHOLD = 92;

// ─────────────────────────────────────────────────────────────────────────────
// Client-side dedup helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Two products match if normalised names are exact or >=92% similar, and sizes agree. */
export function isSameQueueProduct(a: any, b: any) {
  const normA = normalizeItemName(a.name);
  const normB = normalizeItemName(b.name);
  if (!normA || !normB) return false;

  if (normA === normB) return sizesMatch(a.size, b.size);

  const sim = calculateSimilarity(normA, normB);
  if (sim >= QUEUE_DEDUP_THRESHOLD) return sizesMatch(a.size, b.size);

  return false;
}

function sizesMatch(a: any, b: any) {
  const normA = normalizeSize(a);
  const normB = normalizeSize(b);
  // Both absent -> match; both present -> must be equal
  return normA === normB;
}

function normalizeSize(size: any) {
  if (!size || !size.trim()) return "";
  return size.toLowerCase().trim().replace(/\s+/g, "");
}
