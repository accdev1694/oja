'use client';

import { memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { type StockLevel } from '@/lib/utils/onboardingStorage';
import {
  STOCK_LEVEL_CONFIG,
  getStockLevelFillPercent,
} from '@/lib/utils/stockLevel';
import { hapticSelection, hapticMedium } from '@/lib/utils/haptics';

interface StockLevelPickerProps {
  /** Whether the picker is open */
  isOpen: boolean;
  /** Current stock level */
  currentLevel: StockLevel;
  /** Called when a level is selected */
  onSelect: (level: StockLevel) => void;
  /** Called when the picker should close */
  onClose: () => void;
  /** Item name for accessibility */
  itemName?: string;
  /** Current category for display */
  currentCategory?: string;
  /** Called when user wants to change category */
  onChangeCategory?: () => void;
}

const STOCK_LEVELS: StockLevel[] = ['stocked', 'good', 'low', 'out'];

/**
 * Single stock level option with liquid fill animation
 */
function StockLevelOption({
  level,
  isSelected,
  onSelect,
  shouldReduceMotion,
}: {
  level: StockLevel;
  isSelected: boolean;
  onSelect: (level: StockLevel) => void;
  shouldReduceMotion: boolean;
}) {
  const config = STOCK_LEVEL_CONFIG[level];
  const fillPercent = getStockLevelFillPercent(level);

  const handleClick = useCallback(() => {
    hapticSelection();
    onSelect(level);
  }, [level, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-end w-16 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
        isSelected
          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] ring-opacity-30'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      role="radio"
      aria-checked={isSelected}
      aria-label={`${config.label} - ${config.description}`}
      data-testid={`picker-level-${level}`}
    >
      {/* Liquid fill animation */}
      <motion.div
        className="absolute bottom-0 left-0 right-0"
        initial={{ height: 0 }}
        animate={{ height: `${fillPercent}%` }}
        transition={
          shouldReduceMotion
            ? { duration: 0.1 }
            : {
                type: 'spring',
                stiffness: 300,
                damping: 25,
                duration: 0.3,
              }
        }
        style={{ backgroundColor: config.color }}
        data-testid={`picker-fill-${level}`}
      />

      {/* Label */}
      <span
        className={`relative z-10 text-xs font-medium pb-2 ${
          fillPercent > 50 ? 'text-white' : 'text-[var(--color-text)]'
        }`}
      >
        {config.label}
      </span>

      {/* Selected checkmark */}
      {isSelected && (
        <motion.div
          className="absolute top-1 right-1 w-4 h-4 bg-[var(--color-primary)] rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={
            shouldReduceMotion
              ? { duration: 0.1 }
              : { type: 'spring', stiffness: 500, damping: 25 }
          }
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
 * Stock Level Picker Component
 *
 * A popover-style picker for selecting stock levels with liquid fill animations.
 * Shows when user long-presses a pantry item.
 */
function StockLevelPickerComponent({
  isOpen,
  currentLevel,
  onSelect,
  onClose,
  itemName,
  currentCategory,
  onChangeCategory,
}: StockLevelPickerProps) {
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
    (level: StockLevel) => {
      hapticMedium();
      onSelect(level);
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
            data-testid="picker-backdrop"
            aria-hidden="true"
          />

          {/* Picker container */}
          <motion.div
            className="fixed inset-x-4 bottom-4 z-50 bg-white rounded-2xl shadow-xl p-4 max-w-sm mx-auto"
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
            aria-labelledby="picker-title"
            data-testid="stock-level-picker"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3
                id="picker-title"
                className="text-lg font-semibold text-[var(--color-text)]"
              >
                {itemName ? `Update ${itemName}` : 'Set Stock Level'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
                data-testid="picker-close"
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

            {/* Stock level options */}
            <div
              className="flex justify-center gap-3"
              role="radiogroup"
              aria-label="Select stock level"
            >
              {STOCK_LEVELS.map((level) => (
                <StockLevelOption
                  key={level}
                  level={level}
                  isSelected={currentLevel === level}
                  onSelect={handleSelect}
                  shouldReduceMotion={shouldReduceMotion}
                />
              ))}
            </div>

            {/* Current selection description */}
            <p className="text-center text-sm text-[var(--color-text-secondary)] mt-4">
              {STOCK_LEVEL_CONFIG[currentLevel].description}
            </p>

            {/* Change Category button */}
            {onChangeCategory && (
              <button
                type="button"
                onClick={() => {
                  hapticSelection();
                  onChangeCategory();
                }}
                className="mt-4 w-full py-3 px-4 rounded-xl border border-[var(--color-border)] bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                data-testid="change-category-button"
              >
                <span className="text-sm text-[var(--color-text)]">
                  Category
                </span>
                <span className="text-sm text-[var(--color-text-secondary)] capitalize">
                  {currentCategory || 'Not set'}
                </span>
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Memoized StockLevelPicker to prevent unnecessary re-renders
 */
export const StockLevelPicker = memo(StockLevelPickerComponent);
