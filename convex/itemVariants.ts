/**
 * Item Variants - Barrel file
 *
 * Manages product size/variant catalog with community enrichment.
 * Split into sub-modules:
 *   - queries.ts:   getByBaseItem, getWithPrices, getSizesForStore, getPopularForSeeding
 *   - mutations.ts: upsert, enrichFromScan, bulkUpsert
 *   - admin.ts:     mergeVariants
 */
export { getByBaseItem, getWithPrices, getSizesForStore, getPopularForSeeding } from "./itemVariants/queries";
export { upsert, enrichFromScan, bulkUpsert } from "./itemVariants/mutations";
export { mergeVariants } from "./itemVariants/admin";
