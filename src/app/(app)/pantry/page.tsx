'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  removePantryItem,
  restorePantryItem,
  type StockItem,
  type StockLevel,
} from '@/lib/utils/onboardingStorage';
import {
  PantryGrid,
  AddItemSheet,
  StockLevelPicker,
  CategoryPicker,
} from '@/components/stock';
import { type ProductCategory } from '@/lib/data/seeded-products';
import { Toast, useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui';
import { countByStockLevel, decreaseStockLevel } from '@/lib/utils/stockLevel';
import { autoAddItemToActiveList } from '@/lib/utils/shoppingListStorage';

export default function PantryPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Stock level picker state
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Category picker state
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

  // Delete confirmation state
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // Toast state for undo functionality
  const { toast, showToast, hideToast } = useToast();
  const undoDataRef = useRef<{
    itemId: string;
    previousLevel: StockLevel;
  } | null>(null);

  useEffect(() => {
    // Load items from localStorage
    const loadItems = () => {
      const pantryItems = getPantryItems();
      setItems(pantryItems);
      setIsLoading(false);
    };

    loadItems();
  }, []);

  const handleItemClick = useCallback((item: StockItem) => {
    // Regular click - could open detail view in future
    console.log('Item clicked:', item.name);
  }, []);

  const handleItemLongPress = useCallback((item: StockItem) => {
    setSelectedItem(item);
    setIsPickerOpen(true);
  }, []);

  const handleClosePicker = useCallback(() => {
    setIsPickerOpen(false);
    setSelectedItem(null);
  }, []);

  const handleStockLevelChange = useCallback(
    (newLevel: StockLevel) => {
      if (!selectedItem) return;

      // Optimistic update - update local state immediately
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === selectedItem.id ? { ...item, level: newLevel } : item
        )
      );

      // Persist to localStorage
      updatePantryItem(selectedItem.id, { level: newLevel });

      // Auto-add to shopping list if changed to "out"
      if (newLevel === 'out') {
        const updatedItem = { ...selectedItem, level: newLevel };
        const addedItem = autoAddItemToActiveList(updatedItem);
        if (addedItem) {
          showToast(`${selectedItem.name} added to shopping list`, {
            type: 'info',
          });
        }
      }
    },
    [selectedItem, showToast]
  );

  // Handle opening category picker from stock level picker
  const handleOpenCategoryPicker = useCallback(() => {
    setIsPickerOpen(false);
    setIsCategoryPickerOpen(true);
  }, []);

  // Handle closing category picker
  const handleCloseCategoryPicker = useCallback(() => {
    setIsCategoryPickerOpen(false);
    setSelectedItem(null);
  }, []);

  // Handle category change
  const handleCategoryChange = useCallback(
    (newCategory: ProductCategory) => {
      if (!selectedItem) return;

      // Optimistic update - update local state immediately
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === selectedItem.id
            ? { ...item, category: newCategory }
            : item
        )
      );

      // Persist to localStorage
      updatePantryItem(selectedItem.id, { category: newCategory });

      // Show confirmation toast
      showToast(
        `${selectedItem.name} moved to ${newCategory.replace('-', ' ')}`,
        { type: 'success' }
      );
    },
    [selectedItem, showToast]
  );

  // Handle swipe left - decrease stock level
  const handleItemSwipeLeft = useCallback(
    (item: StockItem) => {
      const newLevel = decreaseStockLevel(item.level);
      if (!newLevel) return; // Already at 'out'

      const previousLevel = item.level;

      // Store undo data
      undoDataRef.current = {
        itemId: item.id,
        previousLevel,
      };

      // Optimistic update - update local state immediately
      setItems((prevItems) =>
        prevItems.map((i) => (i.id === item.id ? { ...i, level: newLevel } : i))
      );

      // Persist to localStorage
      updatePantryItem(item.id, { level: newLevel });

      // Auto-add to shopping list if changed to "out"
      let autoAddedToList = false;
      if (newLevel === 'out') {
        const updatedItem = { ...item, level: newLevel };
        const addedItem = autoAddItemToActiveList(updatedItem);
        autoAddedToList = addedItem !== null;
      }

      // Show toast with undo option
      const toastMessage = autoAddedToList
        ? `${item.name} → Out (added to list)`
        : `${item.name} → ${newLevel.charAt(0).toUpperCase() + newLevel.slice(1)}`;

      showToast(toastMessage, {
        type: autoAddedToList ? 'info' : 'success',
        onUndo: () => {
          const undoData = undoDataRef.current;
          if (!undoData) return;

          // Revert the change
          setItems((prevItems) =>
            prevItems.map((i) =>
              i.id === undoData.itemId
                ? { ...i, level: undoData.previousLevel }
                : i
            )
          );

          // Persist revert to localStorage
          updatePantryItem(undoData.itemId, { level: undoData.previousLevel });

          // Clear undo data
          undoDataRef.current = null;
        },
      });
    },
    [showToast]
  );

  // Handle swipe right - show delete confirmation
  const handleItemSwipeRight = useCallback((item: StockItem) => {
    setItemToDelete(item);
    setIsConfirmDialogOpen(true);
  }, []);

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(() => {
    if (!itemToDelete) return;

    // Remove item from local state
    setItems((prevItems) => prevItems.filter((i) => i.id !== itemToDelete.id));

    // Soft-delete in localStorage
    removePantryItem(itemToDelete.id);

    // Close dialog
    setIsConfirmDialogOpen(false);

    // Show toast with undo option
    showToast(`${itemToDelete.name} deleted`, {
      type: 'info',
      onUndo: () => {
        // Restore the item
        restorePantryItem(itemToDelete.id);

        // Add back to local state
        setItems((prevItems) => [...prevItems, itemToDelete]);
      },
    });

    // Clear item to delete
    setItemToDelete(null);
  }, [itemToDelete, showToast]);

  // Handle cancel delete
  const handleCancelDelete = useCallback(() => {
    setIsConfirmDialogOpen(false);
    setItemToDelete(null);
  }, []);

  const handleOpenAddSheet = useCallback(() => {
    setAddError(null);
    setIsAddSheetOpen(true);
  }, []);

  const handleCloseAddSheet = useCallback(() => {
    if (!isAdding) {
      setIsAddSheetOpen(false);
      setAddError(null);
    }
  }, [isAdding]);

  const handleAddItem = useCallback(
    async (data: { name: string; category: string; level: StockLevel }) => {
      setIsAdding(true);
      setAddError(null);

      try {
        // Check for duplicate names
        const existingItem = items.find(
          (item) => item.name.toLowerCase() === data.name.trim().toLowerCase()
        );

        if (existingItem) {
          setAddError(`"${data.name}" already exists in your pantry`);
          setIsAdding(false);
          return;
        }

        // Add the new item (optimistic update)
        const newItem = addPantryItem(data);

        // Update local state immediately
        setItems((prev) => [...prev, newItem]);

        // Close the sheet
        setIsAddSheetOpen(false);
      } catch {
        setAddError('Failed to add item. Please try again.');
      } finally {
        setIsAdding(false);
      }
    },
    [items]
  );

  const toggleGrouping = useCallback(() => {
    setGroupByCategory((prev) => !prev);
  }, []);

  // Calculate stock level counts
  const stockCounts = countByStockLevel(items);
  const needsAttentionCount = stockCounts.low + stockCounts.out;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <span className="text-4xl" role="img" aria-hidden="true">
              🥫
            </span>
          </div>
          <p className="text-[var(--color-text-secondary)] mt-2">
            Loading pantry...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-background)] border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">
                My Pantry
              </h1>
              {items.length > 0 && (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                  {needsAttentionCount > 0 && (
                    <span className="ml-2 text-[var(--color-warning)]">
                      ({needsAttentionCount} need
                      {needsAttentionCount !== 1 ? '' : 's'} attention)
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Grouping Toggle */}
            {items.length > 0 && (
              <button
                type="button"
                onClick={toggleGrouping}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                aria-pressed={groupByCategory}
                data-testid="toggle-grouping"
              >
                <span role="img" aria-hidden="true">
                  {groupByCategory ? '📋' : '🗂️'}
                </span>
                {groupByCategory ? 'List' : 'Group'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        <PantryGrid
          items={items}
          groupByCategory={groupByCategory}
          onItemClick={handleItemClick}
          onItemLongPress={handleItemLongPress}
          onItemSwipeLeft={handleItemSwipeLeft}
          onItemSwipeRight={handleItemSwipeRight}
          onAddItem={handleOpenAddSheet}
        />
      </main>

      {/* FAB - Add Item Button */}
      <button
        type="button"
        onClick={handleOpenAddSheet}
        className="fixed right-4 bottom-20 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 z-20"
        aria-label="Add new item"
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
      <AddItemSheet
        isOpen={isAddSheetOpen}
        onClose={handleCloseAddSheet}
        onAdd={handleAddItem}
        isLoading={isAdding}
        error={addError}
      />

      {/* Stock Level Picker */}
      <StockLevelPicker
        isOpen={isPickerOpen}
        currentLevel={selectedItem?.level ?? 'stocked'}
        onSelect={handleStockLevelChange}
        onClose={handleClosePicker}
        itemName={selectedItem?.name}
        currentCategory={selectedItem?.category}
        onChangeCategory={handleOpenCategoryPicker}
      />

      {/* Category Picker */}
      <CategoryPicker
        isOpen={isCategoryPickerOpen}
        currentCategory={selectedItem?.category ?? 'pantry'}
        onSelect={handleCategoryChange}
        onClose={handleCloseCategoryPicker}
        itemName={selectedItem?.name}
      />

      {/* Toast for swipe undo */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onDismiss={hideToast}
        onUndo={toast.onUndo}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Item?"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? You can undo this action within 5 seconds.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onClose={handleCancelDelete}
      />

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border)] z-10"
        aria-label="Main navigation"
      >
        <div className="max-w-2xl mx-auto flex justify-around py-2">
          <button
            type="button"
            className="flex flex-col items-center min-w-[64px] py-2 text-[var(--color-primary)]"
            aria-current="page"
          >
            <span className="text-2xl" role="img" aria-label="Pantry">
              🏠
            </span>
            <span className="text-xs font-medium mt-0.5">Pantry</span>
          </button>
          <Link
            href="/lists"
            className="flex flex-col items-center min-w-[64px] py-2 text-[var(--color-text-secondary)]"
          >
            <span className="text-2xl" role="img" aria-label="Lists">
              📝
            </span>
            <span className="text-xs mt-0.5">Lists</span>
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
