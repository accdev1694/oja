'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getShoppingList,
  getItemsForList,
  addShoppingListItem,
  removeShoppingListItem,
  updateShoppingListItem,
  type ShoppingList,
  type ShoppingListItem,
  type NewShoppingListItem,
} from '@/lib/utils/shoppingListStorage';
import { Card, Toast, useToast } from '@/components/ui';
import { AddItemToListSheet, SwipeableListItem } from '@/components/lists';
import { hapticLight } from '@/lib/utils/haptics';

/**
 * Format budget for display
 */
function formatBudget(pence: number | null): string {
  if (pence === null) return '';
  return `£${(pence / 100).toFixed(2)}`;
}

/**
 * Get status badge configuration
 */
function getStatusConfig(status: ShoppingList['status']) {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        color: 'var(--color-primary)',
        bgColor: 'rgba(255, 107, 53, 0.1)',
      };
    case 'shopping':
      return {
        label: 'Shopping',
        color: 'var(--color-success)',
        bgColor: 'rgba(16, 185, 129, 0.1)',
      };
    case 'completed':
      return {
        label: 'Completed',
        color: 'var(--color-text-secondary)',
        bgColor: 'rgba(156, 163, 175, 0.1)',
      };
    case 'archived':
      return {
        label: 'Archived',
        color: 'var(--color-text-secondary)',
        bgColor: 'rgba(156, 163, 175, 0.1)',
      };
    default:
      return {
        label: status,
        color: 'var(--color-text-secondary)',
        bgColor: 'rgba(156, 163, 175, 0.1)',
      };
  }
}

/**
 * List Item Component
 */
