'use client';

import { memo, useState, useCallback } from 'react';
import { type StockItem, type StockLevel } from '@/lib/utils/onboardingStorage';
import {
  STOCK_LEVEL_CONFIG,
  getStockLevelFillPercent,
  decreaseStockLevel,
  canDecreaseStock,
} from '@/lib/utils/stockLevel';
import { PRODUCT_CATEGORIES } from '@/lib/data/seeded-products';
import { StockLevelIcon } from './StockLevelIcon';
import { useLongPress } from '@/lib/hooks/useLongPress';
import { useSwipe } from '@/lib/hooks/useSwipe';
import { hapticLight, hapticMedium } from '@/lib/utils/haptics';

interface PantryItemProps {
  /** The stock item to display */
  item: StockItem;
  /** Callback when item is clicked */
  onClick?: () => void;
  /** Callback when item is long-pressed */
  onLongPress?: () => void;
  /** Callback when item is swiped left */
  onSwipeLeft?: () => void;
  /** Callback when item is swiped right (for delete) */
  onSwipeRight?: () => void;
}

/**
 * Get category emoji from the category ID
 */
function getCategoryEmoji(category: string): string {
  const categoryInfo = PRODUCT_CATEGORIES.find((c) => c.id === category);
  return categoryInfo?.emoji || '📦';
}

/**
 * Get the next stock level color for swipe preview
 */
function getNextLevelColor(level: StockLevel): string {
  const nextLevel = decreaseStockLevel(level);
  if (!nextLevel) return 'transparent';
  return STOCK_LEVEL_CONFIG[nextLevel].color;
}

/**
 * Pantry Item Component
 *
 * Displays a single stock item with name, category icon, and stock level indicator.
 * Supports long-press gesture for stock level editing.
 * Supports swipe left gesture for quick stock decrease.
 * Supports swipe right gesture for delete.
 */
function PantryItemComponent({
  item,
  onClick,
  onLongPress,
  onSwipeLeft,
  onSwipeRight,
}: PantryItemProps) {
  const config = STOCK_LEVEL_CONFIG[item.level];
  const fillPercent = getStockLevelFillPercent(item.level);
  const categoryEmoji = getCategoryEmoji(item.category);
  const [isPressed, setIsPressed] = useState(false);

  // Check if item can be swiped left (not at 'out' level)
  const canSwipeLeft = canDecreaseStock(item.level);
  const nextLevelColor = getNextLevelColor(item.level);

  const handleLongPress = useCallback(() => {
    hapticLight();
    onLongPress?.();
  }, [onLongPress]);

  const handleSwipeLeft = useCallback(() => {
    if (!canSwipeLeft) return;
    hapticMedium();
    onSwipeLeft?.();
  }, [canSwipeLeft, onSwipeLeft]);

  const handleSwipeRight = useCallback(() => {
    hapticMedium();
    onSwipeRight?.();
  }, [onSwipeRight]);

  const longPressHandlers = useLongPress(handleLongPress, {
    threshold: 500,
    onStart: () => setIsPressed(true),
    onFinish: () => setIsPressed(false),
    onCancel: () => setIsPressed(false),
  });

  const swipeHandlers = useSwipe({
    threshold: 50,
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    disabled: false, // Allow swipe right even if can't swipe left
  });

  // Handle click - only fire if not a long press and not swiping
  const handleClick = useCallback(() => {
    if (!isPressed && !swipeHandlers.isSwiping) {
      onClick?.();
    }
  }, [onClick, isPressed, swipeHandlers.isSwiping]);

  // Calculate visual feedback for swipe
  const swipeOffset = swipeHandlers.swipeOffset;
  const swipeProgress = Math.min(1, Math.abs(swipeOffset) / 50);
  const swipeTransform = swipeHandlers.isSwiping
    ? `translateX(${swipeOffset}px)`
    : 'translateX(0)';

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      data-testid={`pantry-item-wrapper-${item.id}`}
    >
      {/* Swipe left background indicator */}
      {canSwipeLeft && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-4 transition-opacity"
          style={{
            backgroundColor: nextLevelColor,
            opacity:
              swipeHandlers.isSwiping && swipeOffset < 0
                ? swipeProgress * 0.3
                : 0,
          }}
          data-testid={`swipe-left-indicator-${item.id}`}
        >
          <span className="text-white font-medium text-sm">
            {decreaseStockLevel(item.level)?.toUpperCase()}
          </span>
        </div>
      )}

      {/* Swipe right background indicator (delete) */}
      <div
        className="absolute inset-0 flex items-center justify-start pl-4 transition-opacity"
        style={{
          backgroundColor: 'var(--color-danger, #EF4444)',
          opacity:
            swipeHandlers.isSwiping && swipeOffset > 0
              ? swipeProgress * 0.3
              : 0,
        }}
        data-testid={`swipe-right-indicator-${item.id}`}
      >
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </div>

      <button
        type="button"
        onClick={handleClick}
        {...longPressHandlers}
        onTouchStart={(e) => {
          longPressHandlers.onTouchStart(e);
          swipeHandlers.onTouchStart(e);
        }}
        onTouchMove={(e) => {
          longPressHandlers.onTouchMove(e);
          swipeHandlers.onTouchMove(e);
        }}
        onTouchEnd={() => {
          longPressHandlers.onTouchEnd();
          swipeHandlers.onTouchEnd();
        }}
        className={`bg-white rounded-xl p-4 shadow-sm border border-[var(--color-border)] relative text-left w-full transition-transform hover:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 ${
          isPressed ? 'scale-[0.96] shadow-md' : 'active:scale-[0.98]'
        }`}
        style={{
          transform: swipeTransform,
          transition: swipeHandlers.isSwiping
            ? 'none'
            : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        data-testid={`pantry-item-${item.id}`}
        aria-label={`${item.name}, ${config.label}. Long press to change stock level.${canSwipeLeft ? ' Swipe left to decrease stock.' : ''} Swipe right to delete.`}
      >
        {/* Stock Level Indicator Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl overflow-hidden bg-gray-100">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${fillPercent}%`,
              backgroundColor: config.color,
            }}
            role="progressbar"
            aria-valuenow={fillPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Stock level: ${config.label}`}
          />
        </div>

        {/* Category Emoji and Stock Icon */}
        <div className="flex items-start justify-between mb-2 pt-1">
          <div className="flex items-center gap-2">
            <span
              className="text-2xl"
              role="img"
              aria-label={`Category: ${item.category}`}
            >
              {categoryEmoji}
            </span>
            {/* Stock Level Icon with Phosphor */}
            <StockLevelIcon level={item.level} size={20} />
          </div>
          {/* Stock Level Badge */}
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: config.bgColor,
              color: config.color,
            }}
          >
            {config.label}
          </span>
        </div>

        {/* Item Name */}
        <p className="font-medium text-[var(--color-text)] text-sm leading-tight">
          {item.name}
        </p>

        {/* Category Name */}
        <p className="text-xs text-[var(--color-text-secondary)] mt-1 capitalize">
          {item.category}
        </p>
      </button>
    </div>
  );
}

/**
 * Memoized PantryItem to prevent unnecessary re-renders
 */
export const PantryItem = memo(PantryItemComponent);
