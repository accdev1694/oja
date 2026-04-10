/**
 * Item Variants - Barrel file
 *
 * Manages product size/variant catalog with community enrichment.
 * Split into sub-modules:
 *   - queries.ts:   getByBaseItem, getWithPrices, getSizesForStore
 *   - seeding.ts:   getPopularForSeeding
 *   - mutations.ts: upsert, enrichFromScan, bulkUpsert
 *   - admin.ts:     mergeVariants
 */
export { getByBaseItem, getWithPrices, getSizesForStore } from "./itemVariants/queries";
export { getPopularForSeeding } from "./itemVariants/seeding";
export { upsert, enrichFromScan, bulkUpsert } from "./itemVariants/mutations";
export { mergeVariants, backfillVariantSizes } from "./itemVariants/admin";
