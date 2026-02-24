/**
 * Grocery-appropriate title case normalization.
 *
 * Converts item names to consistent title case while respecting
 * measurement prefixes (140g, 2L), known abbreviations (PG, UHT),
 * and English prepositions/articles.
 */

// Words that stay lowercase (unless they're the first word)
const LOWERCASE_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "for",
  "with",
  "and",
  "or",
  "to",
  "on",
  "at",
  "by",
  "per",
]);

// Abbreviations that stay uppercase
const UPPERCASE_ABBREVIATIONS = new Set([
  "pg",
  "uht",
  "hp",
  "bbq",
  "uk",
  "eu",
  "xl",
  "xxl",
  "cbd",
  "dha",
  "epa",
  "gmo",
  "msg",
  "kcal",
  "ipa",
]);

// Pattern: digits followed by letters (e.g., "140g", "500ml", "2L", "1.5L")
const MEASUREMENT_PATTERN = /^\d+(\.\d+)?[a-zA-Z]+$/;

function capitalizeWord(word: string): string {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Convert a grocery item name to appropriate title case.
 *
 * Rules:
 * 1. Each word is capitalized (first letter upper, rest lower)
 * 2. Prepositions/articles stay lowercase unless first word
 * 3. Known abbreviations (PG, UHT, BBQ, etc.) stay uppercase
 * 4. Measurement tokens (140g, 500ml, 2L) are preserved as-is
 * 5. ALL-CAPS input is converted to title case (OCR receipts)
 * 6. Whitespace is trimmed and collapsed
 *
 * @example
 * toGroceryTitleCase("chin chin")          // "Chin Chin"
 * toGroceryTitleCase("140g CHIN CHIN")     // "140g Chin Chin"
 * toGroceryTitleCase("bag of rice")        // "Bag of Rice"
 * toGroceryTitleCase("PG TIPS TEA BAGS")   // "PG Tips Tea Bags"
 * toGroceryTitleCase("semi skimmed milk 2L") // "Semi Skimmed Milk 2L"
 */
export function toGroceryTitleCase(name: string): string {
  if (!name) return name;

  // Trim and collapse whitespace
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (cleaned.length === 0) return cleaned;

  const words = cleaned.split(" ");

  return words
    .map((word, index) => {
      // Preserve measurement tokens as-is (e.g., "140g", "2L", "500ml")
      if (MEASUREMENT_PATTERN.test(word)) {
        return word;
      }

      const lowered = word.toLowerCase();

      // Known abbreviations → uppercase
      if (UPPERCASE_ABBREVIATIONS.has(lowered)) {
        return word.toUpperCase();
      }

      // Prepositions/articles → lowercase (unless first word)
      if (index > 0 && LOWERCASE_WORDS.has(lowered)) {
        return lowered;
      }

      // Default: capitalize first letter, lowercase rest
      return capitalizeWord(word);
    })
    .join(" ");
}

/**
 * Safe wrapper — returns empty string for null/undefined,
 * otherwise applies grocery title case.
 */
export function normalizeDisplayName(
  name: string | null | undefined
): string {
  if (!name) return "";
  return toGroceryTitleCase(name);
}
