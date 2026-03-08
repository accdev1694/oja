/**
 * Item Name & Size Parser
 *
 * Centralized utility for parsing and normalizing item names and sizes.
 * Enforces the critical rules:
 * - Size at the BEGINNING, never at the end
 * - NEVER allow size without unit (UNACCEPTABLE)
 *
 * Critical Rules:
 * - Filter out vague sizes: "per item", "each", "unit", "piece", "item"
 * - Size MUST have unit. Size without unit is REJECTED completely.
 * - Size must contain meaningful measurement (number + unit)
 * - Extract size from beginning of names (e.g., "500ml Milk" → "Milk", "500ml")
 * - Always display: "500ml Milk" ✅ not "Milk 500ml" ❌
 */

const VAGUE_SIZES = ["per item", "item", "each", "unit", "piece"];

// Common UK grocery units
const VALID_UNITS = ["ml", "l", "g", "kg", "pt", "pint", "pints", "pack", "pk", "x", "oz"];

const SIZE_PATTERN = /^(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|pt|pint|pints|pack|pk|x|oz)s?)\s+(.+)$/i;

export interface ParsedItem {
  name: string;
  size?: string;
  unit?: string;
}

/**
 * Extract unit from a size string (e.g., "500ml" → "ml", "2 kg" → "kg")
 */
function extractUnitFromSize(size: string) {
  const trimmed = size.trim();

  // Try to match unit at the end (with or without space)
  // Examples: "500ml", "500 ml", "2kg", "2 kg"
  const unitMatch = trimmed.match(/\d+(?:\.\d+)?\s*([a-z]+)$/i);
  if (unitMatch) {
    const extractedUnit = unitMatch[1].toLowerCase();
    // Validate it's a known unit
    if (VALID_UNITS.includes(extractedUnit)) {
      return extractedUnit;
    }
  }

  return undefined;
}

/**
 * Check if a size is valid (meaningful measurement with number + unit).
 * Rejects vague defaults like "per item", "each", etc.
 *
 * CRITICAL: Size without unit is UNACCEPTABLE and will be rejected.
 */
export function isValidSize(size?: string | null, unit?: string | null) {
  // CRITICAL: Both size AND unit are required
  if (!size || !unit) return false;

  const normalizedSize = size.toLowerCase().trim();
  const normalizedUnit = unit.toLowerCase().trim();

  // Reject vague sizes
  if (VAGUE_SIZES.includes(normalizedSize)) return false;

  // Reject if unit is not valid
  if (!VALID_UNITS.includes(normalizedUnit)) return false;

  // Must contain a number
  const hasNumber = /\d/.test(size);
  if (!hasNumber) return false;

  // Unit must exist in the size string OR be provided separately
  // If unit is provided separately, verify it matches what's in the size
  const extractedUnit = extractUnitFromSize(size);
  if (extractedUnit && extractedUnit !== normalizedUnit) {
    // Mismatch between size and unit - reject
    return false;
  }

  return true;
}

/**
 * Parse an item name and extract size/unit if embedded at the beginning.
 *
 * Examples:
 * - "500ml Milk" → { name: "Milk", size: "500ml", unit: "ml" }
 * - "2kg Rice" → { name: "Rice", size: "2kg", unit: "kg" }
 * - "Milk" → { name: "Milk", size: undefined, unit: undefined }
 * - "Milk per item" → { name: "Milk", size: undefined, unit: undefined }
 *
 * @param itemName - The raw item name (possibly with size at beginning)
 * @param existingSize - Optional existing size field
 * @param existingUnit - Optional existing unit field
 * @returns ParsedItem with cleaned name and extracted size/unit
 */
export function parseItemNameAndSize(
  itemName: string,
  existingSize?: string | null,
  existingUnit?: string | null
) {
  let cleanName = itemName.trim();
  let extractedSize = existingSize?.trim() || undefined;
  let extractedUnit = existingUnit?.trim() || undefined;

  // Validate existing size first
  if (extractedSize && !isValidSize(extractedSize, extractedUnit)) {
    extractedSize = undefined;
    extractedUnit = undefined;
  }

  // Try to extract size from beginning of name
  const match = cleanName.match(SIZE_PATTERN);

  if (match && !extractedSize) {
    const [_, sizeFromName, nameWithoutSize] = match;
    cleanName = nameWithoutSize.trim();
    extractedSize = sizeFromName.trim();

    // Extract unit from the size using robust helper
    extractedUnit = extractUnitFromSize(sizeFromName);
  }

  // CRITICAL: If we have size but no unit, extract unit from size
  if (extractedSize && !extractedUnit) {
    extractedUnit = extractUnitFromSize(extractedSize);
  }

  // CRITICAL: If we still have size but no unit, REJECT the size completely
  if (extractedSize && !extractedUnit) {
    extractedSize = undefined;
  }

  return {
    name: cleanName,
    size: extractedSize,
    unit: extractedUnit,
  };
}

