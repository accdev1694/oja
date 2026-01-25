import {
  ALL_STORAGE_KEYS,
  clearAllLocalStorage,
  clearIndexedDB,
  clearServiceWorkerCache,
  deleteSupabaseAccount,
  deleteAccount,
  DELETION_CONFIRMATION_TEXT,
  isValidDeletionConfirmation,
} from '@/lib/utils/accountDeletion';
import { STORAGE_KEYS as ONBOARDING_KEYS } from '@/lib/utils/onboardingStorage';
import { SUBSCRIPTION_STORAGE_KEY } from '@/lib/utils/subscriptionStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: jest.fn((key: string): void => {
      delete store[key];
    }),
    clear: (): void => {
      store = {};
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key: (index: number): string | null => {
      return Object.keys(store)[index] || null;
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock indexedDB
const mockDeleteDatabase = jest.fn();
Object.defineProperty(window, 'indexedDB', {
  value: {
    deleteDatabase: (name: string) => {
      const request = {
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onblocked: null as (() => void) | null,
        error: null,
      };
      mockDeleteDatabase(name);
      // Simulate async success
      setTimeout(() => request.onsuccess?.(), 0);
      return request;
    },
  },
});

// Mock caches API
const mockCachesKeys = jest.fn();
const mockCachesDelete = jest.fn();
Object.defineProperty(window, 'caches', {
  value: {
    keys: mockCachesKeys,
    delete: mockCachesDelete,
  },
});

describe('accountDeletion', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.removeItem.mockClear();
    mockDeleteDatabase.mockClear();
    mockCachesKeys.mockClear();
    mockCachesDelete.mockClear();
  });

  describe('ALL_STORAGE_KEYS', () => {
    it('includes all onboarding keys', () => {
      expect(ALL_STORAGE_KEYS).toContain(ONBOARDING_KEYS.ONBOARDING_PRODUCTS);
      expect(ALL_STORAGE_KEYS).toContain(ONBOARDING_KEYS.DEFAULT_BUDGET);
      expect(ALL_STORAGE_KEYS).toContain(ONBOARDING_KEYS.LOCATION_GRANTED);
      expect(ALL_STORAGE_KEYS).toContain(ONBOARDING_KEYS.CURRENCY);
      expect(ALL_STORAGE_KEYS).toContain(ONBOARDING_KEYS.COUNTRY);
      expect(ALL_STORAGE_KEYS).toContain(ONBOARDING_KEYS.ONBOARDING_COMPLETE);
      expect(ALL_STORAGE_KEYS).toContain(ONBOARDING_KEYS.PANTRY_ITEMS);
    });

    it('includes subscription key', () => {
      expect(ALL_STORAGE_KEYS).toContain(SUBSCRIPTION_STORAGE_KEY);
    });
  });

  describe('clearAllLocalStorage', () => {
    it('removes all storage keys', () => {
      // Set some data
      ALL_STORAGE_KEYS.forEach((key) => {
        localStorage.setItem(key, 'test-value');
      });

      clearAllLocalStorage();

      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(
        ALL_STORAGE_KEYS.length
      );
      ALL_STORAGE_KEYS.forEach((key) => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(key);
      });
    });
  });

  describe('clearIndexedDB', () => {
    it('attempts to delete IndexedDB databases', async () => {
      await clearIndexedDB();

      expect(mockDeleteDatabase).toHaveBeenCalledWith('oja-offline-db');
    });
  });

  describe('clearServiceWorkerCache', () => {
    it('clears all caches', async () => {
      mockCachesKeys.mockResolvedValue(['cache-1', 'cache-2']);
      mockCachesDelete.mockResolvedValue(true);

      await clearServiceWorkerCache();

      expect(mockCachesKeys).toHaveBeenCalled();
      expect(mockCachesDelete).toHaveBeenCalledWith('cache-1');
      expect(mockCachesDelete).toHaveBeenCalledWith('cache-2');
    });

    it('handles empty cache list', async () => {
      mockCachesKeys.mockResolvedValue([]);

      await clearServiceWorkerCache();

      expect(mockCachesKeys).toHaveBeenCalled();
      expect(mockCachesDelete).not.toHaveBeenCalled();
    });
  });

  describe('deleteSupabaseAccount', () => {
    it('returns success (placeholder implementation)', async () => {
      const result = await deleteSupabaseAccount();

      expect(result.success).toBe(true);
    });
  });

  describe('deleteAccount', () => {
    beforeEach(() => {
      mockCachesKeys.mockResolvedValue([]);
    });

    it('clears all local data', async () => {
      const result = await deleteAccount();

      expect(result.clearedLocal).toBe(true);
      expect(result.clearedIndexedDB).toBe(true);
      expect(result.clearedCache).toBe(true);
    });

    it('returns success when all operations complete', async () => {
      const result = await deleteAccount();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('deletes server data', async () => {
      const result = await deleteAccount();

      expect(result.deletedServerData).toBe(true);
    });
  });

  describe('DELETION_CONFIRMATION_TEXT', () => {
    it('is DELETE', () => {
      expect(DELETION_CONFIRMATION_TEXT).toBe('DELETE');
    });
  });

  describe('isValidDeletionConfirmation', () => {
    it('returns true for exact match', () => {
      expect(isValidDeletionConfirmation('DELETE')).toBe(true);
    });

    it('returns true with surrounding whitespace', () => {
      expect(isValidDeletionConfirmation('  DELETE  ')).toBe(true);
    });

    it('returns false for lowercase', () => {
      expect(isValidDeletionConfirmation('delete')).toBe(false);
    });

    it('returns false for partial match', () => {
      expect(isValidDeletionConfirmation('DEL')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidDeletionConfirmation('')).toBe(false);
    });

    it('returns false for extra characters', () => {
      expect(isValidDeletionConfirmation('DELETE!')).toBe(false);
    });
  });
});
