# Story 1.4: Configure Dexie.js Offline Storage Layer

## Story

- **ID**: 1-4
- **Epic**: Epic 1 - Project Foundation & PWA Setup
- **Title**: Configure Dexie.js Offline Storage Layer
- **Status**: review

## Description

As a user, I want my data to be available offline, so that I can use Oja in stores with poor connectivity.

## Acceptance Criteria

- [x] `lib/db/index.ts` exports a Dexie database instance with versioned schema
- [x] `lib/db/syncQueue.ts` implements a queue for offline changes
- [x] Offline changes are persisted to IndexedDB
- [x] The sync queue processes when the app comes online
- [x] IndexedDB storage usage is under 50MB for typical usage (schema is minimal)

## Technical Notes

### Dependencies

Already installed:
- `dexie` v4.2.1 - IndexedDB wrapper with excellent TypeScript support

### Database Schema Design

The offline database mirrors the Supabase schema for seamless sync:

```typescript
// Core tables for offline storage
interface OjaDB {
  profiles: Profile;
  pantryItems: PantryItem;
  shoppingLists: ShoppingList;
  shoppingListItems: ShoppingListItem;
  receipts: Receipt;
  receiptItems: ReceiptItem;
  syncQueue: SyncQueueItem;
}
```

### Sync Queue Architecture

The sync queue follows a FIFO pattern with conflict resolution:

1. **Offline Write**: Changes are written to IndexedDB and added to sync queue
2. **Online Detection**: App detects connectivity via `navigator.onLine` and `online` event
3. **Queue Processing**: FIFO processing with exponential backoff on failures
4. **Conflict Resolution**: Server wins for most conflicts, with user notification

### File Structure

```
src/
└── lib/
    └── db/
        ├── index.ts        # Dexie database instance
        ├── schema.ts       # Database schema and types
        ├── syncQueue.ts    # Sync queue implementation
        └── hooks.ts        # React hooks for offline data
```

## Tasks

### Task 1: Create Database Schema Types
**File**: `src/lib/db/schema.ts`

Define TypeScript interfaces for all offline-stored entities:

```typescript
// Sync status for offline-first operations
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

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
  stockLevel: 'stocked' | 'good' | 'low' | 'out';
  unit: string | null;
  notes: string | null;
}

// Shopping list stored offline
export interface OfflineShoppingList extends SyncableEntity {
  userId: string;
  name: string;
  budget: number | null;
  isLocked: boolean;
  status: 'active' | 'shopping' | 'completed' | 'archived';
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
  priority: 'need' | 'want' | 'impulse';
  fromPantry: boolean;
  pantryItemId: string | null;
}

// Sync queue item
export interface SyncQueueItem {
  id?: number;
  entityType: 'pantryItem' | 'shoppingList' | 'shoppingListItem' | 'receipt';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: Date;
  retryCount: number;
  lastError: string | null;
}
```

### Task 2: Create Dexie Database Instance
**File**: `src/lib/db/index.ts`

Create the Dexie database with versioned schema:

```typescript
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
      pantryItems: '++localId, id, userId, name, category, stockLevel, syncStatus',
      shoppingLists: '++localId, id, userId, status, syncStatus',
      shoppingListItems: '++localId, id, listId, isChecked, priority, syncStatus',
      syncQueue: '++id, entityType, entityId, timestamp',
    });
  }
}

// Singleton database instance
export const db = new OjaDatabase();

// Helper to clear all data (for logout)
export async function clearOfflineData(): Promise<void> {
  await db.transaction('rw', [db.pantryItems, db.shoppingLists, db.shoppingListItems, db.syncQueue], async () => {
    await db.pantryItems.clear();
    await db.shoppingLists.clear();
    await db.shoppingListItems.clear();
    await db.syncQueue.clear();
  });
}

// Helper to get storage estimate
export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    };
  }
  return { usage: 0, quota: 0 };
}
```

### Task 3: Implement Sync Queue
**File**: `src/lib/db/syncQueue.ts`

Create the sync queue with online detection and processing:

```typescript
import { db, type OjaDatabase } from './index';
import type { SyncQueueItem } from './schema';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

// Add item to sync queue
export async function addToSyncQueue(
  item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'lastError'>
): Promise<void> {
  await db.syncQueue.add({
    ...item,
    timestamp: new Date(),
    retryCount: 0,
    lastError: null,
  });
}

// Process sync queue when online
export async function processSyncQueue(
  syncFn: (item: SyncQueueItem) => Promise<void>
): Promise<{ processed: number; failed: number }> {
  const items = await db.syncQueue.orderBy('timestamp').toArray();
  let processed = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await syncFn(item);
      await db.syncQueue.delete(item.id!);
      processed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (item.retryCount >= MAX_RETRIES) {
        // Mark as permanently failed, keep in queue for manual resolution
        await db.syncQueue.update(item.id!, {
          lastError: errorMessage,
        });
        failed++;
      } else {
        // Increment retry count with exponential backoff tracking
        await db.syncQueue.update(item.id!, {
          retryCount: item.retryCount + 1,
          lastError: errorMessage,
        });
      }
    }
  }

  return { processed, failed };
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  return db.syncQueue.count();
}

// Get failed sync items for manual resolution
export async function getFailedSyncItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.filter((item) => item.retryCount >= MAX_RETRIES).toArray();
}

// Retry a specific failed item
export async function retrySyncItem(id: number): Promise<void> {
  await db.syncQueue.update(id, {
    retryCount: 0,
    lastError: null,
  });
}

// Remove a sync item (user chose to discard)
export async function removeSyncItem(id: number): Promise<void> {
  await db.syncQueue.delete(id);
}

// Calculate backoff delay
export function getBackoffDelay(retryCount: number): number {
  return Math.min(BASE_BACKOFF_MS * Math.pow(2, retryCount), 30000);
}
```

