/**
 * UK Store Normalizer - Barrel Export
 *
 * Re-exports all types, data, and functions from the stores module.
 */

// Types
export type { UKStoreId, StoreType, CuisineId, StoreInfo } from "./types";

// Store data
export { UK_STORES, STRIP_SUFFIXES } from "./storeData";
export { SPECIALTY_STORES } from "./specialtyStores";

// Normalization & lookup functions
export {
  normalizeStoreName,
  getStoreInfo,
  getStoreInfoSafe,
  getAllStores,
  getStoresByType,
  isValidStoreId,
  getAllStoreIds,
  getStoresForCuisines,
  getMainstreamStores,
  getSpecialtyStores,
} from "./normalization";
