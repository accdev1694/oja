import { db } from './database';
import type { SyncQueueItem, SyncEntityType, SyncOperation } from './schema';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

// Add item to sync queue
export async function addToSyncQueue(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>
): Promise<void> {
  await db.syncQueue.add({
    entityType,
    entityId,
    operation,
    payload,
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

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
  return db.syncQueue
    .filter((item) => item.retryCount >= MAX_RETRIES)
    .toArray();
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

// Check if there are pending items
export async function hasPendingSync(): Promise<boolean> {
  const count = await getPendingSyncCount();
  return count > 0;
}
