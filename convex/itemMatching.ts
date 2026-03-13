/**
 * Item Matching Mutations & Queries
 *
 * Handles the user confirmation flow for receipt ↔ product matching.
 *
 * Barrel file - re-exports from modular sub-files.
 */

export {
  getPendingMatches,
  getMyPendingMatches,
  getPendingMatchCount,
  identifyUnplannedItems,
} from "./itemMatching/queries";

export {
  processReceiptMatching,
  confirmMatch,
  skipMatch,
  markNoMatch,
  skipAllPendingMatches,
} from "./itemMatching/mutations";
