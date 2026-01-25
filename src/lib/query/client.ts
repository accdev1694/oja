import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep unused data in cache for 30 minutes
        gcTime: 30 * 60 * 1000,
        // Retry failed requests 3 times with exponential backoff
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Don't refetch on window focus for offline-first
        refetchOnWindowFocus: false,
        // Use cached data when offline
        networkMode: 'offlineFirst',
      },
      mutations: {
        // Retry mutations once
        retry: 1,
        networkMode: 'offlineFirst',
      },
    },
  });
}

// Singleton for client-side use
let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always create a new client
    return createQueryClient();
  }
  // Browser: reuse singleton
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
}
