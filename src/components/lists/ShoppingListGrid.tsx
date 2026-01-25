'use client';

import { memo, useMemo } from 'react';
import { type ShoppingList } from '@/lib/utils/shoppingListStorage';
import { ShoppingListCard } from './ShoppingListCard';
import { type ListFilter } from './ListFilterTabs';

interface ShoppingListGridProps {
  /** Shopping lists to display */
  lists: ShoppingList[];
  /** Callback when a list is clicked */
  onListClick?: (list: ShoppingList) => void;
  /** Callback when "New List" is clicked (empty state) */
  onNewList?: () => void;
  /** Filter to apply to lists */
  filter?: ListFilter;
}

/**
 * Empty State Component
 */
function EmptyState({
  onNewList,
  filter,
}: {
  onNewList?: () => void;
  filter?: ListFilter;
}) {
  // Show different messages based on filter
  if (filter === 'completed') {
    return (
      <div
        className="text-center py-16 px-4"
        data-testid="lists-empty-state-completed"
      >
        <span className="text-6xl mb-4 block" role="img" aria-hidden="true">
          📋
        </span>
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
          No completed trips yet
        </h2>
        <p className="text-[var(--color-text-secondary)] max-w-xs mx-auto">
          Complete a shopping trip to see your history here.
        </p>
      </div>
    );
  }

  if (filter === 'active') {
    return (
      <div
        className="text-center py-16 px-4"
        data-testid="lists-empty-state-active"
      >
        <span className="text-6xl mb-4 block" role="img" aria-hidden="true">
          📝
        </span>
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
          No active lists
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-6 max-w-xs mx-auto">
          Create a new shopping list to get started.
        </p>
        <button
          type="button"
          onClick={onNewList}
          disabled={!onNewList}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white font-medium rounded-xl transition-all hover:bg-[var(--color-primary-hover)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          data-testid="new-list-button"
        >
          <span className="text-lg">+</span>
          New List
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-16 px-4" data-testid="lists-empty-state">
      <span className="text-6xl mb-4 block" role="img" aria-hidden="true">
        📝
      </span>
      <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
        No shopping lists yet
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-6 max-w-xs mx-auto">
        Create your first shopping list and start tracking what you need to buy.
      </p>
      <button
        type="button"
        onClick={onNewList}
        disabled={!onNewList}
        className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white font-medium rounded-xl transition-all hover:bg-[var(--color-primary-hover)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        data-testid="new-list-button"
      >
        <span className="text-lg">+</span>
        New List
      </button>
    </div>
  );
}

/**
 * Filter lists by status
 */
function filterLists(
  lists: ShoppingList[],
  filter: ListFilter | undefined
): ShoppingList[] {
  if (!filter || filter === 'all') {
    return lists;
  }

  if (filter === 'active') {
    return lists.filter(
      (list) => list.status === 'active' || list.status === 'shopping'
    );
  }

  if (filter === 'completed') {
    return lists.filter(
      (list) => list.status === 'completed' || list.status === 'archived'
    );
  }

  return lists;
}

/**
 * Shopping List Grid Component
 *
 * Displays shopping lists in a responsive grid.
 * Lists are sorted by most recent first, with active/shopping lists prioritized.
 * Supports filtering by status (active, completed, all).
 */
function ShoppingListGridComponent({
  lists,
  onListClick,
  onNewList,
  filter,
}: ShoppingListGridProps) {
  // Filter lists based on selected filter
  const filteredLists = useMemo(
    () => filterLists(lists, filter),
    [lists, filter]
  );

  // Memoize sorted lists - prioritize active/shopping, then sort by date
  const sortedLists = useMemo(() => {
    return [...filteredLists].sort((a, b) => {
      // Priority: active > shopping > completed > archived
      const statusOrder: Record<ShoppingList['status'], number> = {
        active: 0,
        shopping: 1,
        completed: 2,
        archived: 3,
      };

      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Then sort by date (most recent first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredLists]);

  // Empty state - show when filtered list is empty
  if (filteredLists.length === 0) {
    return <EmptyState onNewList={onNewList} filter={filter} />;
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      data-testid="shopping-list-grid"
      role="tabpanel"
      id={`list-panel-${filter || 'all'}`}
    >
      {sortedLists.map((list) => (
        <ShoppingListCard
          key={list.id}
          list={list}
          onClick={onListClick ? () => onListClick(list) : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Memoized ShoppingListGrid to prevent unnecessary re-renders
 */
export const ShoppingListGrid = memo(ShoppingListGridComponent);
