/**
 * Mock Convex client for testing
 * Provides stub implementations of useQuery, useMutation, useAction
 */

type MockQueryFn = jest.Mock;
type MockMutationFn = jest.Mock;

interface MockConvexClient {
  queries: Map<string, unknown>;
  mutations: Map<string, MockMutationFn>;
  actions: Map<string, MockMutationFn>;
}

export function createMockConvexClient(): MockConvexClient {
  return {
    queries: new Map(),
    mutations: new Map(),
    actions: new Map(),
  };
}

/**
 * Create a mock useQuery that returns predetermined data
 */
export function mockUseQuery(data: unknown): MockQueryFn {
  return jest.fn(() => data);
}

/**
 * Create a mock useMutation that tracks calls
 */
export function mockUseMutation(): MockMutationFn {
  const mutate = jest.fn().mockResolvedValue(undefined);
  return jest.fn(() => mutate);
}

/**
 * Create a mock useAction that tracks calls
 */
export function mockUseAction(): MockMutationFn {
  const action = jest.fn().mockResolvedValue(undefined);
  return jest.fn(() => action);
}

/**
 * Mock database context for testing Convex function logic
 */
interface MockDocument {
  _id: string;
  [key: string]: unknown;
}

export function createMockDb() {
  const store: Record<string, MockDocument[]> = {};

  return {
    insert: jest.fn(async (table: string, doc: Record<string, unknown>) => {
      if (!store[table]) store[table] = [];
      const id = `${table}_${store[table].length + 1}`;
      store[table].push({ _id: id, ...doc });
      return id;
    }),
    get: jest.fn(async (id: string) => {
      for (const table of Object.values(store)) {
        const doc = table.find((d) => d._id === id);
        if (doc) return doc;
      }
      return null;
    }),
    patch: jest.fn(async (id: string, updates: Record<string, unknown>) => {
      for (const table of Object.values(store)) {
        const idx = table.findIndex((d) => d._id === id);
        if (idx !== -1) {
          table[idx] = { ...table[idx], ...updates };
          return;
        }
      }
    }),
    delete: jest.fn(async (id: string) => {
      for (const [, table] of Object.entries(store)) {
        const idx = table.findIndex((d) => d._id === id);
        if (idx !== -1) {
          table.splice(idx, 1);
          return;
        }
      }
    }),
    query: jest.fn((table: string) => ({
      withIndex: jest.fn(() => ({
        eq: jest.fn(() => ({
          collect: jest.fn(async () => store[table] || []),
          first: jest.fn(async () => (store[table] || [])[0] || null),
        })),
        collect: jest.fn(async () => store[table] || []),
        first: jest.fn(async () => (store[table] || [])[0] || null),
      })),
      collect: jest.fn(async () => store[table] || []),
      filter: jest.fn(() => ({
        collect: jest.fn(async () => store[table] || []),
        first: jest.fn(async () => (store[table] || [])[0] || null),
      })),
    })),
    _store: store,
    _seed: (table: string, docs: MockDocument[]) => {
      store[table] = docs;
    },
  };
}
