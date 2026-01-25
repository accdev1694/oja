import { type QueryClient } from '@tanstack/react-query';

/**
 * Helper for optimistic updates with TanStack Query.
 *
 * Pattern for optimistic updates:
 *
 * 1. Cancel outgoing refetches
 * 2. Snapshot previous value
 * 3. Optimistically update cache
 * 4. Return context with snapshot
 * 5. On error, rollback using context
 * 6. On success/settle, invalidate queries
 *
 * Example usage with useMutation:
 *
 * ```typescript
 * const mutation = useMutation({
 *   mutationFn: updatePantryItem,
 *   onMutate: async (newItem) => {
 *     return optimisticUpdate(
 *       queryClient,
 *       queryKeys.pantryItems.list(userId),
 *       (old) => old.map(item =>
 *         item.id === newItem.id ? { ...item, ...newItem } : item
 *       )
 *     );
 *   },
 *   onError: (err, newItem, context) => {
 *     rollbackOptimisticUpdate(queryClient, context);
 *   },
 *   onSettled: () => {
 *     queryClient.invalidateQueries({
 *       queryKey: queryKeys.pantryItems.all
 *     });
 *   },
 * });
 * ```
 */

export interface OptimisticContext<T> {
  queryKey: readonly unknown[];
  previousData: T | undefined;
}

export async function optimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  updater: (old: T | undefined) => T
): Promise<OptimisticContext<T>> {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey });

  // Snapshot previous value
  const previousData = queryClient.getQueryData<T>(queryKey);

  // Optimistically update
  queryClient.setQueryData<T>(queryKey, updater);

  // Return context for rollback
  return { queryKey, previousData };
}

export function rollbackOptimisticUpdate<T>(
  queryClient: QueryClient,
  context: OptimisticContext<T> | undefined
): void {
  if (context) {
    queryClient.setQueryData(context.queryKey, context.previousData);
  }
}
