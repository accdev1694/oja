import {
  SHOPPING_STORAGE_KEYS,
  getShoppingLists,
  saveShoppingLists,
  getShoppingList,
  getActiveShoppingList,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  getShoppingListItems,
  getItemsForList,
  addShoppingListItem,
  updateShoppingListItem,
  removeShoppingListItem,
  isPantryItemInList,
  getOutPantryItems,
  autoAddOutItemsToList,
  autoAddItemToActiveList,
  getAutoAddedItemCount,
  clearShoppingData,
  generateId,
  type ShoppingList,
} from '@/lib/utils/shoppingListStorage';
import * as onboardingStorage from '@/lib/utils/onboardingStorage';

// Mock onboardingStorage
jest.mock('@/lib/utils/onboardingStorage', () => ({
  getPantryItems: jest.fn(),
}));

const mockGetPantryItems = onboardingStorage.getPantryItems as jest.Mock;

describe('shoppingListStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockGetPantryItems.mockReturnValue([]);
  });

  describe('generateId', () => {
    it('generates unique IDs with prefix', () => {
      const id1 = generateId('list');
      const id2 = generateId('list');

      expect(id1).toMatch(/^list-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^list-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Shopping Lists CRUD', () => {
    describe('getShoppingLists', () => {
      it('returns empty array when no lists exist', () => {
        expect(getShoppingLists()).toEqual([]);
      });

      it('returns stored lists', () => {
        const lists: ShoppingList[] = [
          {
            id: 'list-1',
            name: 'Weekly Shop',
            status: 'active',
            budget: 5000,
            createdAt: '2024-01-01T00:00:00.000Z',
            completedAt: null,
          },
        ];
        localStorage.setItem(
          SHOPPING_STORAGE_KEYS.SHOPPING_LISTS,
          JSON.stringify(lists)
        );

        expect(getShoppingLists()).toEqual(lists);
      });

      it('returns empty array on parse error', () => {
        localStorage.setItem(
          SHOPPING_STORAGE_KEYS.SHOPPING_LISTS,
          'invalid json'
        );

        expect(getShoppingLists()).toEqual([]);
      });
    });

    describe('saveShoppingLists', () => {
      it('saves lists to localStorage', () => {
        const lists: ShoppingList[] = [
          {
            id: 'list-1',
            name: 'Test List',
            status: 'active',
            budget: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            completedAt: null,
          },
        ];

        saveShoppingLists(lists);

        expect(localStorage.getItem(SHOPPING_STORAGE_KEYS.SHOPPING_LISTS)).toBe(
          JSON.stringify(lists)
        );
      });
    });

    describe('getShoppingList', () => {
      it('returns null when list not found', () => {
        expect(getShoppingList('non-existent')).toBeNull();
      });

      it('returns the matching list', () => {
        const lists: ShoppingList[] = [
          {
            id: 'list-1',
            name: 'Weekly Shop',
            status: 'active',
            budget: 5000,
            createdAt: '2024-01-01T00:00:00.000Z',
            completedAt: null,
          },
        ];
        saveShoppingLists(lists);

        expect(getShoppingList('list-1')).toEqual(lists[0]);
      });
    });

    describe('getActiveShoppingList', () => {
      it('returns null when no active list', () => {
        expect(getActiveShoppingList()).toBeNull();
      });

      it('returns active list', () => {
        const lists: ShoppingList[] = [
          {
            id: 'list-1',
            name: 'Completed',
            status: 'completed',
            budget: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            completedAt: '2024-01-02T00:00:00.000Z',
          },
          {
            id: 'list-2',
            name: 'Active',
            status: 'active',
            budget: null,
            createdAt: '2024-01-03T00:00:00.000Z',
            completedAt: null,
          },
        ];
        saveShoppingLists(lists);

        expect(getActiveShoppingList()?.id).toBe('list-2');
      });

      it('returns shopping status list as active', () => {
        const lists: ShoppingList[] = [
          {
            id: 'list-1',
            name: 'Shopping',
            status: 'shopping',
            budget: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            completedAt: null,
          },
        ];
        saveShoppingLists(lists);

        expect(getActiveShoppingList()?.id).toBe('list-1');
      });
    });

    describe('createShoppingList', () => {
      it('creates a new list', () => {
        const list = createShoppingList({ name: 'Weekly Shop' });

        expect(list.name).toBe('Weekly Shop');
        expect(list.status).toBe('active');
        expect(list.budget).toBeNull();
        expect(list.id).toMatch(/^list-/);
      });

      it('creates list with budget', () => {
        const list = createShoppingList({ name: 'Budget Shop', budget: 5000 });

        expect(list.budget).toBe(5000);
      });

      it('trims name', () => {
        const list = createShoppingList({ name: '  Test List  ' });

        expect(list.name).toBe('Test List');
      });

      it('adds list to storage', () => {
        createShoppingList({ name: 'Test' });

        expect(getShoppingLists()).toHaveLength(1);
      });
    });

    describe('updateShoppingList', () => {
      it('returns null for non-existent list', () => {
        expect(
          updateShoppingList('non-existent', { name: 'Updated' })
        ).toBeNull();
      });

      it('updates list properties', () => {
        const list = createShoppingList({ name: 'Original' });
        const updated = updateShoppingList(list.id, {
          name: 'Updated',
          status: 'completed',
          budget: 3000,
        });

        expect(updated?.name).toBe('Updated');
        expect(updated?.status).toBe('completed');
        expect(updated?.budget).toBe(3000);
      });

      it('persists changes', () => {
        const list = createShoppingList({ name: 'Original' });
        updateShoppingList(list.id, { name: 'Updated' });

        const stored = getShoppingList(list.id);
        expect(stored?.name).toBe('Updated');
      });
    });

    describe('deleteShoppingList', () => {
      it('returns false for non-existent list', () => {
        expect(deleteShoppingList('non-existent')).toBe(false);
      });

      it('deletes list', () => {
        const list = createShoppingList({ name: 'To Delete' });
        expect(deleteShoppingList(list.id)).toBe(true);
        expect(getShoppingList(list.id)).toBeNull();
      });

      it('also deletes list items', () => {
        const list = createShoppingList({ name: 'Test' });
        addShoppingListItem(list.id, { name: 'Item 1' });
        addShoppingListItem(list.id, { name: 'Item 2' });

        expect(getItemsForList(list.id)).toHaveLength(2);

        deleteShoppingList(list.id);

        expect(getItemsForList(list.id)).toHaveLength(0);
      });
    });
  });

  describe('Shopping List Items CRUD', () => {
    let testList: ShoppingList;

    beforeEach(() => {
      testList = createShoppingList({ name: 'Test List' });
    });

    describe('getShoppingListItems', () => {
      it('returns empty array when no items', () => {
        expect(getShoppingListItems()).toEqual([]);
      });

      it('returns stored items', () => {
        addShoppingListItem(testList.id, { name: 'Item 1' });
        addShoppingListItem(testList.id, { name: 'Item 2' });

        expect(getShoppingListItems()).toHaveLength(2);
      });
    });

    describe('getItemsForList', () => {
      it('returns only items for specified list', () => {
        const list2 = createShoppingList({ name: 'List 2' });

        addShoppingListItem(testList.id, { name: 'Item 1' });
        addShoppingListItem(testList.id, { name: 'Item 2' });
        addShoppingListItem(list2.id, { name: 'Item 3' });

        expect(getItemsForList(testList.id)).toHaveLength(2);
        expect(getItemsForList(list2.id)).toHaveLength(1);
      });
    });

    describe('addShoppingListItem', () => {
      it('adds item with defaults', () => {
        const item = addShoppingListItem(testList.id, { name: 'Milk' });

        expect(item.name).toBe('Milk');
        expect(item.listId).toBe(testList.id);
        expect(item.quantity).toBe(1);
        expect(item.isChecked).toBe(false);
        expect(item.priority).toBe('need');
        expect(item.isAutoAdded).toBe(false);
        expect(item.pantryItemId).toBeNull();
      });

      it('adds item with custom values', () => {
        const item = addShoppingListItem(testList.id, {
          name: 'Bread',
          quantity: 2,
          priority: 'want',
          isAutoAdded: true,
          pantryItemId: 'pantry-1',
          category: 'bakery',
        });

        expect(item.quantity).toBe(2);
        expect(item.priority).toBe('want');
        expect(item.isAutoAdded).toBe(true);
        expect(item.pantryItemId).toBe('pantry-1');
        expect(item.category).toBe('bakery');
      });

      it('trims name', () => {
        const item = addShoppingListItem(testList.id, { name: '  Milk  ' });

        expect(item.name).toBe('Milk');
      });
    });

    describe('updateShoppingListItem', () => {
      it('returns null for non-existent item', () => {
        expect(
          updateShoppingListItem('non-existent', { isChecked: true })
        ).toBeNull();
      });

      it('updates item properties', () => {
        const item = addShoppingListItem(testList.id, { name: 'Milk' });
        const updated = updateShoppingListItem(item.id, {
          isChecked: true,
          actualPrice: 150,
        });

        expect(updated?.isChecked).toBe(true);
        expect(updated?.actualPrice).toBe(150);
      });
    });

    describe('removeShoppingListItem', () => {
      it('returns false for non-existent item', () => {
        expect(removeShoppingListItem('non-existent')).toBe(false);
      });

      it('removes item', () => {
        const item = addShoppingListItem(testList.id, { name: 'Milk' });
        expect(removeShoppingListItem(item.id)).toBe(true);
        expect(getItemsForList(testList.id)).toHaveLength(0);
      });
    });

    describe('isPantryItemInList', () => {
      it('returns false when item not in list', () => {
        expect(isPantryItemInList(testList.id, 'pantry-1')).toBe(false);
      });

      it('returns true when item in list', () => {
        addShoppingListItem(testList.id, {
          name: 'Milk',
          pantryItemId: 'pantry-1',
        });

        expect(isPantryItemInList(testList.id, 'pantry-1')).toBe(true);
      });
    });
  });

  describe('Auto-Add Functions', () => {
    describe('getOutPantryItems', () => {
      it('returns only out items', () => {
        mockGetPantryItems.mockReturnValue([
          {
            id: '1',
            name: 'Milk',
            category: 'dairy',
            level: 'out',
            createdAt: '',
          },
          {
            id: '2',
            name: 'Bread',
            category: 'bakery',
            level: 'good',
            createdAt: '',
          },
          {
            id: '3',
            name: 'Eggs',
            category: 'dairy',
            level: 'out',
            createdAt: '',
          },
        ]);

        const outItems = getOutPantryItems();

        expect(outItems).toHaveLength(2);
        expect(outItems.map((i) => i.name)).toEqual(['Milk', 'Eggs']);
      });

      it('returns empty array when no out items', () => {
        mockGetPantryItems.mockReturnValue([
          {
            id: '1',
            name: 'Milk',
            category: 'dairy',
            level: 'stocked',
            createdAt: '',
          },
        ]);

        expect(getOutPantryItems()).toHaveLength(0);
      });
    });

    describe('autoAddOutItemsToList', () => {
      it('adds all out items to list', () => {
        const list = createShoppingList({ name: 'Test' });
        mockGetPantryItems.mockReturnValue([
          {
            id: 'p1',
            name: 'Milk',
            category: 'dairy',
            level: 'out',
            createdAt: '',
          },
          {
            id: 'p2',
            name: 'Eggs',
            category: 'dairy',
            level: 'out',
            createdAt: '',
          },
        ]);

        const added = autoAddOutItemsToList(list.id);

        expect(added).toHaveLength(2);
        expect(added[0].isAutoAdded).toBe(true);
        expect(added[0].pantryItemId).toBe('p1');
      });

      it('does not add duplicates', () => {
        const list = createShoppingList({ name: 'Test' });
        mockGetPantryItems.mockReturnValue([
          {
            id: 'p1',
            name: 'Milk',
            category: 'dairy',
            level: 'out',
            createdAt: '',
          },
        ]);

        // First call adds
        autoAddOutItemsToList(list.id);
        // Second call should not add duplicate
        const added = autoAddOutItemsToList(list.id);

        expect(added).toHaveLength(0);
        expect(getItemsForList(list.id)).toHaveLength(1);
      });

      it('preserves category from pantry item', () => {
        const list = createShoppingList({ name: 'Test' });
        mockGetPantryItems.mockReturnValue([
          {
            id: 'p1',
            name: 'Milk',
            category: 'dairy',
            level: 'out',
            createdAt: '',
          },
        ]);

        const added = autoAddOutItemsToList(list.id);

        expect(added[0].category).toBe('dairy');
      });
    });

    describe('autoAddItemToActiveList', () => {
      it('returns null when no active list', () => {
        const pantryItem = {
          id: 'p1',
          name: 'Milk',
          category: 'dairy',
          level: 'out' as const,
          createdAt: '',
        };

        expect(autoAddItemToActiveList(pantryItem)).toBeNull();
      });

      it('adds item to active list', () => {
        createShoppingList({ name: 'Active List' });
        const pantryItem = {
          id: 'p1',
          name: 'Milk',
          category: 'dairy',
          level: 'out' as const,
          createdAt: '',
        };

        const added = autoAddItemToActiveList(pantryItem);

        expect(added).not.toBeNull();
        expect(added?.name).toBe('Milk');
        expect(added?.isAutoAdded).toBe(true);
      });

      it('returns null if item already in list', () => {
        const list = createShoppingList({ name: 'Active List' });
        addShoppingListItem(list.id, { name: 'Milk', pantryItemId: 'p1' });

        const pantryItem = {
          id: 'p1',
          name: 'Milk',
          category: 'dairy',
          level: 'out' as const,
          createdAt: '',
        };

        expect(autoAddItemToActiveList(pantryItem)).toBeNull();
      });
    });

    describe('getAutoAddedItemCount', () => {
      it('returns count of auto-added items', () => {
        const list = createShoppingList({ name: 'Test' });
        addShoppingListItem(list.id, { name: 'Manual', isAutoAdded: false });
        addShoppingListItem(list.id, { name: 'Auto 1', isAutoAdded: true });
        addShoppingListItem(list.id, { name: 'Auto 2', isAutoAdded: true });

        expect(getAutoAddedItemCount(list.id)).toBe(2);
      });

      it('returns 0 when no auto-added items', () => {
        const list = createShoppingList({ name: 'Test' });
        addShoppingListItem(list.id, { name: 'Manual' });

        expect(getAutoAddedItemCount(list.id)).toBe(0);
      });
    });
  });

  describe('clearShoppingData', () => {
    it('clears all shopping data', () => {
      const list = createShoppingList({ name: 'Test' });
      addShoppingListItem(list.id, { name: 'Item' });

      clearShoppingData();

      expect(getShoppingLists()).toHaveLength(0);
      expect(getShoppingListItems()).toHaveLength(0);
    });
  });
});
