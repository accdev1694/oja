'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './database';
import { processSyncQueue } from './syncQueue';
import type { SyncQueueItem } from './schema';

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
    if (isOnline && pendingCount > 0 && !isSyncing) {
      processQueue();
    }
  }, [isOnline, pendingCount, isSyncing, processQueue]);

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
    () =>
      userId ? db.pantryItems.where('userId').equals(userId).toArray() : [],
    [userId],
    []
  );
}

// Hook for offline shopping lists
export function useOfflineShoppingLists(userId: string | undefined) {
  return useLiveQuery(
    () =>
      userId ? db.shoppingLists.where('userId').equals(userId).toArray() : [],
    [userId],
    []
  );
}

// Hook for offline shopping list items
export function useOfflineShoppingListItems(listId: string | undefined) {
  return useLiveQuery(
    () =>
      listId
        ? db.shoppingListItems.where('listId').equals(listId).toArray()
        : [],
    [listId],
    []
  );
}

// Hook to check if there are failed sync items
export function useFailedSyncItems() {
  return useLiveQuery(
    () => db.syncQueue.filter((item) => item.retryCount >= 3).toArray(),
    [],
    []
  );
}
