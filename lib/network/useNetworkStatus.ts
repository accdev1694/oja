/**
 * useNetworkStatus - Hook for monitoring network/Convex connection status
 *
 * Uses Convex's built-in connection state tracking which handles:
 * - WebSocket connection status
 * - Automatic retry of mutations when reconnected
 * - Inflight request tracking
 *
 * This hook provides a simplified interface for components to respond
 * to offline/online status changes.
 */

import { useConvexConnectionState } from "convex/react";
import { useMemo } from "react";

export interface NetworkStatus {
  /** Whether the WebSocket is currently connected to Convex */
  isConnected: boolean;
  /** Whether there are pending mutations waiting to sync */
  hasPendingMutations: boolean;
  /** Number of mutations currently in flight */
  pendingMutationCount: number;
  /** Whether the client has ever successfully connected */
  hasEverConnected: boolean;
  /** Human-readable status message */
  statusMessage: string;
}

/**
 * Hook to monitor network/Convex connection status
 *
 * Convex automatically handles:
 * - Retrying mutations when offline (retries for days)
 * - Queueing operations during connectivity loss
 * - Optimistic updates that rollback on failure
 *
 * This hook exposes the connection state for UI feedback.
 */
export function useNetworkStatus(): NetworkStatus {
  const connectionState = useConvexConnectionState();

  const status = useMemo<NetworkStatus>(() => {
    const isConnected = connectionState.isWebSocketConnected;
    const pendingMutationCount = connectionState.inflightMutations ?? 0;
    const hasPendingMutations = pendingMutationCount > 0;
    const hasEverConnected = connectionState.hasEverConnected ?? false;

    // Generate status message
    let statusMessage: string;
    if (!hasEverConnected) {
      statusMessage = "Connecting...";
    } else if (!isConnected && hasPendingMutations) {
      statusMessage = `Offline - ${pendingMutationCount} ${pendingMutationCount === 1 ? "change" : "changes"} pending`;
    } else if (!isConnected) {
      statusMessage = "Offline - changes will sync when connected";
    } else if (hasPendingMutations) {
      statusMessage = "Syncing...";
    } else {
      statusMessage = "Connected";
    }

    return {
      isConnected,
      hasPendingMutations,
      pendingMutationCount,
      hasEverConnected,
      statusMessage,
    };
  }, [connectionState]);

  return status;
}

export default useNetworkStatus;
