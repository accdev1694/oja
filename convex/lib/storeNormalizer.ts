/**
 * UK Store Normalizer Utility
 *
 * Normalizes receipt store names to canonical store IDs and provides
 * store metadata (brand colors, display names, types) for the UK market.
 *
 * Used by:
 * - Receipt parsing (normalize raw store names)
 * - Store comparison UI (display colors, names)
 * - Insights/analytics (group by normalized store)
 * - Onboarding (store selection)
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Canonical store identifiers for UK retailers.
 * These are the normalized IDs stored in the database.
 */
export type UKStoreId =
  | "tesco"
  | "sainsburys"
  | "asda"
  | "aldi"
  | "morrisons"
  | "lidl"
  | "coop"
  | "waitrose"
  | "marks"
  | "iceland"
  | "nisa"
  | "spar"
  | "londis"
  | "costcutter"
  | "premier"
  | "onestop"
  | "budgens"
  | "farmfoods"
  | "costco"
  | "booker"
  // Specialty / ethnic stores
  | "wingyip"
  | "loonfung"
  | "seewoo"
  | "hoo_hing"
  | "asian_supermarket"
  | "african_grocery"
  | "southasian_grocery"
  | "middleeastern_grocery"
  | "latin_grocery";

/**
 * Store type categories for grouping and filtering.
 */
export type StoreType =
  | "supermarket"
  | "discounter"
  | "convenience"
  | "premium"
  | "frozen"
  | "wholesale"
  | "specialty";

/**
 * Cuisine identifiers matching the onboarding cuisine-selection screen.
 */
export type CuisineId =
  | "british"
  | "nigerian"
  | "indian"
  | "chinese"
  | "italian"
  | "pakistani"
  | "caribbean"
  | "mexican"
  | "middle-eastern"
  | "japanese"
  | "korean"
  | "thai"
  | "vietnamese"
  | "ethiopian";

/**
 * Complete store information including display metadata and aliases.
 */
export interface StoreInfo {
  /** Canonical lowercase ID (matches UKStoreId) */
  id: UKStoreId;
  /** Human-readable display name */
  displayName: string;
  /** Brand hex color for UI theming */
  color: string;
  /** Store category */
  type: StoreType;
  /** All variations/aliases that should match to this store */
  aliases: string[];
  /** Approximate UK market share (for sorting) */
  marketShare: number;
  /** Cuisines this specialty store is relevant for */
  cuisines?: CuisineId[];
}

// -----------------------------------------------------------------------------
// Store Data
// -----------------------------------------------------------------------------

/**
 * Complete UK store database.
 * Sorted by market share (descending) for display purposes.
 *
 * Market share data approximate as of 2024.
 */