/**
 * Format an item for display with size at the beginning.
 *
 * Examples:
 * - "Milk", "500ml" → "500ml Milk"
 * - "500ml Milk", "500ml" → "500ml Milk" (deduplicated)
 * - "Rice", undefined → "Rice"
 * - "Eggs", "per item" → "Eggs" (vague size filtered out)
 *
 * @param name - The item name
 * @param size - The size (optional)
 * @param unit - The unit (optional)
 * @returns Formatted display string
 */
export function formatItemDisplay(
  name: string,
  size?: string | null,
  unit?: string | null
) {
  // Validate and filter out vague sizes
  if (!isValidSize(size, unit)) {
    return name;
  }

  const normalizedSize = size!.trim();
  const sizeLower = normalizedSize.toLowerCase();

  // Deduplicate: If the name already contains the size, remove it from the name
  // to prevent things like "500ml 500ml Milk"
  let cleanName = name;

  // Extract the numeric part and unit separately for more robust matching
  const sizeMatch = sizeLower.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/i);
  if (sizeMatch) {
    const [_, sizeNum, sizeUnit] = sizeMatch;

    const patterns: RegExp[] = [];

    // Pattern 1: Exact size with optional spaces
    const escapedSize = sizeLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
    patterns.push(new RegExp(`\\b${escapedSize}\\b`, "gi"));

    // Pattern 2: Number + optional trailing letters (catches typos like "650ge")
    if (sizeUnit) {
      patterns.push(new RegExp(`\\b${sizeNum}\\s*${sizeUnit}[a-z]*\\b`, "gi"));
    }

    // Pattern 3: Number + "pk" or "pack" variations
    patterns.push(new RegExp(`\\b${sizeNum}\\s*p[a-z]*\\b`, "gi"));

    // Pattern 4: Number alone at word boundaries
    patterns.push(new RegExp(`\\b${sizeNum}\\b`, "g"));

    // Pattern 5: Parenthetical sizes (e.g., "(6x124g)")
    patterns.push(new RegExp(`\\([^)]*${sizeNum}[^)]*\\)`, "gi"));

    // Apply all patterns to remove duplicates
    for (const pattern of patterns) {
      cleanName = cleanName.replace(pattern, "").trim();
    }

    // Clean up multiple spaces and extra separators
    cleanName = cleanName
      .replace(/\s+/g, " ")
      .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
      .trim();
  } else {
    // If size doesn't match expected pattern, just do a simple replacement
    const escapedSize = sizeLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleanName = name.replace(new RegExp(`\\b${escapedSize}\\b`, "gi"), "").trim();
  }

  // If we ended up with an empty name after deduplication, use original
  if (!cleanName) return name;

  return `${normalizedSize} ${cleanName}`;
}

/**
 * Clean and prepare item data for storage/mutation.
 * Ensures name is clean and size/unit are valid or undefined.
 *
 * CRITICAL: NEVER returns size without unit. Size without unit is UNACCEPTABLE.
 *
 * @param itemName - The raw item name
 * @param size - Optional size field
 * @param unit - Optional unit field
 * @returns ParsedItem ready for storage (size/unit both present or both undefined)
 */
export function cleanItemForStorage(
  itemName: string,
  size?: string | null,
  unit?: string | null
) {
  const parsed = parseItemNameAndSize(itemName, size, unit);

  // CRITICAL: Size without unit is UNACCEPTABLE - reject completely
  if (parsed.size && !parsed.unit) {
    return {
      name: parsed.name,
      size: undefined,
      unit: undefined,
    };
  }

  // Final validation - return undefined for invalid sizes
  if (parsed.size && !isValidSize(parsed.size, parsed.unit)) {
    return {
      name: parsed.name,
      size: undefined,
      unit: undefined,
    };
  }

  // DOUBLE CHECK: Ensure we NEVER return size without unit
  if (parsed.size && !parsed.unit) {
    throw new Error(
      `CRITICAL ERROR: Attempted to store item with size but no unit. Item: "${parsed.name}", Size: "${parsed.size}". This is unacceptable.`
    );
  }

  return parsed;
}
