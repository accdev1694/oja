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
const SIZE_END_PATTERN = /^(.+?)\s+(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|pt|pint|pints|pack|pk|x|oz)s?)$/i;

export interface ParsedItem {
  name: string;
  size?: string;
  unit?: string;
}

// Max characters for the final display string "{size} {name}"
const MAX_DISPLAY_CHARS = 40;

// Pattern to find a metric measurement anywhere in a string
const METRIC_EXTRACT = /(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|pt|pint|pints|pack|pk|x|oz))/i;

/**
 * Clean duplicate/imperial measurements from a size string.
 * Handles both metric-first and imperial-first patterns:
 * "227g (8oz)" → "227g", "347ml/12 fl oz" → "347ml",
 * "8 FL OZ / 237 mL" → "237ml", "500g / 1.1lb" → "500g"
 */
function cleanDuplicateUnits(size: string) {
  let cleaned = size.trim();

  // Strip parenthetical duplicates: "227g (8oz)" → "227g"
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/, "").trim();

  // If the string contains a slash or pipe separator, find the metric measurement
  if (/[/|]/.test(cleaned)) {
    // Try metric-first: "347ml/12 fl oz" → "347ml"
    const metricFirst = cleaned.match(/^(\d+(?:\.\d+)?\s*(?:ml|l|g|kg|pt|pint|pints|pack|pk|x|oz))\s*[/|]/i);
    if (metricFirst) {
      return metricFirst[1].trim();
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
function stripDualUnitFromName(name: string) {
  // Pattern: optional number+imperial, separator, number+metric, then the real name
  // e.g. "8 FL OZ / 237 mL Leave-in Conditioning Treatment"
  const dualUnitPrefix = name.match(
    /^\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|oz|lb|lbs?)\s*[/|]\s*(\d+(?:\.\d+)?\s*(?:ml|l|g|kg))\s+(.+)$/i
  );
  if (dualUnitPrefix) {
    return { cleaned: dualUnitPrefix[2].trim(), size: dualUnitPrefix[1].trim().toLowerCase() };
  }

  // Reverse: metric first, then imperial: "237 mL / 8 FL OZ Leave-in..."
  const dualUnitPrefixReverse = name.match(
    /^(\d+(?:\.\d+)?\s*(?:ml|l|g|kg))\s*[/|]\s*\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|oz|lb|lbs?)\s+(.+)$/i
  );
  if (dualUnitPrefixReverse) {
    return { cleaned: dualUnitPrefixReverse[2].trim(), size: dualUnitPrefixReverse[1].trim().toLowerCase() };
  }

  return null;
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

  // Strip duplicate/imperial units from size: "227g (8oz)" → "227g"
  if (extractedSize) {
    extractedSize = cleanDuplicateUnits(extractedSize);
  }

  // Try to extract size from name if not already provided
  if (!extractedSize) {
    // Try beginning first: "500ml Milk"
    const startMatch = cleanName.match(SIZE_PATTERN);
    if (startMatch) {
      const [_, sizeFromName, nameWithoutSize] = startMatch;
      cleanName = nameWithoutSize.trim();
      extractedSize = sizeFromName.trim();
    } else {
      // Try dual-unit prefix: "8 FL OZ / 237 mL Leave-in Conditioner"
      const dualUnit = stripDualUnitFromName(cleanName);
      if (dualUnit) {
        cleanName = dualUnit.cleaned;
        extractedSize = dualUnit.size;
      } else {
        // Fallback: try end of name: "Milk 500ml"
        const endMatch = cleanName.match(SIZE_END_PATTERN);
        if (endMatch) {
          const [_, nameWithoutSize, sizeFromName] = endMatch;
          cleanName = nameWithoutSize.trim();
          extractedSize = sizeFromName.trim();
        }
      }
    }
  } else {
    // Size already provided — strip it from the name if AI embedded it
    const startMatch = cleanName.match(SIZE_PATTERN);
    if (startMatch) {
      cleanName = startMatch[2].trim();
    } else {
      // Try dual-unit prefix in name: "8 FL OZ / 237 mL Leave-in Conditioner"
      const dualUnit = stripDualUnitFromName(cleanName);
      if (dualUnit) {
        cleanName = dualUnit.cleaned;
      } else {
        const endMatch = cleanName.match(SIZE_END_PATTERN);
        if (endMatch) {
          cleanName = endMatch[1].trim();
        }
      }
    }
  }

  // CRITICAL: If we have size but no unit, try to extract unit from size
  if (extractedSize && !extractedUnit) {
    extractedUnit = extractUnitFromSize(extractedSize);
  }

  // Final validation - if still invalid, clear it
  if (extractedSize && !isValidSize(extractedSize, extractedUnit)) {
    extractedSize = undefined;
    extractedUnit = undefined;
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
  // Clean size of dual units before validation: "8 FL OZ / 237 mL" → "237ml"
  let cleanedSize = size ? cleanDuplicateUnits(size) : size;
  let cleanedUnit = unit;
  if (cleanedSize && !cleanedUnit) {
    cleanedUnit = extractUnitFromSize(cleanedSize) || null;
  }

  // Validate and filter out vague sizes
  if (!isValidSize(cleanedSize, cleanedUnit)) {
    // Even without valid size, strip dual-unit prefix from name for display
    const stripped = stripDualUnitFromName(name);
    if (stripped) return stripped.cleaned;
    return name;
  }

  const normalizedSize = cleanedSize!.trim();
  const sizeLower = normalizedSize.toLowerCase();

  // Strip dual-unit prefixes from name (old DB data): "8 FL OZ / 237 mL Product" → "Product"
  let cleanName = name;
  const dualStrip = stripDualUnitFromName(cleanName);
  if (dualStrip) {
    cleanName = dualStrip.cleaned;
  }

  // Extract the numeric part and unit separately for more robust matching
  const sizeMatch = sizeLower.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/i);
  if (sizeMatch) {
    const [_, sizeNum, sizeUnit] = sizeMatch;

    const patterns: RegExp[] = [];

    // Pattern 1: Parenthetical sizes (e.g., "(6x124g)") - PRIORITY
    patterns.push(new RegExp(`\\([^)]*${sizeNum}[^)]*\\)`, "gi"));

    // Pattern 2: Exact size with optional spaces
    const escapedSize = sizeLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
    patterns.push(new RegExp(`\\b${escapedSize}\\b`, "gi"));

    // Pattern 3: Number + optional trailing letters (catches typos like "650ge")
    if (sizeUnit) {
      patterns.push(new RegExp(`\\b${sizeNum}\\s*${sizeUnit}[a-z]*\\b`, "gi"));
    }

    // Pattern 4: Number + "pk" or "pack" variations
    patterns.push(new RegExp(`\\b${sizeNum}\\s*p[a-z]*\\b`, "gi"));

    // Pattern 5: Number alone at word boundaries
    patterns.push(new RegExp(`\\b${sizeNum}\\b`, "g"));

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

  // Hard cap: truncate name (never size) to fit MAX_DISPLAY_CHARS
  const full = `${normalizedSize} ${cleanName}`;
  if (full.length > MAX_DISPLAY_CHARS) {
    const maxNameLen = MAX_DISPLAY_CHARS - normalizedSize.length - 1; // 1 for space
    if (maxNameLen > 3) {
      return `${normalizedSize} ${cleanName.slice(0, maxNameLen - 1).trimEnd()}\u2026`;
    }
  }

  return full;
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
