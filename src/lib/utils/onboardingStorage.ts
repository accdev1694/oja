/**
 * Onboarding Storage Utilities
 *
 * Consolidates all onboarding-related localStorage operations.
 * Provides a clean interface for reading, writing, and clearing
 * onboarding state.
 */

import {
  SEEDED_PRODUCTS,
  type SeededProduct,
} from '@/lib/data/seeded-products';

// Storage keys
export const STORAGE_KEYS = {
  ONBOARDING_PRODUCTS: 'onboarding_products',
  DEFAULT_BUDGET: 'oja_default_budget',
  LOCATION_GRANTED: 'oja_location_granted',
  CURRENCY: 'oja_currency',
  COUNTRY: 'oja_country',
  ONBOARDING_COMPLETE: 'oja_onboarding_complete',
  PANTRY_ITEMS: 'oja_pantry_items',
} as const;

// Stock level type
export type StockLevel = 'stocked' | 'good' | 'low' | 'out';

// Stock item structure for pantry
export interface StockItem {
  id: string;
  name: string;
  category: string;
  level: StockLevel;
  createdAt: string;
  deletedAt?: string; // ISO timestamp for soft-delete (items can be restored within 7 days)
  lastKnownPrice?: number | null; // Last recorded price in pence
  priceUpdatedAt?: string; // ISO timestamp of last price update
}

// Onboarding summary for display
export interface OnboardingSummary {
  productsCount: number;
  budget: number | null; // in pence, null if skipped
  currency: string;
  locationEnabled: boolean;
}

/**
 * Check if running in browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get selected product IDs from onboarding
 */
export function getSelectedProductIds(): string[] {
  if (!isBrowser) return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ONBOARDING_PRODUCTS);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Get selected products with full details
 */
export function getSelectedProducts(): SeededProduct[] {
  const ids = getSelectedProductIds();
  return SEEDED_PRODUCTS.filter((p) => ids.includes(p.id));
}

/**
 * Get default budget in pence (null if not set)
 */
export function getDefaultBudget(): number | null {
  if (!isBrowser) return null;

  const stored = localStorage.getItem(STORAGE_KEYS.DEFAULT_BUDGET);
  if (!stored) return null;

  const parsed = parseInt(stored, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Get detected/selected currency
 */
export function getCurrency(): string {
  if (!isBrowser) return 'GBP';
  return localStorage.getItem(STORAGE_KEYS.CURRENCY) || 'GBP';
}

/**
 * Get detected/selected country
 */
export function getCountry(): string {
  if (!isBrowser) return 'GB';
  return localStorage.getItem(STORAGE_KEYS.COUNTRY) || 'GB';
}

/**
 * Check if location was granted
 */
export function isLocationGranted(): boolean {
  if (!isBrowser) return false;
  return localStorage.getItem(STORAGE_KEYS.LOCATION_GRANTED) === 'true';
}

/**
 * Check if onboarding is complete
 */
export function isOnboardingComplete(): boolean {
  if (!isBrowser) return false;
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true';
}

/**
 * Get onboarding summary for display
 */
export function getOnboardingSummary(): OnboardingSummary {
  return {
    productsCount: getSelectedProductIds().length,
    budget: getDefaultBudget(),
    currency: getCurrency(),
    locationEnabled: isLocationGranted(),
  };
}

/**
 * Convert selected products to stock items for pantry
 */
export function createPantryItems(): StockItem[] {
  const products = getSelectedProducts();
  const now = new Date().toISOString();

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    level: 'stocked' as StockLevel,
    createdAt: now,
  }));
}

/**
 * Save pantry items to localStorage
 */
export function savePantryItems(items: StockItem[]): void {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, JSON.stringify(items));
}

/**
 * Get pantry items from localStorage (excluding deleted items)
 */
export function getPantryItems(): StockItem[] {
  if (!isBrowser) return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PANTRY_ITEMS);
    if (!stored) return [];
    const allItems = JSON.parse(stored) as StockItem[];
    // Filter out soft-deleted items
    return allItems.filter((item) => !item.deletedAt);
  } catch {
    return [];
  }
}

/**
 * Mark onboarding as complete and populate pantry
 */
