/**
 * Users module - barrel file
 *
 * Re-exports all user functions from sub-modules.
 * Convex maps this file to `api.users.*` and `internal.users.*`.
 */

// Core CRUD queries and mutations (getCurrent, getOrCreate, getByClerkId, getById, update, etc.)
export {
  syncMfaStatus,
  getOrCreate,
  getCurrent,
  getByClerkId,
  internalGetByClerkId,
  getById,
  update,
  updateNotificationSettings,
} from "./users/core";

// Onboarding flow and health tracking
export {
  recordHealthAnalysis,
  setOnboardingData,
  completeOnboarding,
} from "./users/onboarding";

// Account management (reset, delete)
export {
  resetUserByEmail,
  resetMyAccount,
  deleteMyAccount,
} from "./users/accountManagement";

// Account deletion (internal purge + storage cleanup)
export {
  internalDeleteUser,
  cleanupUserStorage,
} from "./users/accountDeletion";

// Clerk webhook handlers
export {
  handleClerkWebhook,
  updateUserInfo,
} from "./users/webhooks";
