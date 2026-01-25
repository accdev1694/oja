'use client';

import { memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from '@/lib/data/seeded-products';
import { hapticSelection, hapticMedium } from '@/lib/utils/haptics';

interface CategoryPickerProps {
  /** Whether the picker is open */
  isOpen: boolean;
  /** Current category */
  currentCategory: string;
  /** Called when a category is selected */
  onSelect: (category: ProductCategory) => void;
  /** Called when the picker should close */
  onClose: () => void;
  /** Item name for accessibility */
  itemName?: string;
}

/**
 * Single category option button
 */
function CategoryOption({
  category,
  isSelected,
  onSelect,
}: {
  category: (typeof PRODUCT_CATEGORIES)[number];
  isSelected: boolean;
  onSelect: (category: ProductCategory) => void;
}) {
  const handleClick = useCallback(() => {
    hapticSelection();
    onSelect(category.id);
  }, [category.id, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] bg-opacity-10'
          : 'border-[var(--color-border)] hover:border-gray-300'
      }`}
      role="radio"
      aria-checked={isSelected}
      aria-label={category.name}
      data-testid={`picker-category-${category.id}`}
    >
      <span className="text-2xl mb-1" role="img" aria-hidden="true">
        {category.emoji}
      </span>
      <span
        className={`text-xs ${
          isSelected
            ? 'text-[var(--color-primary)] font-medium'
            : 'text-[var(--color-text-secondary)]'
        }`}
      >
        {category.name}
      </span>

      {/* Selected checkmark */}
      {isSelected && (
        <motion.div
          className="absolute top-1 right-1 w-4 h-4 bg-[var(--color-primary)] rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <svg
            className="w-2.5 h-2.5 text-white"
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
        </motion.div>
      )}
    </button>
  );
}

/**
 * Category Picker Component
 *
 * A modal picker for selecting item categories.
 * Shows when user wants to change an item's category.
 */
function CategoryPickerComponent({
  isOpen,
  currentCategory,
  onSelect,
  onClose,
  itemName,
}: CategoryPickerProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const handleSelect = useCallback(
    (category: ProductCategory) => {
      hapticMedium();
      onSelect(category);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.1 : 0.2 }}
            onClick={handleBackdropClick}
            data-testid="category-picker-backdrop"
            aria-hidden="true"
          />

          {/* Picker container */}
          <motion.div
            className="fixed inset-x-4 bottom-4 z-50 bg-white rounded-2xl shadow-xl p-4 max-w-sm mx-auto max-h-[70vh] overflow-hidden flex flex-col"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.15 }
                : {
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                  }
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-picker-title"
            data-testid="category-picker"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3
                id="category-picker-title"
                className="text-lg font-semibold text-[var(--color-text)]"
              >
                {itemName ? `Category for ${itemName}` : 'Select Category'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
                data-testid="category-picker-close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Category options grid */}
            <div
              className="grid grid-cols-3 gap-2 overflow-y-auto"
              role="radiogroup"
              aria-label="Select category"
            >
              {PRODUCT_CATEGORIES.map((category) => (
                <CategoryOption
                  key={category.id}
                  category={category}
                  isSelected={currentCategory === category.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Memoized CategoryPicker to prevent unnecessary re-renders
 */
export const CategoryPicker = memo(CategoryPickerComponent);
