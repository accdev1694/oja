import { normalizeItemName } from "./fuzzyMatch";

/**
 * Validate a product name is reasonable (not garbage OCR).
 * Returns false for empty, too-short, too-long, non-alphabetic,
 * or known garbage patterns.
 */
export function isValidProductName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 50) return false;
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(name)) return false;
  // At least 50% alphabetic characters
  const alphaCount = name.replace(/[^a-zA-Z]/g, "").length;
  if (alphaCount / name.length < 0.5) return false;
  // Reject known garbage patterns
  if (/^(test|asdf|xxx|unknown|null|undefined|n\/a)/i.test(name.trim()))
    return false;
  return true;
}

/**
 * Generate a canonical key for variant dedup.
 * Two scans of the same product should produce the same key.
 */
export function variantKey(name: string, size: string): string {
  const normName = normalizeItemName(name) || name.toLowerCase().trim();
  const normSize = size.toLowerCase().trim().replace(/\s+/g, "");
  return `${normSize}|${normName}`;
}

