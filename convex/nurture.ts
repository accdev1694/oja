// Barrel file — re-exports from nurture/ subdirectory
// Preserves api.nurture.* and internal.nurture.* routing

export { NURTURE_SEQUENCE, formatTrialMessage } from "./nurture/config";
export { getNurtureStatus, hasReceivedNurture, getTrialInfo } from "./nurture/queries";
export { recordActivity, markNurtureSent } from "./nurture/mutations";
export {
  getUsersForNurture,
  getUserActivityStats,
  sendNurtureMessage,
  processNurtureSequence,
} from "./nurture/internal";
