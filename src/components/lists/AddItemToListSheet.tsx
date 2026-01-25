'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { getPantryItems, type StockItem } from '@/lib/utils/onboardingStorage';
import {
  type NewShoppingListItem,
  type ItemPriority,
} from '@/lib/utils/shoppingListStorage';

interface AddItemToListSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback when sheet is closed */
  onClose: () => void;
  /** Callback when item is added */
  onAdd: (item: NewShoppingListItem) => void;
  /** IDs of pantry items already in the list */
  existingPantryItemIds?: string[];
  /** Loading state during submission */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
}

/**
 * Suggestion item from pantry
 */
interface PantrySuggestion {
  type: 'pantry';
  item: StockItem;
}

/**
 * Custom item (typed by user)
 */
interface CustomSuggestion {
  type: 'custom';
  name: string;
}

type Suggestion = PantrySuggestion | CustomSuggestion;

/**
 * Add Item to List Sheet Component
 *
 * Bottom sheet modal for adding items to a shopping list.
 * Provides search with pantry suggestions.
 */
export function AddItemToListSheet({
  isOpen,
  onClose,
  onAdd,
  existingPantryItemIds = [],
  isLoading = false,
  error = null,
}: AddItemToListSheetProps) {
  const shouldReduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [searchTerm, setSearchTerm] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [priority, setPriority] = useState<ItemPriority>('need');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPantryItem, setSelectedPantryItem] =
    useState<StockItem | null>(null);

  // Get pantry items for suggestions
  const pantryItems = useMemo(() => {
    if (!isOpen) return [];
    return getPantryItems();
  }, [isOpen]);

  // Filter pantry items by search term
  const suggestions = useMemo((): Suggestion[] => {
    const trimmedSearch = searchTerm.trim().toLowerCase();
    if (!trimmedSearch) return [];

    // Filter pantry items
    const matchingPantryItems = pantryItems
      .filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(trimmedSearch);
        const notAlreadyInList = !existingPantryItemIds.includes(item.id);
        return nameMatch && notAlreadyInList;
      })
      .slice(0, 5)
      .map((item): PantrySuggestion => ({ type: 'pantry', item }));

    // Add custom option if search doesn't match any pantry item exactly
    const exactMatch = pantryItems.some(
      (item) => item.name.toLowerCase() === trimmedSearch
    );

    const result: Suggestion[] = [...matchingPantryItems];

    if (!exactMatch && trimmedSearch.length >= 2) {
      result.push({ type: 'custom', name: searchTerm.trim() });
    }

    return result;
  }, [searchTerm, pantryItems, existingPantryItemIds]);

  // Reset form when opening (using setTimeout to avoid synchronous setState in effect)
  useEffect(() => {
    if (isOpen) {
      const resetTimer = setTimeout(() => {
        setSearchTerm('');
        setQuantity(1);
        setEstimatedPrice('');
        setPriority('need');
        setShowDetails(false);
        setSelectedPantryItem(null);
      }, 0);
      // Focus input after animation
      const focusTimer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => {
        clearTimeout(resetTimer);
        clearTimeout(focusTimer);
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  const handleSelectSuggestion = useCallback((suggestion: Suggestion) => {
    if (suggestion.type === 'pantry') {
      setSelectedPantryItem(suggestion.item);
      setSearchTerm(suggestion.item.name);
      // Pre-fill price from last known price if available
      if (suggestion.item.lastKnownPrice != null) {
        setEstimatedPrice((suggestion.item.lastKnownPrice / 100).toFixed(2));
      }
    } else {
      setSelectedPantryItem(null);
      setSearchTerm(suggestion.name);
    }
    setShowDetails(true);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const name = searchTerm.trim();
      if (!name) return;

      // Parse price (convert pounds to pence)
      let priceInPence: number | null = null;
      if (estimatedPrice) {
        const parsed = parseFloat(estimatedPrice);
        if (!isNaN(parsed) && parsed >= 0) {
          priceInPence = Math.round(parsed * 100);
        }
      }

      const newItem: NewShoppingListItem = {
        name,
        quantity,
        estimatedPrice: priceInPence,
        priority,
        pantryItemId: selectedPantryItem?.id ?? null,
        category: selectedPantryItem?.category ?? null,
      };

      onAdd(newItem);
    },
    [searchTerm, quantity, estimatedPrice, priority, selectedPantryItem, onAdd]
  );

  const handleQuickAdd = useCallback(
    (suggestion: Suggestion) => {
      const name =
        suggestion.type === 'pantry' ? suggestion.item.name : suggestion.name;
      const pantryItem = suggestion.type === 'pantry' ? suggestion.item : null;

      const newItem: NewShoppingListItem = {
        name,
        quantity: 1,
        estimatedPrice: pantryItem?.lastKnownPrice ?? null,
        priority: 'need',
        pantryItemId: pantryItem?.id ?? null,
        category: pantryItem?.category ?? null,
      };

      onAdd(newItem);
    },
    [onAdd]
  );

  const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const sheetVariants: Variants = {
    hidden: {
      y: '100%',
      opacity: shouldReduceMotion ? 0 : 1,
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: shouldReduceMotion ? 'tween' : 'spring',
        damping: 30,
        stiffness: 300,
        duration: shouldReduceMotion ? 0.15 : undefined,
      },
    },
    exit: {
      y: '100%',
      opacity: shouldReduceMotion ? 0 : 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.2,
        ease: 'easeIn' as const,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={handleBackdropClick}
            data-testid="sheet-backdrop"
          />

          {/* Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-title"
            data-testid="add-item-to-list-sheet"
          >
            <div className="bg-white rounded-t-2xl shadow-xl">
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-6 pb-4 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <h2
                    id="add-item-title"
                    className="text-xl font-bold text-[var(--color-text)]"
                  >
                    Add Item
                  </h2>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="p-2 -mr-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    aria-label="Close"
                    data-testid="close-button"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <form
                onSubmit={handleSubmit}
                className="px-6 py-5 max-h-[calc(85vh-100px)] overflow-y-auto"
              >
                {/* Error message */}
                {error && (
                  <div
                    className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg"
                    role="alert"
                    data-testid="error-message"
                  >
                    {error}
                  </div>
                )}

                {/* Search Input */}
                <div className="mb-4">
                  <label
                    htmlFor="item-search"
                    className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                  >
                    Item name
                  </label>
                  <input
                    ref={inputRef}
                    id="item-search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDetails(false);
                      setSelectedPantryItem(null);
                    }}
                    placeholder="Search or type item name..."
                    className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    autoComplete="off"
                    data-testid="item-search-input"
                  />
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && !showDetails && (
                  <div
                    className="mb-4 border border-[var(--color-border)] rounded-xl overflow-hidden"
                    data-testid="suggestions-list"
                  >
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={
                          suggestion.type === 'pantry'
                            ? suggestion.item.id
                            : `custom-${index}`
                        }
                        className="flex items-center justify-between p-3 border-b border-[var(--color-border)] last:border-0 hover:bg-gray-50"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className="flex-1 text-left"
                          data-testid={`suggestion-${suggestion.type === 'pantry' ? suggestion.item.id : 'custom'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--color-text)]">
                              {suggestion.type === 'pantry'
                                ? suggestion.item.name
                                : suggestion.name}
                            </span>
                            {suggestion.type === 'pantry' && (
                              <span className="text-xs text-[var(--color-text-secondary)] capitalize">
                                {suggestion.item.category}
                              </span>
                            )}
                            {suggestion.type === 'custom' && (
                              <span className="text-xs text-[var(--color-primary)]">
                                Add new
                              </span>
                            )}
                          </div>
                          {suggestion.type === 'pantry' &&
                            suggestion.item.lastKnownPrice != null && (
                              <span
                                className="text-xs text-[var(--color-text-secondary)] font-mono"
                                data-testid={`price-${suggestion.item.id}`}
                              >
                                ~£
                                {(suggestion.item.lastKnownPrice / 100).toFixed(
                                  2
                                )}
                              </span>
                            )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(suggestion)}
                          className="px-3 py-1.5 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white rounded-lg transition-colors"
                          data-testid={`quick-add-${suggestion.type === 'pantry' ? suggestion.item.id : 'custom'}`}
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Details section (shown after selecting) */}
                {showDetails && searchTerm.trim() && (
                  <div className="space-y-4" data-testid="item-details">
                    {/* Selected item indicator */}
                    {selectedPantryItem && (
                      <div className="flex items-center gap-2 p-3 bg-[var(--color-primary)]/5 rounded-xl">
                        <span className="text-sm text-[var(--color-primary)]">
                          From pantry
                        </span>
                        <span className="text-xs text-[var(--color-text-secondary)] capitalize">
                          ({selectedPantryItem.category})
                        </span>
                      </div>
                    )}

                    {/* Quantity */}
                    <div>
                      <label
                        htmlFor="quantity"
                        className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                      >
                        Quantity
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-10 h-10 flex items-center justify-center border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:bg-gray-50 transition-colors"
                          data-testid="quantity-decrease"
                        >
                          -
                        </button>
                        <input
                          id="quantity"
                          type="number"
                          min="1"
                          max="99"
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(
                              Math.max(
                                1,
                                Math.min(99, parseInt(e.target.value) || 1)
                              )
                            )
                          }
                          className="w-16 px-3 py-2 text-center border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                          data-testid="quantity-input"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity((q) => Math.min(99, q + 1))
                          }
                          className="w-10 h-10 flex items-center justify-center border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:bg-gray-50 transition-colors"
                          data-testid="quantity-increase"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Estimated Price */}
                    <div>
                      <label
                        htmlFor="price"
                        className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
                      >
                        Estimated price (optional)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                          £
                        </span>
                        <input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={estimatedPrice}
                          onChange={(e) => setEstimatedPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 border border-[var(--color-border)] rounded-xl text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent font-mono"
                          data-testid="price-input"
                        />
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                        Priority
                      </label>
                      <div className="flex gap-2">
                        {(['need', 'want', 'impulse'] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors ${
                              priority === p
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'bg-gray-100 text-[var(--color-text)] hover:bg-gray-200'
                            }`}
                            data-testid={`priority-${p}`}
                          >
                            {p === 'need' && 'Must have'}
                            {p === 'want' && 'Nice to have'}
                            {p === 'impulse' && 'Impulse'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading || !searchTerm.trim()}
                      className="w-full py-3.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl transition-all hover:bg-[var(--color-primary-hover)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                      data-testid="add-item-button"
                    >
                      {isLoading ? 'Adding...' : 'Add to List'}
                    </button>
                  </div>
                )}

                {/* Empty state hint */}
                {!searchTerm.trim() && (
                  <p className="text-center text-sm text-[var(--color-text-secondary)] mt-4">
                    Start typing to search your pantry or add a new item
                  </p>
                )}
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
