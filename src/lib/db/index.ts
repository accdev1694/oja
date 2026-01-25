// Database instance and utilities
export { db, OjaDatabase, clearOfflineData, getStorageEstimate } from './database';

// Schema types
export type {
  SyncStatus,
  StockLevel,
  ShoppingListStatus,
  ItemPriority,
  SyncableEntity,
  OfflinePantryItem,
  OfflineShoppingList,
  OfflineShoppingListItem,
  SyncEntityType,
  SyncOperation,
  SyncQueueItem,
} from './schema';

// Sync queue utilities
export {
  addToSyncQueue,
  processSyncQueue,
  getPendingSyncCount,
  getFailedSyncItems,
  retrySyncItem,
  removeSyncItem,
  getBackoffDelay,
  hasPendingSync,
} from './syncQueue';

// React hooks (client-side only)
export {
  useOnlineStatus,
  usePendingSyncCount,
  useSyncQueue,
  useOfflinePantryItems,
  useOfflineShoppingLists,
  useOfflineShoppingListItems,
  useFailedSyncItems,
} from './hooks';
