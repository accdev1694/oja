/**
 * Types for the UK Store Normalizer system.
 *
 * Defines canonical store identifiers, store categories, cuisine mappings,
 * and the StoreInfo shape used throughout the app.
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
 *
 * Region-based taxonomy: grouped by shared pantry staples where possible,
 * country-level only where ingredients are meaningfully distinct AND the
 * UK diaspora community is large enough to warrant it.
 */
export type CuisineId =
  | "british"
  | "west-african"
  | "east-african"
  | "southern-african"
  | "north-african"
  | "caribbean"
  | "south-asian"
  | "chinese"
  | "japanese"
  | "korean"
  | "southeast-asian"
  | "middle-eastern"
  | "turkish"
  | "mediterranean"
  | "eastern-european"
  | "french"
  | "latin-american";

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
