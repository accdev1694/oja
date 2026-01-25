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
    list: (userId: string) =>
      [...queryKeys.pantryItems.all, 'list', userId] as const,
    detail: (id: string) =>
      [...queryKeys.pantryItems.all, 'detail', id] as const,
    byCategory: (userId: string, category: string) =>
      [...queryKeys.pantryItems.all, 'category', userId, category] as const,
  },

  // Shopping Lists
  shoppingLists: {
    all: ['shoppingLists'] as const,
    list: (userId: string) =>
      [...queryKeys.shoppingLists.all, 'list', userId] as const,
    detail: (id: string) =>
      [...queryKeys.shoppingLists.all, 'detail', id] as const,
    active: (userId: string) =>
      [...queryKeys.shoppingLists.all, 'active', userId] as const,
    archived: (userId: string) =>
      [...queryKeys.shoppingLists.all, 'archived', userId] as const,
  },

  // Shopping List Items
  shoppingListItems: {
    all: ['shoppingListItems'] as const,
    list: (listId: string) =>
      [...queryKeys.shoppingListItems.all, 'list', listId] as const,
    detail: (id: string) =>
      [...queryKeys.shoppingListItems.all, 'detail', id] as const,
  },

  // Receipts
  receipts: {
    all: ['receipts'] as const,
    list: (userId: string) =>
      [...queryKeys.receipts.all, 'list', userId] as const,
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