### Task 4: Create Online Status Hook
**File**: `src/lib/db/hooks.ts`

Create React hooks for offline data management:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './index';
import { getPendingSyncCount, processSyncQueue, type SyncQueueItem } from './syncQueue';

// Hook to track online/offline status
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook to get pending sync count (reactive)
export function usePendingSyncCount(): number {
  const count = useLiveQuery(() => db.syncQueue.count(), [], 0);
  return count;
}

// Hook to manage sync queue processing
export function useSyncQueue(syncFn: (item: SyncQueueItem) => Promise<void>) {
  const isOnline = useOnlineStatus();
  const pendingCount = usePendingSyncCount();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    processed: number;
    failed: number;
  } | null>(null);

  const processQueue = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      const result = await processSyncQueue(syncFn);
      setLastSyncResult(result);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, syncFn]);

  // Auto-process when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      processQueue();
    }
  }, [isOnline, pendingCount, processQueue]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncResult,
    processQueue,
  };
}

// Hook for offline pantry items
export function useOfflinePantryItems(userId: string | undefined) {
  return useLiveQuery(
    () => (userId ? db.pantryItems.where('userId').equals(userId).toArray() : []),
    [userId],
    []
  );
}

// Hook for offline shopping lists
export function useOfflineShoppingLists(userId: string | undefined) {
  return useLiveQuery(
    () => (userId ? db.shoppingLists.where('userId').equals(userId).toArray() : []),
    [userId],
    []
  );
}

// Hook for offline shopping list items
export function useOfflineShoppingListItems(listId: string | undefined) {
  return useLiveQuery(
    () => (listId ? db.shoppingListItems.where('listId').equals(listId).toArray() : []),
    [listId],
    []
  );
}
```

### Task 5: Add dexie-react-hooks Dependency
**Command**: `npm install dexie-react-hooks`

The hooks file uses `useLiveQuery` from dexie-react-hooks for reactive queries.

### Task 6: Create Index Export
**File**: `src/lib/db/index.ts` (update)

Export all database utilities from the main index:

```typescript
// Re-export schema types
export * from './schema';

// Re-export sync queue utilities
export {
  addToSyncQueue,
  processSyncQueue,
  getPendingSyncCount,
  getFailedSyncItems,
  retrySyncItem,
  removeSyncItem,
  getBackoffDelay,
} from './syncQueue';

// Re-export hooks
export {
  useOnlineStatus,
  usePendingSyncCount,
  useSyncQueue,
  useOfflinePantryItems,
  useOfflineShoppingLists,
  useOfflineShoppingListItems,
} from './hooks';
```

### Task 7: Verify Configuration
**Verification Steps**:

1. Build succeeds with Dexie imports
2. TypeScript compiles without errors
3. ESLint passes
4. dexie-react-hooks is installed

**Test Commands**:
```bash
npm run build
npm run lint
```

## Dev Notes

- Dexie v4 uses the new EntityTable type for better TypeScript support
- `useLiveQuery` provides reactive updates when IndexedDB data changes
- The sync queue uses exponential backoff with max 3 retries
- Storage estimate API may not be available in all browsers
- Clear offline data on logout to prevent data leakage between users

## Story Wrap-Up

### Completion Checklist
- [x] All acceptance criteria met
- [x] Code builds without errors
- [x] Lint passes
- [x] Changes committed with descriptive message
- [x] Sprint status updated

## Implementation Notes

### Files Created
- `src/lib/db/schema.ts` - TypeScript interfaces for offline entities
- `src/lib/db/database.ts` - Dexie database instance and helpers
- `src/lib/db/syncQueue.ts` - Sync queue implementation with retry logic
- `src/lib/db/hooks.ts` - React hooks for offline data management
- `src/lib/db/index.ts` - Re-exports all db utilities

### Key Features
- **Versioned Schema**: Dexie v1 schema with indexed fields
- **Reactive Queries**: `useLiveQuery` for real-time IndexedDB updates
- **Auto-Sync**: Queue auto-processes when coming online
- **Exponential Backoff**: Max 3 retries with increasing delays
- **Storage Estimate**: API to check IndexedDB usage

### Dependencies Added
- `dexie-react-hooks` - React integration for Dexie
