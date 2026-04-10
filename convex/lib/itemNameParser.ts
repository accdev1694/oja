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
 *
 * Low-level helpers (pattern constants, canonicalisation, dual-unit stripping)
 * live in `./itemNameParserHelpers.ts` to keep this file under the 400-line
 * limit (CLAUDE.md rule #10).
 */

import {
  VAGUE_SIZES,
  VALID_UNITS,
  SIZE_PATTERN,
  SIZE_END_PATTERN,
  MAX_DISPLAY_CHARS,
  canonicaliseBareNumberSize,
  cleanDuplicateUnits,
  stripDualUnitFromName,
  extractUnitFromSize,
} from "./itemNameParserHelpers";

export interface ParsedItem {
  name: string;
  size?: string;
  unit?: string;
}

/**
 * Check if a size is valid (meaningful measurement with number + unit).
 * Rejects vague defaults like "per item", "each", etc.
 *
 * CRITICAL: Size without unit is UNACCEPTABLE and will be rejected.
 */
export function isValidSize(size?: string | null, unit?: string | null): boolean {
  // CRITICAL: Both size AND unit are required
  if (!size || !unit) return false;

  const normalizedSize = size.toLowerCase().trim();
  const normalizedUnit = unit.toLowerCase().trim();

  // Reject vague sizes
  if ((VAGUE_SIZES as readonly string[]).includes(normalizedSize)) return false;

  // Reject if unit is not valid
  if (!(VALID_UNITS as readonly string[]).includes(normalizedUnit)) return false;

  // Must contain a number
  const hasNumber = /\d/.test(size);
  if (!hasNumber) return false;

  // Reject zero or negative sizes
  const numericValue = parseFloat(normalizedSize);
  if (!isNaN(numericValue) && numericValue <= 0) return false;

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
): ParsedItem {
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
      const [, sizeFromName, nameWithoutSize] = startMatch;
      cleanName = nameWithoutSize.trim();
      extractedSize = sizeFromName.trim();
      // Clean residual imperial/dual-unit prefix from name after SIZE_PATTERN extraction
      // e.g., "237 mL / 8 FL OZ Leave-in Conditioner" → size "237 mL", name "/ 8 FL OZ Leave-in Conditioner"
      // Strip the separator + imperial measurement leaving just the product name
      const residualImperial = cleanName.match(
        /^[/|]\s*\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|oz|lb|lbs?|pt|pints?)\s+(.+)$/i
      );
      if (residualImperial) {
        cleanName = residualImperial[1].trim();
      }
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
          const [, nameWithoutSize, sizeFromName] = endMatch;
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
): string {
  // Clean size of dual units before validation: "8 FL OZ / 237 mL" → "237ml"
  let cleanedSize = size ? cleanDuplicateUnits(size) : size;
  let cleanedUnit = unit;
  if (cleanedSize && !cleanedUnit) {
    cleanedUnit = extractUnitFromSize(cleanedSize) || null;
  }

  // Heal legacy rows where size="250" and unit="g" were stored separately:
  // concatenate them into "250g" so the display shows "250g Butter" instead
  // of "250 Butter". Only touches bare-number sizes — shapes like "500ml" or
  // "237 ml" are left alone so existing dedup/format logic keeps working.
  // Track whether we canonicalised so we can also strip the leftover bare
  // number from the name below (otherwise "500 Milk" + "500"/"ml" renders
  // as "500ml 500 Milk" because the dedup patterns only match "500ml" etc).
  let canonicalisedBareNumber: string | null = null;
  if (cleanedSize && cleanedUnit) {
    const canonical = canonicaliseBareNumberSize(cleanedSize, cleanedUnit);
    if (canonical) {
      canonicalisedBareNumber = cleanedSize.trim();
      cleanedSize = canonical.size;
      cleanedUnit = canonical.unit;
    }
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
  // Capture the post-dual-strip name so the empty-name fallback below
  // doesn't fall back to the raw (possibly still-dirty) argument.
  const dualStrippedName = cleanName;

  // If the caller passed a bare-number size (pre-canonicalisation), strip
  // any leading bare number from the name so we don't render "500ml 500 Milk".
  // Narrow to leading position + whitespace boundary so arbitrary digits
  // inside a product name (e.g. "Heinz 57 Sauce") aren't touched.
  if (canonicalisedBareNumber) {
    const bareEsc = canonicalisedBareNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleanName = cleanName.replace(new RegExp(`^${bareEsc}\\s+`), "").trim();
  }

  // Extract the numeric part and unit separately for more robust matching
  const sizeMatch = sizeLower.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/i);
  if (sizeMatch) {
    const [, sizeNum, sizeUnit] = sizeMatch;

    // Early exit: skip regex dedup if name doesn't contain the size number
    if (cleanName.includes(sizeNum)) {
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

      // Pattern 4: Number + "pk" or "pack" variations only (not arbitrary p-words)
      patterns.push(new RegExp(`\\b${sizeNum}\\s*(?:pk|pack)s?\\b`, "gi"));

      // Apply all patterns to remove duplicates
      for (const pattern of patterns) {
        cleanName = cleanName.replace(pattern, "").trim();
      }

      // Clean up multiple spaces and extra separators
      cleanName = cleanName
        .replace(/\s+/g, " ")
        .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
        .trim();
    }
  } else {
    // If size doesn't match expected pattern, just do a simple replacement.
    // Operate on the dual-stripped name so we don't re-introduce prefixes
    // that were already cleaned above.
    const escapedSize = sizeLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleanName = cleanName.replace(new RegExp(`\\b${escapedSize}\\b`, "gi"), "").trim();
  }

  // If we ended up with an empty name after deduplication, fall back to
  // the post-dual-strip name (never the raw arg — that could still contain
  // an ugly "8 FL OZ / 237 mL ..." prefix).
  if (!cleanName) return dualStrippedName || name;

  // Hard cap: truncate name (never size) to fit MAX_DISPLAY_CHARS
  const full = `${normalizedSize} ${cleanName}`;
  if (full.length > MAX_DISPLAY_CHARS) {
    const maxNameLen = MAX_DISPLAY_CHARS - normalizedSize.length - 1; // 1 for space
    if (maxNameLen > 3) {
      return `${normalizedSize} ${cleanName.slice(0, maxNameLen - 1).trimEnd()}\u2026`;
    }
    // Size alone exceeds or nearly exceeds cap — return size only, truncated if needed
    if (normalizedSize.length > MAX_DISPLAY_CHARS) {
      return `${normalizedSize.slice(0, MAX_DISPLAY_CHARS - 1)}\u2026`;
    }
    return normalizedSize;
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
): ParsedItem {
  const parsed = parseItemNameAndSize(itemName, size, unit);

  // CRITICAL: Size without unit is UNACCEPTABLE - reject completely
  if (parsed.size && !parsed.unit) {
    return {
      name: parsed.name,
      size: undefined,
      unit: undefined,
    };
  }

  // Enforce invariant: unit without size is meaningless — clear both
  if (!parsed.size && parsed.unit) {
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

  // Canonicalize bare-number sizes so "250" + "g" is stored as "250g".
  // Without this, legacy writers (itemVariants) populate defaultSize with a
  // bare number, and the display layer renders "250 Butter" — confusing.
  if (parsed.size && parsed.unit) {
    const canonical = canonicaliseBareNumberSize(parsed.size, parsed.unit);
    if (canonical) {
      return {
        name: parsed.name,
        size: canonical.size,
        unit: canonical.unit,
      };
    }
  }

  // Normalize size casing for consistency (e.g., "500ML" → "500ml")
  if (parsed.size) {
    return {
      name: parsed.name,
      size: parsed.size.toLowerCase(),
      unit: parsed.unit?.toLowerCase(),
    };
  }

  return parsed;
}
