import { useRef, useCallback, useEffect } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Prefetch cache entry with timestamp for TTL-based expiry.
 */
interface PrefetchEntry {
  itemName: string;
  store: string;
  fetchedAt: number;
}

/**
 * Configuration for variant prefetching.
 */
interface PrefetchConfig {
  /** Debounce delay in ms before triggering prefetch (default: 300) */
  debounceMs?: number;
  /** Minimum characters before triggering prefetch (default: 2) */
  minChars?: number;
  /** Cache TTL in ms - entries older than this are refetched (default: 5 minutes) */
  cacheTTLMs?: number;
  /** Maximum cache size to limit memory usage (default: 50) */
  maxCacheSize?: number;
}

const DEFAULT_CONFIG: Required<PrefetchConfig> = {
  debounceMs: 300,
  minChars: 2,
  cacheTTLMs: 5 * 60 * 1000, // 5 minutes
  maxCacheSize: 50,
};

/**
 * Hook for prefetching item variants to improve Size/Price modal responsiveness.
 *
 * This hook pre-warms Convex's query cache by executing the getSizesForStore
 * query before the user submits the item. When the modal opens, the data
 * is already cached and appears instantly.
 *
 * Usage:
 * ```tsx
 * const { triggerPrefetch, prefetchOnFocus } = useVariantPrefetch({
 *   store: list?.normalizedStoreId ?? "tesco",
 * });
 *
 * // In AddItemForm:
 * <GlassInput
 *   onFocus={prefetchOnFocus}
 *   onChangeText={(text) => {
 *     setNewItemName(text);
 *     triggerPrefetch(text);
 *   }}
 * />
 * ```
 *
 * The hook:
 * 1. Debounces prefetch calls to avoid excessive queries
 * 2. Tracks prefetched items to avoid redundant fetches
 * 3. Limits cache size and uses TTL for memory efficiency
 * 4. Uses Convex client directly for fire-and-forget queries
 */
export function useVariantPrefetch(
  options: {
    store: string;
    category?: string;
    config?: PrefetchConfig;
  }
) {
  const { store, category, config = {} } = options;
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const convex = useConvex();
  const prefetchCacheRef = useRef<Map<string, PrefetchEntry>>(new Map());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPrefetchedRef = useRef<string>("");

  /**
   * Clean up old cache entries to limit memory usage.
   */
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const cache = prefetchCacheRef.current;

    // Remove expired entries
    for (const [key, entry] of cache.entries()) {
      if (now - entry.fetchedAt > mergedConfig.cacheTTLMs) {
        cache.delete(key);
      }
    }

    // If still over max size, remove oldest entries
    if (cache.size > mergedConfig.maxCacheSize) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
      const toRemove = entries.slice(0, cache.size - mergedConfig.maxCacheSize);
      toRemove.forEach(([key]) => cache.delete(key));
    }
  }, [mergedConfig.cacheTTLMs, mergedConfig.maxCacheSize]);

  /**
   * Execute prefetch query for an item.
   * This warms Convex's internal query cache.
   */
  const executePrefetch = useCallback(
    async (itemName: string) => {
      const normalizedItem = itemName.toLowerCase().trim();
      const cacheKey = `${normalizedItem}:${store}`;

      // Check if already prefetched and still valid
      const existingEntry = prefetchCacheRef.current.get(cacheKey);
      if (existingEntry) {
        const age = Date.now() - existingEntry.fetchedAt;
        if (age < mergedConfig.cacheTTLMs) {
          // Cache hit - skip prefetch
          return;
        }
      }

      try {
        // Fire the query to warm Convex cache
        // This is a fire-and-forget - we don't need the result here
        await convex.query(api.itemVariants.getSizesForStore, {
          itemName: normalizedItem,
          store,
          category,
        });

        // Record in our prefetch cache
        prefetchCacheRef.current.set(cacheKey, {
          itemName: normalizedItem,
          store,
          fetchedAt: Date.now(),
        });

        // Cleanup old entries periodically
        cleanupCache();
      } catch (error) {
        // Silently fail - prefetch is best-effort
        // The actual query will handle errors
        if (__DEV__) {
          console.debug("[useVariantPrefetch] Prefetch failed:", error);
        }
      }
    },
    [convex, store, category, mergedConfig.cacheTTLMs, cleanupCache]
  );

  /**
   * Trigger prefetch with debouncing.
   * Call this on text input changes.
   */
  const triggerPrefetch = useCallback(
    (itemName: string) => {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const trimmed = itemName.trim();

      // Skip if too short
      if (trimmed.length < mergedConfig.minChars) {
        return;
      }

      // Skip if same as last prefetch (prevents duplicate calls)
      if (trimmed.toLowerCase() === lastPrefetchedRef.current) {
        return;
      }

      // Debounce the prefetch
      debounceTimerRef.current = setTimeout(() => {
        lastPrefetchedRef.current = trimmed.toLowerCase();
        executePrefetch(trimmed);
      }, mergedConfig.debounceMs);
    },
    [executePrefetch, mergedConfig.minChars, mergedConfig.debounceMs]
  );

  /**
   * Handler for input focus - can prefetch common items.
   * Currently a no-op but could be extended to prefetch
   * user's most frequently added items.
   */
  const prefetchOnFocus = useCallback(() => {
    // Future enhancement: prefetch user's top 5 most-added items
    // For now, we just rely on typing-triggered prefetch
  }, []);

  /**
   * Check if an item has been prefetched recently.
   */
  const isPrefetched = useCallback(
    (itemName: string): boolean => {
      const normalizedItem = itemName.toLowerCase().trim();
      const cacheKey = `${normalizedItem}:${store}`;
      const entry = prefetchCacheRef.current.get(cacheKey);

      if (!entry) return false;

      const age = Date.now() - entry.fetchedAt;
      return age < mergedConfig.cacheTTLMs;
    },
    [store, mergedConfig.cacheTTLMs]
  );

  /**
   * Clear the prefetch cache (e.g., on store change).
   */
  const clearCache = useCallback(() => {
    prefetchCacheRef.current.clear();
    lastPrefetchedRef.current = "";
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Clear cache when store changes
  useEffect(() => {
    clearCache();
  }, [store, clearCache]);

  return {
    /** Trigger debounced prefetch for an item name */
    triggerPrefetch,
    /** Handler for input focus events */
    prefetchOnFocus,
    /** Check if an item has been recently prefetched */
    isPrefetched,
    /** Manually clear the prefetch cache */
    clearCache,
  };
}

export default useVariantPrefetch;
