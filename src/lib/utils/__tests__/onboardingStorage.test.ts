import {
  STORAGE_KEYS,
  getSelectedProductIds,
  getSelectedProducts,
  getDefaultBudget,
  getCurrency,
  getCountry,
  isLocationGranted,
  isOnboardingComplete,
  getOnboardingSummary,
  createPantryItems,
  savePantryItems,
  getPantryItems,
  completeOnboarding,
  clearOnboardingData,
  formatBudget,
  generatePantryItemId,
  addPantryItem,
  updatePantryItem,
  removePantryItem,
  pantryItemExists,
  type StockItem,
} from '@/lib/utils/onboardingStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('onboardingStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('STORAGE_KEYS', () => {
    it('exports all storage keys', () => {
      expect(STORAGE_KEYS.ONBOARDING_PRODUCTS).toBe('onboarding_products');
      expect(STORAGE_KEYS.DEFAULT_BUDGET).toBe('oja_default_budget');
      expect(STORAGE_KEYS.LOCATION_GRANTED).toBe('oja_location_granted');
      expect(STORAGE_KEYS.CURRENCY).toBe('oja_currency');
      expect(STORAGE_KEYS.COUNTRY).toBe('oja_country');
      expect(STORAGE_KEYS.ONBOARDING_COMPLETE).toBe('oja_onboarding_complete');
      expect(STORAGE_KEYS.PANTRY_ITEMS).toBe('oja_pantry_items');
    });
  });

  describe('getSelectedProductIds', () => {
    it('returns empty array when no products stored', () => {
      expect(getSelectedProductIds()).toEqual([]);
    });

    it('returns stored product IDs', () => {
      localStorage.setItem(
        STORAGE_KEYS.ONBOARDING_PRODUCTS,
        JSON.stringify(['p1', 'p2', 'p3'])
      );

      expect(getSelectedProductIds()).toEqual(['p1', 'p2', 'p3']);
    });

    it('returns empty array on invalid JSON', () => {
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_PRODUCTS, 'invalid-json');

      expect(getSelectedProductIds()).toEqual([]);
    });
  });

  describe('getSelectedProducts', () => {
    it('returns empty array when no products selected', () => {
      expect(getSelectedProducts()).toEqual([]);
    });

    it('returns products matching stored IDs', () => {
      // Store IDs for some seeded products
      localStorage.setItem(
        STORAGE_KEYS.ONBOARDING_PRODUCTS,
        JSON.stringify(['milk', 'bread', 'eggs'])
      );

      const products = getSelectedProducts();

      expect(products).toHaveLength(3);
      expect(products.map((p) => p.id)).toEqual(['milk', 'bread', 'eggs']);
    });

    it('filters out non-existent product IDs', () => {
      localStorage.setItem(
        STORAGE_KEYS.ONBOARDING_PRODUCTS,
        JSON.stringify(['milk', 'nonexistent-id'])
      );

      const products = getSelectedProducts();

      expect(products).toHaveLength(1);
      expect(products[0].id).toBe('milk');
    });
  });

  describe('getDefaultBudget', () => {
    it('returns null when no budget stored', () => {
      expect(getDefaultBudget()).toBeNull();
    });

    it('returns stored budget as number', () => {
      localStorage.setItem(STORAGE_KEYS.DEFAULT_BUDGET, '5000');

      expect(getDefaultBudget()).toBe(5000);
    });

    it('returns null for invalid number', () => {
      localStorage.setItem(STORAGE_KEYS.DEFAULT_BUDGET, 'not-a-number');

      expect(getDefaultBudget()).toBeNull();
    });
  });

  describe('getCurrency', () => {
    it('returns GBP as default', () => {
      expect(getCurrency()).toBe('GBP');
    });

    it('returns stored currency', () => {
      localStorage.setItem(STORAGE_KEYS.CURRENCY, 'USD');

      expect(getCurrency()).toBe('USD');
    });
  });

  describe('getCountry', () => {
    it('returns GB as default', () => {
      expect(getCountry()).toBe('GB');
    });

    it('returns stored country', () => {
      localStorage.setItem(STORAGE_KEYS.COUNTRY, 'US');

      expect(getCountry()).toBe('US');
    });
  });

  describe('isLocationGranted', () => {
    it('returns false when not set', () => {
      expect(isLocationGranted()).toBe(false);
    });

    it('returns true when set to true', () => {
      localStorage.setItem(STORAGE_KEYS.LOCATION_GRANTED, 'true');

      expect(isLocationGranted()).toBe(true);
    });

    it('returns false when set to false', () => {
      localStorage.setItem(STORAGE_KEYS.LOCATION_GRANTED, 'false');

      expect(isLocationGranted()).toBe(false);
    });
  });

  describe('isOnboardingComplete', () => {
    it('returns false when not set', () => {
      expect(isOnboardingComplete()).toBe(false);
    });

    it('returns true when set to true', () => {
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');

      expect(isOnboardingComplete()).toBe(true);
    });
  });

  describe('getOnboardingSummary', () => {
    it('returns default summary when nothing stored', () => {
      const summary = getOnboardingSummary();

      expect(summary).toEqual({
        productsCount: 0,
        budget: null,
        currency: 'GBP',
        locationEnabled: false,
      });
    });

    it('returns populated summary', () => {
      localStorage.setItem(
        STORAGE_KEYS.ONBOARDING_PRODUCTS,
        JSON.stringify(['milk', 'bread'])
      );
      localStorage.setItem(STORAGE_KEYS.DEFAULT_BUDGET, '7500');
      localStorage.setItem(STORAGE_KEYS.CURRENCY, 'EUR');
      localStorage.setItem(STORAGE_KEYS.LOCATION_GRANTED, 'true');

      const summary = getOnboardingSummary();

      expect(summary).toEqual({
        productsCount: 2,
        budget: 7500,
        currency: 'EUR',
        locationEnabled: true,
      });
    });
  });

  describe('createPantryItems', () => {
    it('returns empty array when no products selected', () => {
      expect(createPantryItems()).toEqual([]);
    });

    it('creates stock items from selected products', () => {
      localStorage.setItem(
        STORAGE_KEYS.ONBOARDING_PRODUCTS,
        JSON.stringify(['milk', 'bread'])
      );

      const items = createPantryItems();

      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({
        id: 'milk',
        name: 'Milk',
        category: 'dairy',
        level: 'stocked',
      });
      expect(items[0].createdAt).toBeDefined();
    });
  });

  describe('savePantryItems and getPantryItems', () => {
    it('saves and retrieves pantry items', () => {
      const items: StockItem[] = [
        {
          id: 'test1',
          name: 'Test Item',
          category: 'Test',
          level: 'stocked',
          createdAt: new Date().toISOString(),
        },
      ];

      savePantryItems(items);
      const retrieved = getPantryItems();

      expect(retrieved).toEqual(items);
    });

    it('returns empty array when no items stored', () => {
      expect(getPantryItems()).toEqual([]);
    });

    it('returns empty array on invalid JSON', () => {
      localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, 'invalid-json');

      expect(getPantryItems()).toEqual([]);
    });
  });

  describe('completeOnboarding', () => {
    it('marks onboarding as complete', () => {
      completeOnboarding();

      expect(isOnboardingComplete()).toBe(true);
    });

    it('creates pantry items from selected products', () => {
      localStorage.setItem(
        STORAGE_KEYS.ONBOARDING_PRODUCTS,
        JSON.stringify(['milk'])
      );

      completeOnboarding();

      const items = getPantryItems();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('milk');
    });
  });

  describe('clearOnboardingData', () => {
    it('clears all onboarding storage keys', () => {
      // Set all keys
      localStorage.setItem(
        STORAGE_KEYS.ONBOARDING_PRODUCTS,
        JSON.stringify(['milk'])
      );
      localStorage.setItem(STORAGE_KEYS.DEFAULT_BUDGET, '5000');
      localStorage.setItem(STORAGE_KEYS.LOCATION_GRANTED, 'true');
      localStorage.setItem(STORAGE_KEYS.CURRENCY, 'USD');
      localStorage.setItem(STORAGE_KEYS.COUNTRY, 'US');
      localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
      localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, JSON.stringify([]));

      clearOnboardingData();

      expect(getSelectedProductIds()).toEqual([]);
      expect(getDefaultBudget()).toBeNull();
      expect(isLocationGranted()).toBe(false);
      expect(getCurrency()).toBe('GBP');
      expect(getCountry()).toBe('GB');
      expect(isOnboardingComplete()).toBe(false);
      expect(getPantryItems()).toEqual([]);
    });
  });

  describe('formatBudget', () => {
    it('returns "Not set" for null budget', () => {
      expect(formatBudget(null)).toBe('Not set');
    });

    it('formats GBP correctly', () => {
      expect(formatBudget(5000, 'GBP')).toBe('£50/week');
    });

    it('formats USD correctly', () => {
      expect(formatBudget(10000, 'USD')).toBe('$100/week');
    });

    it('formats EUR correctly', () => {
      expect(formatBudget(7500, 'EUR')).toBe('€75/week');
    });

    it('uses currency code for unknown currencies', () => {
      expect(formatBudget(5000, 'CAD')).toBe('CAD50/week');
    });

    it('defaults to GBP when currency not provided', () => {
      expect(formatBudget(5000)).toBe('£50/week');
    });
  });

  describe('generatePantryItemId', () => {
    it('generates a string ID', () => {
      const id = generatePantryItemId();
      expect(typeof id).toBe('string');
    });

    it('starts with "item-"', () => {
      const id = generatePantryItemId();
      expect(id.startsWith('item-')).toBe(true);
    });

    it('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generatePantryItemId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('addPantryItem', () => {
    it('adds item to pantry', () => {
      addPantryItem({
        name: 'Test Item',
        category: 'pantry',
      });

      const items = getPantryItems();
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Test Item');
    });

    it('returns the created item with id and createdAt', () => {
      const item = addPantryItem({
        name: 'Test Item',
        category: 'pantry',
      });

      expect(item.id).toBeDefined();
      expect(item.createdAt).toBeDefined();
      expect(item.name).toBe('Test Item');
      expect(item.category).toBe('pantry');
    });

    it('defaults level to stocked', () => {
      const item = addPantryItem({
        name: 'Test Item',
        category: 'pantry',
      });

      expect(item.level).toBe('stocked');
    });

    it('uses provided level', () => {
      const item = addPantryItem({
        name: 'Test Item',
        category: 'pantry',
        level: 'low',
      });

      expect(item.level).toBe('low');
    });

    it('trims whitespace from name', () => {
      const item = addPantryItem({
        name: '  Test Item  ',
        category: 'pantry',
      });

      expect(item.name).toBe('Test Item');
    });

    it('appends to existing items', () => {
      addPantryItem({ name: 'Item 1', category: 'pantry' });
      addPantryItem({ name: 'Item 2', category: 'dairy' });

      const items = getPantryItems();
      expect(items).toHaveLength(2);
    });
  });

  describe('updatePantryItem', () => {
    it('updates an existing item', () => {
      const item = addPantryItem({
        name: 'Test Item',
        category: 'pantry',
      });

      const updated = updatePantryItem(item.id, { level: 'low' });

      expect(updated).not.toBeNull();
      expect(updated?.level).toBe('low');
      expect(updated?.name).toBe('Test Item');
    });

    it('returns null for non-existent item', () => {
      const result = updatePantryItem('non-existent-id', { level: 'low' });

      expect(result).toBeNull();
    });

    it('can update name', () => {
      const item = addPantryItem({
        name: 'Old Name',
        category: 'pantry',
      });

      const updated = updatePantryItem(item.id, { name: 'New Name' });

      expect(updated?.name).toBe('New Name');
    });

    it('can update category', () => {
      const item = addPantryItem({
        name: 'Test',
        category: 'pantry',
      });

      const updated = updatePantryItem(item.id, { category: 'dairy' });

      expect(updated?.category).toBe('dairy');
    });

    it('preserves unmodified fields', () => {
      const item = addPantryItem({
        name: 'Test',
        category: 'pantry',
        level: 'stocked',
      });

      const updated = updatePantryItem(item.id, { level: 'low' });

      expect(updated?.name).toBe('Test');
      expect(updated?.category).toBe('pantry');
      expect(updated?.createdAt).toBe(item.createdAt);
    });

    it('persists changes to storage', () => {
      const item = addPantryItem({
        name: 'Test',
        category: 'pantry',
      });

      updatePantryItem(item.id, { level: 'out' });

      const items = getPantryItems();
      expect(items[0].level).toBe('out');
    });
  });

  describe('removePantryItem', () => {
    it('removes an existing item', () => {
      const item = addPantryItem({
        name: 'Test',
        category: 'pantry',
      });

      const result = removePantryItem(item.id);

      expect(result).toBe(true);
      expect(getPantryItems()).toHaveLength(0);
    });

    it('returns false for non-existent item', () => {
      const result = removePantryItem('non-existent-id');

      expect(result).toBe(false);
    });

    it('only removes the specified item', () => {
      const item1 = addPantryItem({ name: 'Item 1', category: 'pantry' });
      addPantryItem({ name: 'Item 2', category: 'dairy' });

      removePantryItem(item1.id);

      const items = getPantryItems();
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Item 2');
    });
  });

  describe('pantryItemExists', () => {
    it('returns true when item exists', () => {
      addPantryItem({ name: 'Test Item', category: 'pantry' });

      expect(pantryItemExists('Test Item')).toBe(true);
    });

    it('returns false when item does not exist', () => {
      expect(pantryItemExists('Non-existent')).toBe(false);
    });

    it('is case-insensitive', () => {
      addPantryItem({ name: 'Test Item', category: 'pantry' });

      expect(pantryItemExists('test item')).toBe(true);
      expect(pantryItemExists('TEST ITEM')).toBe(true);
    });

    it('trims whitespace', () => {
      addPantryItem({ name: 'Test Item', category: 'pantry' });

      expect(pantryItemExists('  Test Item  ')).toBe(true);
    });
  });
});
