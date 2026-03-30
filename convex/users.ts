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

// Account management (reset, delete, admin operations)
export {
  resetUserByEmail,
  resetMyAccount,
  deleteMyAccount,
  internalDeleteUser,
  cleanupUserStorage,
} from "./users/accountManagement";

// Clerk webhook handlers
export {
  handleClerkWebhook,
  updateUserInfo,
} from "./users/webhooks";