function ListItemRow({
  item,
  onToggleCheck,
}: {
  item: ShoppingListItem;
  onToggleCheck: (item: ShoppingListItem) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-3 border-b border-[var(--color-border)] last:border-0 ${
        item.isChecked ? 'opacity-60' : ''
      }`}
      data-testid={`list-item-${item.id}`}
    >
      {/* Interactive Checkbox */}
      <button
        type="button"
        onClick={() => onToggleCheck(item)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          item.isChecked
            ? 'bg-[var(--color-success)] border-[var(--color-success)]'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        aria-label={
          item.isChecked ? `Uncheck ${item.name}` : `Check off ${item.name}`
        }
        data-testid={`checkbox-${item.id}`}
      >
        {item.isChecked && (
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium text-[var(--color-text)] ${
            item.isChecked ? 'line-through' : ''
          }`}
        >
          {item.name}
          {item.quantity > 1 && (
            <span className="text-[var(--color-text-secondary)] font-normal ml-1">
              x{item.quantity}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.category && (
            <span className="text-xs text-[var(--color-text-secondary)] capitalize">
              {item.category}
            </span>
          )}
          {item.isAutoAdded && (
            <span className="text-xs text-[var(--color-primary)] flex items-center gap-0.5">
              <span role="img" aria-hidden="true">
                ✨
              </span>
              auto-added
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      {item.estimatedPrice !== null && (
        <span className="text-sm font-medium text-[var(--color-text)] font-mono">
          {formatBudget(item.estimatedPrice)}
        </span>
      )}
    </div>
  );
}

/**
 * Empty State for list with no items
 */
function EmptyItemsState() {
  return (
    <div className="text-center py-12 px-4" data-testid="list-empty-state">
      <span className="text-4xl mb-3 block" role="img" aria-hidden="true">
        🛒
      </span>
      <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">
        No items yet
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Add items to your shopping list to get started.
      </p>
    </div>
  );
}

export default function ListDetailPage() {
  const router = useRouter();
  const params = useParams();
  const listId = params.id as string;

  const [list, setList] = useState<ShoppingList | null>(null);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add item sheet state
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Toast for undo functionality
  const { toast, showToast, hideToast } = useToast();

  // Load list and items from localStorage
  useEffect(() => {
    const loadData = () => {
      const shoppingList = getShoppingList(listId);
      const listItems = getItemsForList(listId);

      setList(shoppingList);
      setItems(listItems);
      setIsLoading(false);
    };

    loadData();
  }, [listId]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push('/lists');
  }, [router]);

  // Handle opening add item sheet
  const handleOpenAddSheet = useCallback(() => {
    setAddError(null);
    setIsAddSheetOpen(true);
  }, []);

  // Handle closing add item sheet
  const handleCloseAddSheet = useCallback(() => {
    if (!isAdding) {
      setIsAddSheetOpen(false);
      setAddError(null);
    }
  }, [isAdding]);

  // Handle adding an item
  const handleAddItem = useCallback(
    (newItem: NewShoppingListItem) => {
      setIsAdding(true);
      setAddError(null);

      try {
        // Check for duplicate names
        const existingItem = items.find(
          (item) =>
            item.name.toLowerCase() === newItem.name.trim().toLowerCase()
        );

        if (existingItem) {
          setAddError(`"${newItem.name}" is already in this list`);
          setIsAdding(false);
          return;
        }

        // Add the item
        const addedItem = addShoppingListItem(listId, newItem);

        // Update local state immediately
        setItems((prev) => [...prev, addedItem]);

        // Close the sheet
        setIsAddSheetOpen(false);
      } catch {
        setAddError('Failed to add item. Please try again.');
      } finally {
        setIsAdding(false);
      }
    },
    [items, listId]
  );

  // Handle toggling check state
  const handleToggleCheck = useCallback((itemToToggle: ShoppingListItem) => {
    // Provide haptic feedback
    hapticLight();

    // Toggle the checked state
    const newCheckedState = !itemToToggle.isChecked;

    // Update in localStorage
    updateShoppingListItem(itemToToggle.id, {
      isChecked: newCheckedState,
    });

    // Update local state
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemToToggle.id
          ? { ...item, isChecked: newCheckedState }
          : item
      )
    );
  }, []);

  // Handle removing an item with undo
  const handleRemoveItem = useCallback(
    (itemToRemove: ShoppingListItem) => {
      // Store the item and its index for undo
      const itemIndex = items.findIndex((item) => item.id === itemToRemove.id);

      // Remove from localStorage
      removeShoppingListItem(itemToRemove.id);

      // Update local state immediately
      setItems((prev) => prev.filter((item) => item.id !== itemToRemove.id));

      // Show toast with undo option
      showToast(`"${itemToRemove.name}" removed`, {
        type: 'info',
        onUndo: () => {
          // Restore the item to localStorage by re-adding it
          // We need to restore using the original item data
          const restoredItem = addShoppingListItem(listId, {
            name: itemToRemove.name,
            quantity: itemToRemove.quantity,
            unit: itemToRemove.unit,
            estimatedPrice: itemToRemove.estimatedPrice,
            priority: itemToRemove.priority,
            isAutoAdded: itemToRemove.isAutoAdded,
            pantryItemId: itemToRemove.pantryItemId,
            category: itemToRemove.category,
          });

          // Restore to state at original position
          setItems((prev) => {
            const newItems = [...prev];
            // Insert at original position or at end if position is invalid
            const insertIndex = Math.min(itemIndex, newItems.length);
            newItems.splice(insertIndex, 0, restoredItem);
            return newItems;
          });
        },
      });
    },
    [items, listId, showToast]
  );

  // Get existing pantry item IDs in this list
  const existingPantryItemIds = items
    .filter((item) => item.pantryItemId)
    .map((item) => item.pantryItemId as string);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <span className="text-4xl" role="img" aria-hidden="true">
              📝
            </span>
          </div>
          <p className="text-[var(--color-text-secondary)] mt-2">
            Loading list...
          </p>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl mb-4 block" role="img" aria-hidden="true">
            😕
          </span>
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
            List not found
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            This list may have been deleted.
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="px-6 py-3 bg-[var(--color-primary)] text-white font-medium rounded-xl transition-all hover:bg-[var(--color-primary-hover)] active:scale-[0.98]"
          >
            Back to Lists
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(list.status);
  const autoAddedCount = items.filter((item) => item.isAutoAdded).length;

  // Calculate running total (estimated prices)
  const runningTotal = items.reduce((sum, item) => {
    const price = item.isChecked
      ? (item.actualPrice ?? item.estimatedPrice ?? 0)
      : (item.estimatedPrice ?? 0);
    return sum + price;
  }, 0);

  // Sort items: unchecked first, then by priority (need > want > impulse), then by added date
  const sortedItems = [...items].sort((a, b) => {
    // Checked items go to bottom
    if (a.isChecked !== b.isChecked) {
      return a.isChecked ? 1 : -1;
    }

    // Sort by priority
    const priorityOrder = { need: 0, want: 1, impulse: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Finally by added date
    return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
  });

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-background)] border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <button
              type="button"
              onClick={handleBack}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Back to lists"
            >
              <svg
                className="w-6 h-6 text-[var(--color-text)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[var(--color-text)] truncate">
                  {list.name}
                </h1>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: statusConfig.bgColor,
                    color: statusConfig.color,
                  }}
                >
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {items.length} item{items.length !== 1 ? 's' : ''}
                {autoAddedCount > 0 && ` (${autoAddedCount} auto-added)`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Budget Bar (if budget is set) */}
      {list.budget !== null && (
        <div className="sticky top-[73px] z-10 bg-white border-b border-[var(--color-border)]">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Running Total
              </span>
              <div className="text-right">
                <span className="text-lg font-bold font-mono text-[var(--color-text)]">
                  {formatBudget(runningTotal)}
                </span>
                <span className="text-sm text-[var(--color-text-secondary)] ml-2">
                  / {formatBudget(list.budget)}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (runningTotal / list.budget) * 100)}%`,
                  backgroundColor:
                    runningTotal > list.budget
                      ? 'var(--color-danger)'
                      : runningTotal > list.budget * 0.8
                        ? 'var(--color-warning)'
                        : 'var(--color-success)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {items.length === 0 ? (
          <EmptyItemsState />
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-[var(--color-border)]">
              {sortedItems.map((item) => (
                <SwipeableListItem
                  key={item.id}
                  onRemove={() => handleRemoveItem(item)}
                  testId={`swipeable-${item.id}`}
                >
                  <div className="px-4">
                    <ListItemRow
                      item={item}
                      onToggleCheck={handleToggleCheck}
                    />
                  </div>
                </SwipeableListItem>
              ))}
            </div>
          </Card>
        )}
      </main>

      {/* FAB - Add Item Button */}
      <button
        type="button"
        onClick={handleOpenAddSheet}
        className="fixed right-4 bottom-20 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 z-20"
        aria-label="Add item"
        data-testid="fab-add-item"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Add Item Sheet */}
      <AddItemToListSheet
        isOpen={isAddSheetOpen}
        onClose={handleCloseAddSheet}
        onAdd={handleAddItem}
        existingPantryItemIds={existingPantryItemIds}
        isLoading={isAdding}
        error={addError}
      />

      {/* Toast for undo */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onDismiss={hideToast}
        onUndo={toast.onUndo}
        duration={5000}
      />

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border)] z-10"
        aria-label="Main navigation"
      >
        <div className="max-w-2xl mx-auto flex justify-around py-2">
          <Link
            href="/pantry"
            className="flex flex-col items-center min-w-[64px] py-2 text-[var(--color-text-secondary)]"
          >
            <span className="text-2xl" role="img" aria-label="Pantry">
              🏠
            </span>
            <span className="text-xs mt-0.5">Pantry</span>
          </Link>
          <Link
            href="/lists"
            className="flex flex-col items-center min-w-[64px] py-2 text-[var(--color-primary)]"
            aria-current="page"
          >
            <span className="text-2xl" role="img" aria-hidden="true">
              📝
            </span>
            <span className="text-xs font-medium mt-0.5">Lists</span>
          </Link>
          <button
            type="button"
            className="flex flex-col items-center min-w-[64px] py-2 text-[var(--color-text-secondary)] opacity-50"
            disabled
            aria-label="Scan (coming soon)"
          >
            <span className="text-2xl" role="img" aria-hidden="true">
              📷
            </span>
            <span className="text-xs mt-0.5">Scan</span>
          </button>
          <button
            type="button"
            className="flex flex-col items-center min-w-[64px] py-2 text-[var(--color-text-secondary)] opacity-50"
            disabled
            aria-label="Insights (coming soon)"
          >
            <span className="text-2xl" role="img" aria-hidden="true">
              📊
            </span>
            <span className="text-xs mt-0.5">Insights</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
