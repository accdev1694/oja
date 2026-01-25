import Dexie, { type EntityTable } from 'dexie';
import type {
  OfflinePantryItem,
  OfflineShoppingList,
  OfflineShoppingListItem,
  SyncQueueItem,
} from './schema';

export class OjaDatabase extends Dexie {
  pantryItems!: EntityTable<OfflinePantryItem, 'localId'>;
  shoppingLists!: EntityTable<OfflineShoppingList, 'localId'>;
  shoppingListItems!: EntityTable<OfflineShoppingListItem, 'localId'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;

  constructor() {
    super('oja-offline-db');

    // Version 1: Initial schema
    this.version(1).stores({
      pantryItems:
        '++localId, id, userId, name, category, stockLevel, syncStatus',
      shoppingLists: '++localId, id, userId, status, syncStatus',
      shoppingListItems:
        '++localId, id, listId, isChecked, priority, syncStatus',
      syncQueue: '++id, entityType, entityId, timestamp',
    });
  }
}

// Singleton database instance
export const db = new OjaDatabase();

// Helper to clear all data (for logout)
export async function clearOfflineData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.pantryItems, db.shoppingLists, db.shoppingListItems, db.syncQueue],
    async () => {
      await db.pantryItems.clear();
      await db.shoppingLists.clear();
      await db.shoppingListItems.clear();
      await db.syncQueue.clear();
    }
  );
}

// Helper to get storage estimate
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    };
  }
  return { usage: 0, quota: 0 };
}
