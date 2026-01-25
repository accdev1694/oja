// Sync status for offline-first operations
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

// Stock level states
export type StockLevel = 'stocked' | 'good' | 'low' | 'out';

// Shopping list status
export type ShoppingListStatus =
  | 'active'
  | 'shopping'
  | 'completed'
  | 'archived';

// Item priority
export type ItemPriority = 'need' | 'want' | 'impulse';

// Base interface for all syncable entities
export interface SyncableEntity {
  id: string;
  localId?: number; // Auto-incremented local ID
  syncStatus: SyncStatus;
  lastModified: Date;
  createdAt: Date;
}

// Pantry item stored offline
export interface OfflinePantryItem extends SyncableEntity {
  userId: string;
  name: string;
  category: string | null;
  stockLevel: StockLevel;
  unit: string | null;
  notes: string | null;
}

// Shopping list stored offline
export interface OfflineShoppingList extends SyncableEntity {
  userId: string;
  name: string;
  budget: number | null;
  isLocked: boolean;
  status: ShoppingListStatus;
}

// Shopping list item stored offline
export interface OfflineShoppingListItem extends SyncableEntity {
  listId: string;
  name: string;
  quantity: number;
  unit: string | null;
  estimatedPrice: number | null;
  actualPrice: number | null;
  isChecked: boolean;
  priority: ItemPriority;
  fromPantry: boolean;
  pantryItemId: string | null;
}

// Entity types for sync queue
export type SyncEntityType =
  | 'pantryItem'
  | 'shoppingList'
  | 'shoppingListItem'
  | 'receipt';

// Sync operations
export type SyncOperation = 'create' | 'update' | 'delete';

// Sync queue item
export interface SyncQueueItem {
  id?: number;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  timestamp: Date;
  retryCount: number;
  lastError: string | null;
}