export function completeOnboarding(): void {
  if (!isBrowser) return;

  // Create pantry items from selected products
  const pantryItems = createPantryItems();
  savePantryItems(pantryItems);

  // Mark onboarding as complete
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
}

/**
 * Clear all onboarding data (for testing or reset)
 */
export function clearOnboardingData(): void {
  if (!isBrowser) return;

  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

/**
 * Format budget for display
 */
export function formatBudget(
  pence: number | null,
  currency: string = 'GBP'
): string {
  if (pence === null) return 'Not set';

  const symbols: Record<string, string> = {
    GBP: '£',
    USD: '$',
    EUR: '€',
  };

  const symbol = symbols[currency] || currency;
  return `${symbol}${(pence / 100).toFixed(0)}/week`;
}

/**
 * Generate a unique ID for pantry items
 */
export function generatePantryItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * New item input (without id and createdAt)
 */
export interface NewPantryItem {
  name: string;
  category: string;
  level?: StockLevel;
}

/**
 * Add a new item to the pantry
 * Returns the created item with generated id and timestamp
 */
export function addPantryItem(item: NewPantryItem): StockItem {
  const newItem: StockItem = {
    id: generatePantryItemId(),
    name: item.name.trim(),
    category: item.category,
    level: item.level || 'stocked',
    createdAt: new Date().toISOString(),
  };

  const items = getPantryItems();
  items.push(newItem);
  savePantryItems(items);

  return newItem;
}

/**
 * Update an existing pantry item
 */
export function updatePantryItem(
  id: string,
  updates: Partial<Omit<StockItem, 'id' | 'createdAt'>>
): StockItem | null {
  const items = getPantryItems();
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) return null;

  items[index] = {
    ...items[index],
    ...updates,
  };

  savePantryItems(items);
  return items[index];
}

/**
 * Update the last known price for a pantry item
 * Called when an item's actual price is recorded during shopping
 */
export function updatePantryItemPrice(
  id: string,
  priceInPence: number
): StockItem | null {
  const items = getAllPantryItems();
  const index = items.findIndex((item) => item.id === id && !item.deletedAt);

  if (index === -1) return null;

  items[index] = {
    ...items[index],
    lastKnownPrice: priceInPence,
    priceUpdatedAt: new Date().toISOString(),
  };

  savePantryItems(items);
  return items[index];
}

/**
 * Remove a pantry item by ID (soft-delete)
 * Items are marked as deleted but can be restored within 7 days
 */
export function removePantryItem(id: string): boolean {
  const items = getAllPantryItems(); // Get all items including deleted
  const item = items.find((item) => item.id === id);

  if (!item) return false;

  // Soft-delete: mark with deletedAt timestamp
  const updated = items.map((item) =>
    item.id === id ? { ...item, deletedAt: new Date().toISOString() } : item
  );

  savePantryItems(updated);
  return true;
}

/**
 * Restore a soft-deleted pantry item
 */
export function restorePantryItem(id: string): boolean {
  const items = getAllPantryItems();
  const item = items.find((item) => item.id === id);

  if (!item || !item.deletedAt) return false;

  // Remove deletedAt field to restore
  const updated = items.map((item) =>
    item.id === id ? { ...item, deletedAt: undefined } : item
  );

  savePantryItems(updated);
  return true;
}

/**
 * Permanently delete items that have been soft-deleted for more than 7 days
 */
export function cleanupDeletedItems(): number {
  const items = getAllPantryItems();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const cleaned = items.filter((item) => {
    if (!item.deletedAt) return true; // Keep active items
    const deletedDate = new Date(item.deletedAt);
    return deletedDate > sevenDaysAgo; // Keep recently deleted items
  });

  const removedCount = items.length - cleaned.length;
  if (removedCount > 0) {
    savePantryItems(cleaned);
  }

  return removedCount;
}

/**
 * Get all pantry items including deleted ones
 */
function getAllPantryItems(): StockItem[] {
  if (!isBrowser) return [];

  const stored = localStorage.getItem(STORAGE_KEYS.PANTRY_ITEMS);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as StockItem[];
  } catch {
    return [];
  }
}

/**
 * Check if an item with the same name already exists
 */
export function pantryItemExists(name: string): boolean {
  const items = getPantryItems();
  const normalizedName = name.trim().toLowerCase();
  return items.some((item) => item.name.toLowerCase() === normalizedName);
}
