/**
 * Shopping List Storage Utilities
 *
 * Provides localStorage operations for shopping lists and items.
 * Supports auto-adding "Out" items from pantry.
 */

import { getPantryItems, type StockItem } from './onboardingStorage';

// Storage keys
export const SHOPPING_STORAGE_KEYS = {
  SHOPPING_LISTS: 'oja_shopping_lists',
  SHOPPING_LIST_ITEMS: 'oja_shopping_list_items',
} as const;

// Shopping list status
export type ShoppingListStatus =
  | 'active'
  | 'shopping'
  | 'completed'
  | 'archived';

// Item priority
export type ItemPriority = 'need' | 'want' | 'impulse';

// Shopping list structure
export interface ShoppingList {
  id: string;
  name: string;
  status: ShoppingListStatus;
  budget: number | null; // in pence
  createdAt: string;
  completedAt: string | null;
}

// Shopping list item structure
export interface ShoppingListItem {
  id: string;
  listId: string;
  name: string;
  quantity: number;
  unit: string | null;
  estimatedPrice: number | null; // in pence
  actualPrice: number | null; // in pence
  isChecked: boolean;
  priority: ItemPriority;
  isAutoAdded: boolean;
  pantryItemId: string | null; // Link back to pantry
  category: string | null;
  addedAt: string;
}

// New shopping list input
export interface NewShoppingList {
  name: string;
  budget?: number | null;
}

// New shopping list item input
export interface NewShoppingListItem {
  name: string;
  quantity?: number;
  unit?: string | null;
  estimatedPrice?: number | null;
  priority?: ItemPriority;
  isAutoAdded?: boolean;
  pantryItemId?: string | null;
  category?: string | null;
}

/**
 * Check if running in browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Generate a unique ID
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Shopping Lists CRUD
// ============================================================================

/**
 * Get all shopping lists
 */
