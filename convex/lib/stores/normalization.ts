/**
 * Store Normalization & Lookup Functions
 *
 * Provides O(1) lookup maps, the core normalizeStoreName algorithm,
 * and all query/filter helpers (getStoreInfo, getAllStores, etc.).
 */

import { UKStoreId, StoreType, StoreInfo } from "./types";
import { UK_STORES, STRIP_SUFFIXES } from "./storeData";

// -----------------------------------------------------------------------------
// Lookup Maps (built once)
// -----------------------------------------------------------------------------

/** Map from alias to store ID for O(1) lookup */
const aliasToStoreId = new Map<string, UKStoreId>();

/** Map from store ID to full store info for O(1) lookup */
const storeIdToInfo = new Map<UKStoreId, StoreInfo>();

// Initialize lookup maps
for (const store of UK_STORES) {
  storeIdToInfo.set(store.id, store);
  for (const alias of store.aliases) {
    aliasToStoreId.set(alias.toLowerCase(), store.id);
  }
}

// -----------------------------------------------------------------------------
// Core Normalization
// -----------------------------------------------------------------------------

/**
 * Normalizes a raw store name (from receipt or user input) to a canonical UKStoreId.
 *
 * Algorithm:
 * 1. Lowercase and trim the input
 * 2. Try exact match against aliases
 * 3. Strip common suffixes (express, metro, local, etc.) and retry
 * 4. Try matching against store IDs directly
 * 5. Return null if no match found
 *
 * @param raw - Raw store name from receipt or user input
 * @returns Normalized UKStoreId or null if store not recognized
 *
 * @example
 * normalizeStoreName("TESCO EXPRESS") // => "tesco"
 * normalizeStoreName("Sainsbury's Local") // => "sainsburys"
 * normalizeStoreName("M&S Simply Food") // => "marks"
 * normalizeStoreName("Unknown Shop") // => null
 */
export function normalizeStoreName(raw: string): UKStoreId | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  // Step 1: Clean and lowercase
  let cleaned = raw.toLowerCase().trim();

  // Remove common noise characters
  cleaned = cleaned
    .replace(/[.,;:!?'"]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();

  if (!cleaned) {
    return null;
  }

  // Step 2: Try exact alias match
  const exactMatch = aliasToStoreId.get(cleaned);
  if (exactMatch) {
    return exactMatch;
  }

  // Step 3: Strip suffixes and try again
  let stripped = cleaned;
  for (const suffix of STRIP_SUFFIXES) {
    const pattern = new RegExp(`\\s+${suffix}$`, "i");
    stripped = stripped.replace(pattern, "").trim();
  }

  if (stripped !== cleaned) {
    const strippedMatch = aliasToStoreId.get(stripped);
    if (strippedMatch) {
      return strippedMatch;
    }
  }

  // Step 4: Try matching against store IDs directly
  for (const store of UK_STORES) {
    if (cleaned.includes(store.id) || stripped.includes(store.id)) {
      return store.id;
    }
  }

  // Step 5: Try partial alias matching (store name appears in input)
  for (const store of UK_STORES) {
    for (const alias of store.aliases) {
      // Only match if the alias is at the start of the input
      // This prevents false matches like "asda" in "hasda"
      if (cleaned.startsWith(alias) || stripped.startsWith(alias)) {
        return store.id;
      }
    }
  }

  // No match found
  return null;
}

// -----------------------------------------------------------------------------
// Store Info Lookups
// -----------------------------------------------------------------------------

/**
 * Gets complete store information for a given store ID.
 *
 * @param id - Canonical store ID
 * @returns StoreInfo object
 * @throws Error if store ID not found (should never happen with valid UKStoreId)
 *
 * @example
 * getStoreInfo("tesco")
 * // => { id: "tesco", displayName: "Tesco", color: "#00539F", ... }
 */
export function getStoreInfo(id: UKStoreId): StoreInfo {
  const info = storeIdToInfo.get(id);
  if (!info) {
    throw new Error(`Unknown store ID: ${id}`);
  }
  return info;
}

/**
 * Gets complete store information for a given store ID, or null if not found.
 * Safe version of getStoreInfo that doesn't throw.
 *
 * @param id - Store ID to look up (may or may not be valid)
 * @returns StoreInfo object or null if not found
 *
 * @example
 * getStoreInfoSafe("tesco") // => StoreInfo
 * getStoreInfoSafe("unknown") // => null
 */
export function getStoreInfoSafe(id: string): StoreInfo | null {
  return storeIdToInfo.get(id as UKStoreId) ?? null;
}

/**
 * Returns all UK stores sorted by market share (descending).
 * Use this for store selection UIs, dropdowns, etc.
 *
 * @returns Array of all StoreInfo objects, largest market share first
 *
 * @example
 * getAllStores()[0].displayName // => "Tesco" (27% market share)
 */
export function getAllStores(): StoreInfo[] {
  // Already sorted by market share in UK_STORES definition
  return [...UK_STORES];
}

/**
 * Returns stores filtered by type.
 *
 * @param type - Store type to filter by
 * @returns Array of StoreInfo objects of the specified type
 *
 * @example
 * getStoresByType("discounter") // => [Aldi, Lidl]
 */
export function getStoresByType(type: StoreType): StoreInfo[] {
  return UK_STORES.filter((store) => store.type === type);
}

/**
 * Checks if a string is a valid UKStoreId.
 *
 * @param id - String to check
 * @returns True if id is a valid UKStoreId
 *
 * @example
 * isValidStoreId("tesco") // => true
 * isValidStoreId("unknown") // => false
 */
export function isValidStoreId(id: string): id is UKStoreId {
  return storeIdToInfo.has(id as UKStoreId);
}

/**
 * Gets all valid store IDs.
 * Useful for validation and type guards.
 *
 * @returns Array of all valid UKStoreId values
 */
export function getAllStoreIds(): UKStoreId[] {
  return UK_STORES.map((store) => store.id);
}

// -----------------------------------------------------------------------------
// Cuisine-to-Store Mapping
// -----------------------------------------------------------------------------

/**
 * Returns specialty stores relevant to the given cuisines (deduplicated).
 */
export function getStoresForCuisines(cuisines: string[]): StoreInfo[] {
  const seen = new Set<UKStoreId>();
  const result: StoreInfo[] = [];

  for (const store of UK_STORES) {
    if (!store.cuisines || store.cuisines.length === 0) continue;
    const matches = store.cuisines.some((c) => cuisines.includes(c));
    if (matches && !seen.has(store.id)) {
      seen.add(store.id);
      result.push(store);
    }
  }

  return result;
}

/**
 * Returns all mainstream (non-specialty) stores.
 */
export function getMainstreamStores(): StoreInfo[] {
  return UK_STORES.filter((s) => s.type !== "specialty");
}

/**
 * Returns all specialty stores.
 */
export function getSpecialtyStores(): StoreInfo[] {
  return UK_STORES.filter((s) => s.type === "specialty");
}