const UK_STORES: readonly StoreInfo[] = [
  {
    id: "tesco",
    displayName: "Tesco",
    color: "#00539F",
    type: "supermarket",
    marketShare: 27,
    aliases: [
      "tesco",
      "tesco express",
      "tesco extra",
      "tesco metro",
      "tesco superstore",
      "tesco stores",
      "tesco stores ltd",
      "tesco plc",
      "tesco home plus",
      "tesco petrol",
    ],
  },
  {
    id: "sainsburys",
    displayName: "Sainsbury's",
    color: "#F06C00",
    type: "supermarket",
    marketShare: 15,
    aliases: [
      "sainsbury's",
      "sainsburys",
      "sainsbury",
      "sainsbury's local",
      "sainsburys local",
      "sainsbury local",
      "j sainsbury",
      "j sainsbury plc",
      "sainsbury's supermarket",
      "sainsburys supermarket",
    ],
  },
  {
    id: "asda",
    displayName: "Asda",
    color: "#7AB51D",
    type: "supermarket",
    marketShare: 14,
    aliases: [
      "asda",
      "asda stores",
      "asda supermarket",
      "asda superstore",
      "asda express",
      "asda living",
      "asda stores ltd",
      "asda supercentre",
    ],
  },
  {
    id: "aldi",
    displayName: "Aldi",
    color: "#0056A4",
    type: "discounter",
    marketShare: 10,
    aliases: [
      "aldi",
      "aldi stores",
      "aldi uk",
      "aldi stores ltd",
      "aldi sud",
      "aldi south",
    ],
  },
  {
    id: "morrisons",
    displayName: "Morrisons",
    color: "#007A3C",
    type: "supermarket",
    marketShare: 9,
    aliases: [
      "morrisons",
      "morrison's",
      "wm morrisons",
      "wm morrison",
      "morrisons supermarket",
      "morrisons store",
      "morrisons daily",
      "morrisons supermarkets",
      "wm morrison supermarkets",
    ],
  },
  {
    id: "lidl",
    displayName: "Lidl",
    color: "#0050AA",
    type: "discounter",
    marketShare: 7,
    aliases: [
      "lidl",
      "lidl uk",
      "lidl stores",
      "lidl gb",
      "lidl great britain",
      "lidl ltd",
    ],
  },
  {
    id: "coop",
    displayName: "Co-op",
    color: "#00B2A9",
    type: "convenience",
    marketShare: 5,
    aliases: [
      "co-op",
      "coop",
      "co op",
      "the co-operative",
      "the cooperative",
      "cooperative food",
      "co-op food",
      "co-operative food",
      "coop food",
      "the co-op",
      "midcounties co-op",
      "midcounties coop",
      "central co-op",
      "southern co-op",
    ],
  },
  {
    id: "waitrose",
    displayName: "Waitrose",
    color: "#006C4C",
    type: "premium",
    marketShare: 5,
    aliases: [
      "waitrose",
      "waitrose & partners",
      "waitrose and partners",
      "little waitrose",
      "waitrose food",
      "john lewis waitrose",
    ],
  },
  {
    id: "marks",
    displayName: "M&S Food",
    color: "#000000",
    type: "premium",
    marketShare: 3,
    aliases: [
      "m&s",
      "marks & spencer",
      "marks and spencer",
      "m&s food",
      "m & s",
      "marks",
      "marks spencer",
      "m&s foodhall",
      "m&s simply food",
      "marks & spencer food",
      "marks and spencer food",
      "m and s",
    ],
  },
  {
    id: "iceland",
    displayName: "Iceland",
    color: "#E31837",
    type: "frozen",
    marketShare: 2,
    aliases: [
      "iceland",
      "iceland foods",
      "iceland stores",
      "the food warehouse",
      "food warehouse",
      "iceland food warehouse",
    ],
  },
  {
    id: "nisa",
    displayName: "Nisa Local",
    color: "#ED1C24",
    type: "convenience",
    marketShare: 1,
    aliases: [
      "nisa",
      "nisa local",
      "nisa extra",
      "nisa retail",
      "nisa today's",
      "nisa todays",
    ],
  },
  {
    id: "spar",
    displayName: "Spar",
    color: "#DA291C",
    type: "convenience",
    marketShare: 1,
    aliases: [
      "spar",
      "spar uk",
      "spar express",
      "spar store",
      "spar stores",
      "eurospar",
    ],
  },
  {
    id: "londis",
    displayName: "Londis",
    color: "#E31837",
    type: "convenience",
    marketShare: 0.5,
    aliases: ["londis", "londis store", "londis stores", "londis retail"],
  },
  {
    id: "costcutter",
    displayName: "Costcutter",
    color: "#EE2A24",
    type: "convenience",
    marketShare: 0.5,
    aliases: [
      "costcutter",
      "costcutter supermarkets",
      "costcutter store",
      "cost cutter",
    ],
  },
  {
    id: "premier",
    displayName: "Premier",
    color: "#6B2C91",
    type: "convenience",
    marketShare: 0.5,
    aliases: [
      "premier",
      "premier stores",
      "premier store",
      "premier convenience",
      "premier express",
    ],
  },
  {
    id: "onestop",
    displayName: "One Stop",
    color: "#E4002B",
    type: "convenience",
    marketShare: 0.5,
    aliases: [
      "one stop",
      "onestop",
      "one-stop",
      "one stop stores",
      "one stop shop",
    ],
  },
  {
    id: "budgens",
    displayName: "Budgens",
    color: "#78BE20",
    type: "convenience",
    marketShare: 0.5,
    aliases: ["budgens", "budgen", "budgens store", "budgens local"],
  },
  {
    id: "farmfoods",
    displayName: "Farmfoods",
    color: "#009639",
    type: "frozen",
    marketShare: 0.5,
    aliases: [
      "farmfoods",
      "farm foods",
      "farmfoods ltd",
      "farmfoods store",
      "farmfoods frozen",
    ],
  },
  {
    id: "costco",
    displayName: "Costco",
    color: "#005DAA",
    type: "wholesale",
    marketShare: 0.5,
    aliases: [
      "costco",
      "costco wholesale",
      "costco uk",
      "costco warehouse",
      "costco membership",
    ],
  },
  {
    id: "booker",
    displayName: "Booker",
    color: "#00529B",
    type: "wholesale",
    marketShare: 0.5,
    aliases: [
      "booker",
      "booker wholesale",
      "booker cash & carry",
      "booker cash and carry",
      "makro",
      "booker makro",
    ],
  },

  // ── Specialty / Ethnic Stores ──────────────────────────────────────────────
  {
    id: "wingyip",
    displayName: "Wing Yip",
    color: "#CC0000",
    type: "specialty",
    marketShare: 0.1,
    cuisines: ["chinese", "japanese", "korean", "thai", "vietnamese"],
    aliases: [
      "wing yip",
      "wing yip superstore",
      "wing yip oriental",
      "wing yip chinese",
      "wing yip birmingham",
      "wing yip manchester",
      "wing yip croydon",
      "wing yip cricklewood",
    ],
  },
  {
    id: "loonfung",
    displayName: "Loon Fung",
    color: "#D4262C",
    type: "specialty",
    marketShare: 0.1,
    cuisines: ["chinese", "japanese", "korean", "thai", "vietnamese"],
    aliases: [
      "loon fung",
      "loon fung supermarket",
      "loon fung chinese",
      "loon fung chinese supermarket",
    ],
  },
  {
    id: "seewoo",
    displayName: "SeeWoo",
    color: "#E31937",
    type: "specialty",
    marketShare: 0.1,
    cuisines: ["chinese", "japanese", "korean", "thai", "vietnamese"],
    aliases: [
      "seewoo",
      "see woo",
      "seewoo supermarket",
      "see woo chinese",
      "seewoo oriental",
      "see woo oriental",
    ],
  },
  {
    id: "hoo_hing",
    displayName: "Hoo Hing",
    color: "#B22222",
    type: "specialty",
    marketShare: 0.1,
    cuisines: ["chinese", "japanese", "korean", "thai", "vietnamese"],
    aliases: [
      "hoo hing",
      "hoohing",
      "hoo hing wholesale",
      "hoo hing chinese",
      "hoo hing oriental",
    ],
  },
  {
    id: "asian_supermarket",
    displayName: "Asian Store",
    color: "#FF6B35",
    type: "specialty",
    marketShare: 0.1,
    cuisines: ["chinese", "japanese", "korean", "thai", "vietnamese"],
    aliases: [
      "asian supermarket",
      "oriental supermarket",
      "oriental grocery",
      "asian grocery",
      "chinese supermarket",
      "chinese grocery",
      "asian food store",
      "oriental store",
      "far east supermarket",
    ],
  },
  {
    id: "african_grocery",
    displayName: "African Store",
    color: "#009639",
    type: "specialty",
    marketShare: 0.1,
    cuisines: ["nigerian", "ethiopian", "caribbean"],
    aliases: [
      "african grocery",
      "african food store",
      "african store",
      "african supermarket",
      "afro caribbean store",
      "afro caribbean grocery",
      "african food market",
      "west african grocery",
      "east african grocery",
      "nigerian grocery",
      "nigerian store",
      "nigerian food store",
      "african market",
    ],
  },
  {
    id: "southasian_grocery",
    displayName: "Indian Store",
    color: "#FF9933",
    type: "specialty",
    marketShare: 0.1,
    cuisines: ["indian", "pakistani"],
    aliases: [
      "south asian grocery",
      "indian grocery",
      "indian store",
      "indian supermarket",
      "pakistani grocery",
      "pakistani store",
      "desi store",
      "desi grocery",
      "bangla grocery",
      "bangladeshi grocery",
      "sri lankan grocery",
      "asian grocery store",
    ],
  },
  {
    id: "middleeastern_grocery",
    displayName: "Middle Eastern Store",
    color: "#006847",
    type: "specialty",
    marketShare: 0.1,
    cuisines: ["middle-eastern"],
    aliases: [
      "middle eastern grocery",
      "middle eastern store",
      "arabic grocery",
      "arab store",
      "halal grocery",
      "persian grocery",
      "turkish grocery",
      "turkish store",
      "lebanese grocery",
      "mediterranean grocery",
      "halal store",
      "halal supermarket",
    ],
  },
  {
    id: "latin_grocery",
    displayName: "Latin American Store",
    color: "#CE1126",
    type: "specialty",
    marketShare: 0.1,
    cuisines: ["mexican"],
    aliases: [
      "latin grocery",
      "latin american grocery",
      "latin american store",
      "mexican grocery",
      "mexican store",
      "latino store",
      "latin supermarket",
      "south american grocery",
    ],
  },
] as const;

/**
 * Common store format suffixes to strip when normalizing.
 * These are removed before alias matching to improve match rates.
 */
const STRIP_SUFFIXES = [
  "express",
  "extra",
  "metro",
  "local",
  "superstore",
  "supermarket",
  "stores",
  "store",
  "ltd",
  "plc",
  "uk",
  "gb",
  "oriental",
  "grocery",
  "wholesale",
];

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
// Core Functions
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