export function getShoppingLists(): ShoppingList[] {
  if (!isBrowser) return [];

  try {
    const stored = localStorage.getItem(SHOPPING_STORAGE_KEYS.SHOPPING_LISTS);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save shopping lists to localStorage
 */
export function saveShoppingLists(lists: ShoppingList[]): void {
  if (!isBrowser) return;
  localStorage.setItem(
    SHOPPING_STORAGE_KEYS.SHOPPING_LISTS,
    JSON.stringify(lists)
  );
}

/**
 * Get a shopping list by ID
 */
export function getShoppingList(id: string): ShoppingList | null {
  const lists = getShoppingLists();
  return lists.find((list) => list.id === id) || null;
}

/**
 * Get the active shopping list (if any)
 */
export function getActiveShoppingList(): ShoppingList | null {
  const lists = getShoppingLists();
  return (
    lists.find(
      (list) => list.status === 'active' || list.status === 'shopping'
    ) || null
  );
}

/**
 * Create a new shopping list
 * Automatically adds all "Out" items from pantry
 */
export function createShoppingList(input: NewShoppingList): ShoppingList {
  const now = new Date().toISOString();

  const newList: ShoppingList = {
    id: generateId('list'),
    name: input.name.trim(),
    status: 'active',
    budget: input.budget ?? null,
    createdAt: now,
    completedAt: null,
  };

  const lists = getShoppingLists();
  lists.push(newList);
  saveShoppingLists(lists);

  // Auto-add "Out" items from pantry
  autoAddOutItemsToList(newList.id);

  return newList;
}

/**
 * Update a shopping list
 */
export function updateShoppingList(
  id: string,
  updates: Partial<Omit<ShoppingList, 'id' | 'createdAt'>>
): ShoppingList | null {
  const lists = getShoppingLists();
  const index = lists.findIndex((list) => list.id === id);

  if (index === -1) return null;

  lists[index] = {
    ...lists[index],
    ...updates,
  };

  saveShoppingLists(lists);
  return lists[index];
}

/**
 * Delete a shopping list and its items
 */
export function deleteShoppingList(id: string): boolean {
  const lists = getShoppingLists();
  const filtered = lists.filter((list) => list.id !== id);

  if (filtered.length === lists.length) return false;

  saveShoppingLists(filtered);

  // Also delete all items for this list
  const items = getShoppingListItems();
  const filteredItems = items.filter((item) => item.listId !== id);
  saveShoppingListItems(filteredItems);

  return true;
}

// ============================================================================
// Shopping List Items CRUD
// ============================================================================

/**
 * Get all shopping list items
 */
export function getShoppingListItems(): ShoppingListItem[] {
  if (!isBrowser) return [];

  try {
    const stored = localStorage.getItem(
      SHOPPING_STORAGE_KEYS.SHOPPING_LIST_ITEMS
    );
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save shopping list items to localStorage
 */
export function saveShoppingListItems(items: ShoppingListItem[]): void {
  if (!isBrowser) return;
  localStorage.setItem(
    SHOPPING_STORAGE_KEYS.SHOPPING_LIST_ITEMS,
    JSON.stringify(items)
  );
}

/**
 * Get items for a specific shopping list
 */
export function getItemsForList(listId: string): ShoppingListItem[] {
  const items = getShoppingListItems();
  return items.filter((item) => item.listId === listId);
}

/**
 * Add an item to a shopping list
 */
export function addShoppingListItem(
  listId: string,
  input: NewShoppingListItem
): ShoppingListItem {
  const now = new Date().toISOString();

  const newItem: ShoppingListItem = {
    id: generateId('item'),
    listId,
    name: input.name.trim(),
    quantity: input.quantity ?? 1,
    unit: input.unit ?? null,
    estimatedPrice: input.estimatedPrice ?? null,
    actualPrice: null,
    isChecked: false,
    priority: input.priority ?? 'need',
    isAutoAdded: input.isAutoAdded ?? false,
    pantryItemId: input.pantryItemId ?? null,
    category: input.category ?? null,
    addedAt: now,
  };

  const items = getShoppingListItems();
  items.push(newItem);
  saveShoppingListItems(items);

  return newItem;
}

/**
 * Update a shopping list item
 */
export function updateShoppingListItem(
  id: string,
  updates: Partial<Omit<ShoppingListItem, 'id' | 'listId' | 'addedAt'>>
): ShoppingListItem | null {
  const items = getShoppingListItems();
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) return null;

  items[index] = {
    ...items[index],
    ...updates,
  };

  saveShoppingListItems(items);
  return items[index];
}

/**
 * Remove a shopping list item
 */
export function removeShoppingListItem(id: string): boolean {
  const items = getShoppingListItems();
  const filtered = items.filter((item) => item.id !== id);

  if (filtered.length === items.length) return false;

  saveShoppingListItems(filtered);
  return true;
}

/**
 * Check if a pantry item is already in a shopping list
 */
export function isPantryItemInList(
  listId: string,
  pantryItemId: string
): boolean {
  const items = getItemsForList(listId);
  return items.some((item) => item.pantryItemId === pantryItemId);
}

// ============================================================================
// Auto-Add Functions
// ============================================================================

/**
 * Get all "Out" items from pantry
 */
export function getOutPantryItems(): StockItem[] {
  const items = getPantryItems();
  return items.filter((item) => item.level === 'out');
}

/**
 * Auto-add all "Out" pantry items to a shopping list
 * Only adds items not already in the list
 */
export function autoAddOutItemsToList(listId: string): ShoppingListItem[] {
  const outItems = getOutPantryItems();
  const addedItems: ShoppingListItem[] = [];

  for (const pantryItem of outItems) {
    // Skip if already in list
    if (isPantryItemInList(listId, pantryItem.id)) {
      continue;
    }

    const newItem = addShoppingListItem(listId, {
      name: pantryItem.name,
      isAutoAdded: true,
      pantryItemId: pantryItem.id,
      category: pantryItem.category,
      priority: 'need',
    });

    addedItems.push(newItem);
  }

  return addedItems;
}

/**
 * Auto-add a single pantry item to the active shopping list
 * Returns the added item, or null if no active list or already in list
 */
export function autoAddItemToActiveList(
  pantryItem: StockItem
): ShoppingListItem | null {
  const activeList = getActiveShoppingList();

  if (!activeList) {
    return null;
  }

  // Check if already in list
  if (isPantryItemInList(activeList.id, pantryItem.id)) {
    return null;
  }

  return addShoppingListItem(activeList.id, {
    name: pantryItem.name,
    isAutoAdded: true,
    pantryItemId: pantryItem.id,
    category: pantryItem.category,
    priority: 'need',
  });
}

/**
 * Get count of auto-added items in a list
 */
export function getAutoAddedItemCount(listId: string): number {
  const items = getItemsForList(listId);
  return items.filter((item) => item.isAutoAdded).length;
}

/**
 * Clear all shopping data (for testing or reset)
 */
export function clearShoppingData(): void {
  if (!isBrowser) return;

  localStorage.removeItem(SHOPPING_STORAGE_KEYS.SHOPPING_LISTS);
  localStorage.removeItem(SHOPPING_STORAGE_KEYS.SHOPPING_LIST_ITEMS);
}
