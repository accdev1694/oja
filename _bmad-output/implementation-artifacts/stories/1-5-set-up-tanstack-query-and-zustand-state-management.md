# Story 1.5: Set Up TanStack Query and Zustand State Management

## Story

- **ID**: 1-5
- **Epic**: Epic 1 - Project Foundation & PWA Setup
- **Title**: Set Up TanStack Query and Zustand State Management
- **Status**: review

## Description

As a developer, I want configured state management libraries, so that I can efficiently manage server and client state.

## Acceptance Criteria

- [x] `lib/query/client.ts` exports a QueryClient with default options (staleTime, gcTime, retry logic)
- [x] `lib/query/keys.ts` exports a query key factory following Architecture patterns
- [x] `lib/query/QueryProvider.tsx` wraps the app with QueryClientProvider
- [x] `lib/stores/uiStore.ts` creates a Zustand store for UI state (offline status, modals)
- [x] Optimistic update patterns are documented and ready for use

## Technical Notes

### Dependencies

Already installed:
- `@tanstack/react-query` v5.90.20 - Server state management
- `zustand` v5.0.10 - Client state management

### Architecture Patterns

From the Architecture document:
- **Server State**: TanStack Query for all Supabase data
- **Client State**: Zustand for UI state (modals, offline status, preferences)
- **Offline State**: Dexie.js (already configured in Story 1.4)

### File Structure

```
src/
└── lib/
    ├── query/
    │   ├── client.ts         # QueryClient configuration
    │   ├── keys.ts           # Query key factory
    │   └── QueryProvider.tsx # Provider component
    └── stores/
        ├── uiStore.ts        # UI state (modals, offline)
        └── index.ts          # Re-exports
```

## Tasks

### Task 1: Create QueryClient Configuration
**File**: `src/lib/query/client.ts`

Configure QueryClient with offline-first defaults:

```typescript
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
```

### Task 2: Create Query Key Factory
**File**: `src/lib/query/keys.ts`

Create a type-safe query key factory:

```typescript
// Query key factory for type-safe, consistent keys
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  // Profiles
  profiles: {
    all: ['profiles'] as const,
    detail: (id: string) => [...queryKeys.profiles.all, id] as const,
    me: () => [...queryKeys.profiles.all, 'me'] as const,
  },

  // Pantry Items
  pantryItems: {
    all: ['pantryItems'] as const,
    list: (userId: string) => [...queryKeys.pantryItems.all, 'list', userId] as const,
    detail: (id: string) => [...queryKeys.pantryItems.all, 'detail', id] as const,
    byCategory: (userId: string, category: string) =>
      [...queryKeys.pantryItems.all, 'category', userId, category] as const,
  },

  // Shopping Lists
  shoppingLists: {
    all: ['shoppingLists'] as const,
    list: (userId: string) => [...queryKeys.shoppingLists.all, 'list', userId] as const,
    detail: (id: string) => [...queryKeys.shoppingLists.all, 'detail', id] as const,
    active: (userId: string) => [...queryKeys.shoppingLists.all, 'active', userId] as const,
    archived: (userId: string) => [...queryKeys.shoppingLists.all, 'archived', userId] as const,
  },

  // Shopping List Items
  shoppingListItems: {
    all: ['shoppingListItems'] as const,
    list: (listId: string) => [...queryKeys.shoppingListItems.all, 'list', listId] as const,
    detail: (id: string) => [...queryKeys.shoppingListItems.all, 'detail', id] as const,
  },

  // Receipts
  receipts: {
    all: ['receipts'] as const,
    list: (userId: string) => [...queryKeys.receipts.all, 'list', userId] as const,
    detail: (id: string) => [...queryKeys.receipts.all, 'detail', id] as const,
  },

  // Insights
  insights: {
    all: ['insights'] as const,
    weekly: (userId: string, weekStart: string) =>
      [...queryKeys.insights.all, 'weekly', userId, weekStart] as const,
    monthly: (userId: string, month: string) =>
      [...queryKeys.insights.all, 'monthly', userId, month] as const,
    categories: (userId: string) =>
      [...queryKeys.insights.all, 'categories', userId] as const,
  },
} as const;

// Helper type for extracting query key types
export type QueryKeys = typeof queryKeys;
```

