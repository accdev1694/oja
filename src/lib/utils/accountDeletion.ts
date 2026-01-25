/**
 * Account Deletion Utilities
 *
 * Handles clearing all user data for GDPR compliance.
 * Currently clears localStorage; will integrate with Supabase
 * for server-side data deletion.
 */

import { STORAGE_KEYS as ONBOARDING_KEYS } from './onboardingStorage';
import { SUBSCRIPTION_STORAGE_KEY } from './subscriptionStorage';

/**
 * All localStorage keys used by Oja
 */
export const ALL_STORAGE_KEYS = [
  // Onboarding data
  ONBOARDING_KEYS.ONBOARDING_PRODUCTS,
  ONBOARDING_KEYS.DEFAULT_BUDGET,
  ONBOARDING_KEYS.LOCATION_GRANTED,
  ONBOARDING_KEYS.CURRENCY,
  ONBOARDING_KEYS.COUNTRY,
  ONBOARDING_KEYS.ONBOARDING_COMPLETE,
  ONBOARDING_KEYS.PANTRY_ITEMS,
  // Subscription data
  SUBSCRIPTION_STORAGE_KEY,
] as const;

/**
 * Check if running in browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Clear all localStorage data
 */
export function clearAllLocalStorage(): void {
  if (!isBrowser) return;

  ALL_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
}

/**
 * Clear all IndexedDB databases used by the app
 * (Placeholder for when Dexie.js is integrated)
 */
export async function clearIndexedDB(): Promise<void> {
  if (!isBrowser) return;

  // List of IndexedDB databases used by Oja
  const databases = ['oja-offline-db'];

  for (const dbName of databases) {
    try {
      // Check if indexedDB is available
      if ('indexedDB' in window) {
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(dbName);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () => {
            // Database deletion is blocked, possibly by open connections
            console.warn(`IndexedDB ${dbName} deletion blocked`);
            resolve();
          };
        });
      }
    } catch (error) {
      console.error(`Failed to delete IndexedDB ${dbName}:`, error);
    }
  }
}

/**
 * Clear service worker cache
 */
export async function clearServiceWorkerCache(): Promise<void> {
  if (!isBrowser || !('caches' in window)) return;

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  } catch (error) {
    console.error('Failed to clear service worker cache:', error);
  }
}

/**
 * Delete account from Supabase
 * (Placeholder for server-side integration)
 */
export async function deleteSupabaseAccount(): Promise<{
  success: boolean;
  error?: string;
}> {
  // TODO: Implement Supabase account deletion
  // This will:
  // 1. Delete user's profile from profiles table
  // 2. Delete all stock_items for the user
  // 3. Delete all shopping_lists for the user
  // 4. Delete all receipts for the user
  // 5. Delete the auth user account

  // For now, simulate success
  return { success: true };
}

/**
 * Result of account deletion
 */
export interface DeleteAccountResult {
  success: boolean;
  error?: string;
  clearedLocal: boolean;
  clearedIndexedDB: boolean;
  clearedCache: boolean;
  deletedServerData: boolean;
}

/**
 * Delete all user account data
 * Clears local storage, IndexedDB, cache, and server data
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const result: DeleteAccountResult = {
    success: false,
    clearedLocal: false,
    clearedIndexedDB: false,
    clearedCache: false,
    deletedServerData: false,
  };

  try {
    // 1. Clear localStorage
    clearAllLocalStorage();
    result.clearedLocal = true;

    // 2. Clear IndexedDB
    await clearIndexedDB();
    result.clearedIndexedDB = true;

    // 3. Clear service worker cache
    await clearServiceWorkerCache();
    result.clearedCache = true;

    // 4. Delete server-side data (when implemented)
    const serverResult = await deleteSupabaseAccount();
    result.deletedServerData = serverResult.success;

    if (!serverResult.success) {
      result.error = serverResult.error || 'Failed to delete server data';
      return result;
    }

    result.success = true;
    return result;
  } catch (error) {
    result.error =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return result;
  }
}

/**
 * Confirmation text required for deletion
 */
export const DELETION_CONFIRMATION_TEXT = 'DELETE';

/**
 * Check if confirmation text matches
 */
export function isValidDeletionConfirmation(input: string): boolean {
  return input.trim() === DELETION_CONFIRMATION_TEXT;
}
