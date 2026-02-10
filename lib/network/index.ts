/**
 * Network utilities barrel export
 *
 * Provides hooks and utilities for monitoring network/Convex connection status.
 *
 * Note: Convex automatically handles offline scenarios:
 * - Mutations are queued and retried for days
 * - Optimistic updates provide instant UI feedback
 * - Queries reconnect automatically when online
 */

export {
  useNetworkStatus,
  type NetworkStatus,
} from "./useNetworkStatus";