### Task 3: Create QueryProvider Component
**File**: `src/lib/query/QueryProvider.tsx`

Create the provider component for Next.js App Router:

```typescript
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { createQueryClient } from './client';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient once per component instance
  // This ensures each request gets its own client on the server
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
```

### Task 4: Create Query Index Export
**File**: `src/lib/query/index.ts`

Re-export all query utilities:

```typescript
export { createQueryClient, getQueryClient } from './client';
export { queryKeys, type QueryKeys } from './keys';
export { QueryProvider } from './QueryProvider';
```

### Task 5: Create UI Store with Zustand
**File**: `src/lib/stores/uiStore.ts`

Create a Zustand store for UI state:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Modal types
export type ModalType =
  | 'addPantryItem'
  | 'editPantryItem'
  | 'createList'
  | 'editList'
  | 'addListItem'
  | 'scanReceipt'
  | 'confirmDelete'
  | 'budgetWarning'
  | null;

// Modal data can vary by type
export interface ModalData {
  itemId?: string;
  listId?: string;
  title?: string;
  message?: string;
  onConfirm?: () => void;
}

interface UIState {
  // Online/Offline status
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;

  // Modal management
  activeModal: ModalType;
  modalData: ModalData | null;
  openModal: (type: ModalType, data?: ModalData) => void;
  closeModal: () => void;

  // Toast notifications (simple queue)
  toasts: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;

  // Sidebar/navigation (for tablet/desktop)
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  // Online status - defaults to true, updated by hook
  isOnline: true,
  setIsOnline: (online) => set({ isOnline: online }),

  // Modal state
  activeModal: null,
  modalData: null,
  openModal: (type, data = null) =>
    set({ activeModal: type, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Toast notifications
  toasts: [],
  addToast: (message, type = 'info') =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: crypto.randomUUID(), message, type },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // Sidebar
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}));

// Persisted preferences store (separate from ephemeral UI state)
interface PreferencesState {
  // Theme preference
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Sound preferences
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  // Haptic preferences
  hapticEnabled: boolean;
  setHapticEnabled: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      soundEnabled: true,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      hapticEnabled: true,
      setHapticEnabled: (enabled) => set({ hapticEnabled: enabled }),
    }),
    {
      name: 'oja-preferences',
    }
  )
);
```

### Task 6: Create Stores Index Export
**File**: `src/lib/stores/index.ts`

Re-export all stores:

```typescript
export {
  useUIStore,
  usePreferencesStore,
  type ModalType,
  type ModalData,
} from './uiStore';
```

### Task 7: Integrate QueryProvider into Layout
**File**: `src/app/layout.tsx` (update)

Wrap the app with QueryProvider:

```typescript
import { QueryProvider } from '@/lib/query';

// In the layout component, wrap children with QueryProvider
<QueryProvider>
  {children}
</QueryProvider>
```

### Task 8: Install React Query DevTools
**Command**: `npm install -D @tanstack/react-query-devtools`

DevTools for debugging queries in development.

### Task 9: Create Optimistic Update Helper
**File**: `src/lib/query/optimistic.ts`

Document and provide helpers for optimistic updates:

```typescript
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
```

### Task 10: Verify Configuration
**Verification Steps**:

1. Build succeeds with TanStack Query imports
2. TypeScript compiles without errors
3. ESLint passes
4. DevTools package is installed

**Test Commands**:
```bash
npm run build
npm run lint
```

## Dev Notes

- QueryClient is created per-request on server, singleton on client
- DevTools only render in development mode
- Zustand stores are split: `uiStore` for ephemeral state, `preferencesStore` for persisted
- Optimistic updates should always include rollback logic
- `networkMode: 'offlineFirst'` integrates with our Dexie offline layer

## Story Wrap-Up

### Completion Checklist
- [x] All acceptance criteria met
- [x] Code builds without errors
- [x] Lint passes
- [ ] Changes committed with descriptive message
- [x] Sprint status updated
