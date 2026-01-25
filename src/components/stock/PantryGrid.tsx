'use client';

import { memo, useMemo } from 'react';
import { type StockItem } from '@/lib/utils/onboardingStorage';
import { PantryItem } from './PantryItem';
import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from '@/lib/data/seeded-products';
import { sortByStockLevel } from '@/lib/utils/stockLevel';

interface PantryGridProps {
  /** Stock items to display */
  items: StockItem[];
  /** Whether to group items by category */
  groupByCategory?: boolean;
  /** Callback when an item is clicked */
  onItemClick?: (item: StockItem) => void;
  /** Callback when an item is long-pressed */
  onItemLongPress?: (item: StockItem) => void;
  /** Callback when an item is swiped left */
  onItemSwipeLeft?: (item: StockItem) => void;
  /** Callback when an item is swiped right (for delete) */
  onItemSwipeRight?: (item: StockItem) => void;
  /** Callback when "Add Item" is clicked (empty state) */
  onAddItem?: () => void;
}

/**
 * Get category info from ID
 */
function getCategoryInfo(categoryId: string) {
  return (
    PRODUCT_CATEGORIES.find((c) => c.id === categoryId) || {
      id: categoryId as ProductCategory,
      name: categoryId,
      emoji: '📦',
    }
  );
}

/**
 * Group items by category
 */
function groupItemsByCategory(items: StockItem[]): Map<string, StockItem[]> {
  const grouped = new Map<string, StockItem[]>();

  // Initialize with all categories in order
  for (const category of PRODUCT_CATEGORIES) {
    grouped.set(category.id, []);
  }

  // Add "other" for unknown categories
  grouped.set('other', []);

  // Sort items into categories
  for (const item of items) {
    const categoryItems = grouped.get(item.category) || grouped.get('other')!;
    categoryItems.push(item);
    if (!grouped.has(item.category)) {
      grouped.set('other', categoryItems);
    }
  }

  // Remove empty categories
  for (const [key, value] of grouped) {
    if (value.length === 0) {
      grouped.delete(key);
    }
  }

  return grouped;
}

/**
 * Empty State Component
 */
function EmptyState({ onAddItem }: { onAddItem?: () => void }) {
  return (
    <div className="text-center py-16 px-4" data-testid="pantry-empty-state">
      <span className="text-6xl mb-4 block" role="img" aria-hidden="true">
        🛒
      </span>
      <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
        Your pantry is empty
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-6 max-w-xs mx-auto">
        Start tracking your household inventory by adding items to your pantry.
      </p>
      <button
        type="button"
        onClick={onAddItem}
        disabled={!onAddItem}
        className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white font-medium rounded-xl transition-all hover:bg-[var(--color-primary-hover)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        data-testid="add-item-button"
      >
        <span className="text-lg">+</span>
        Add Item
      </button>
      {!onAddItem && (
        <p className="text-xs text-[var(--color-text-secondary)] mt-3">
          Adding items coming soon in Story 3-2
        </p>
      )}
    </div>
  );
}

/**
 * Category Header Component
 */
function CategoryHeader({ categoryId }: { categoryId: string }) {
  const categoryInfo = getCategoryInfo(categoryId);

  return (
    <div
      className="flex items-center gap-2 mb-3 mt-6 first:mt-0"
      data-testid={`category-header-${categoryId}`}
    >
      <span className="text-xl" role="img" aria-hidden="true">
        {categoryInfo.emoji}
      </span>
      <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide">
        {categoryInfo.name}
      </h2>
    </div>
  );
}

/**
 * Item Grid Component (for rendering the actual grid)
 */
function ItemGrid({
  items,
  onItemClick,
  onItemLongPress,
  onItemSwipeLeft,
  onItemSwipeRight,
}: {
  items: StockItem[];
  onItemClick?: (item: StockItem) => void;
  onItemLongPress?: (item: StockItem) => void;
  onItemSwipeLeft?: (item: StockItem) => void;
  onItemSwipeRight?: (item: StockItem) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 gap-3"
      data-testid="pantry-grid"
    >
      {items.map((item) => (
        <PantryItem
          key={item.id}
          item={item}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
          onLongPress={
            onItemLongPress ? () => onItemLongPress(item) : undefined
          }
          onSwipeLeft={
            onItemSwipeLeft ? () => onItemSwipeLeft(item) : undefined
          }
          onSwipeRight={
            onItemSwipeRight ? () => onItemSwipeRight(item) : undefined
          }
        />
      ))}
    </div>
  );
}

/**
 * Pantry Grid Component
 *
 * Displays stock items in a responsive grid with optional category grouping.
 */
function PantryGridComponent({
  items,
  groupByCategory = false,
  onItemClick,
  onItemLongPress,
  onItemSwipeLeft,
  onItemSwipeRight,
  onAddItem,
}: PantryGridProps) {
  // Memoize sorted and grouped items
  const sortedItems = useMemo(() => sortByStockLevel(items), [items]);

  const groupedItems = useMemo(
    () => (groupByCategory ? groupItemsByCategory(sortedItems) : null),
    [sortedItems, groupByCategory]
  );

  // Empty state
  if (items.length === 0) {
    return <EmptyState onAddItem={onAddItem} />;
  }

  // Grouped view
  if (groupByCategory && groupedItems) {
    return (
      <div data-testid="pantry-grid-grouped">
        {Array.from(groupedItems.entries()).map(
          ([categoryId, categoryItems]) => (
            <div key={categoryId}>
              <CategoryHeader categoryId={categoryId} />
              <ItemGrid
                items={categoryItems}
                onItemClick={onItemClick}
                onItemLongPress={onItemLongPress}
                onItemSwipeLeft={onItemSwipeLeft}
                onItemSwipeRight={onItemSwipeRight}
              />
            </div>
          )
        )}
      </div>
    );
  }

  // Flat view (sorted by stock level)
  return (
    <ItemGrid
      items={sortedItems}
      onItemClick={onItemClick}
      onItemLongPress={onItemLongPress}
      onItemSwipeLeft={onItemSwipeLeft}
      onItemSwipeRight={onItemSwipeRight}
    />
  );
}

/**
 * Memoized PantryGrid to prevent unnecessary re-renders
 */
export const PantryGrid = memo(PantryGridComponent);
