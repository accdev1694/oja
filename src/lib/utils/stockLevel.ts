/**
 * Stock Level Utilities
 *
 * Helper functions for stock level display, colors, and icons.
 */

import { type StockLevel } from './onboardingStorage';

/**
 * Stock level configuration with colors and labels
 */
export interface StockLevelConfig {
  color: string;
  bgColor: string;
  label: string;
  description: string;
}

/**
 * Stock level configurations
 * Colors follow the Safe Zone color palette from UX design
 */
export const STOCK_LEVEL_CONFIG: Record<StockLevel, StockLevelConfig> = {
  stocked: {
    color: 'var(--color-safe-zone-green)',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    label: 'Stocked',
    description: 'Plenty in stock',
  },
  good: {
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    label: 'Good',
    description: 'Sufficient stock',
  },
  low: {
    color: 'var(--color-warning)',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    label: 'Low',
    description: 'Running low',
  },
  out: {
    color: 'var(--color-danger)',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    label: 'Out',
    description: 'Need to buy',
  },
};

/**
 * Get CSS color for a stock level
 */
export function getStockLevelColor(level: StockLevel): string {
  return STOCK_LEVEL_CONFIG[level].color;
}

/**
 * Get background color for a stock level
 */
export function getStockLevelBgColor(level: StockLevel): string {
  return STOCK_LEVEL_CONFIG[level].bgColor;
}

/**
 * Get label for a stock level
 */
export function getStockLevelLabel(level: StockLevel): string {
  return STOCK_LEVEL_CONFIG[level].label;
}

/**
 * Get description for a stock level
 */
export function getStockLevelDescription(level: StockLevel): string {
  return STOCK_LEVEL_CONFIG[level].description;
}

/**
 * Get fill percentage for stock level indicator
 */
export function getStockLevelFillPercent(level: StockLevel): number {
  const fills: Record<StockLevel, number> = {
    stocked: 100,
    good: 75,
    low: 25,
    out: 0,
  };
  return fills[level];
}

/**
 * Stock level order for sorting
 */
export const STOCK_LEVEL_ORDER: StockLevel[] = [
  'out',
  'low',
  'good',
  'stocked',
];

/**
 * Sort items by stock level (most urgent first)
 */
export function sortByStockLevel<T extends { level: StockLevel }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    return (
      STOCK_LEVEL_ORDER.indexOf(a.level) - STOCK_LEVEL_ORDER.indexOf(b.level)
    );
  });
}

/**
 * Check if item needs attention (low or out)
 */
export function needsAttention(level: StockLevel): boolean {
  return level === 'low' || level === 'out';
}

/**
 * Decrease stock level by one step
 * Returns null if already at 'out' (lowest level)
 *
 * Order: stocked → good → low → out
 */
export function decreaseStockLevel(current: StockLevel): StockLevel | null {
  const order: StockLevel[] = ['stocked', 'good', 'low', 'out'];
  const currentIndex = order.indexOf(current);
  if (currentIndex === order.length - 1) return null; // Already at "out"
  return order[currentIndex + 1];
}

/**
 * Increase stock level by one step
 * Returns null if already at 'stocked' (highest level)
 *
 * Order: out → low → good → stocked
 */
export function increaseStockLevel(current: StockLevel): StockLevel | null {
  const order: StockLevel[] = ['stocked', 'good', 'low', 'out'];
  const currentIndex = order.indexOf(current);
  if (currentIndex === 0) return null; // Already at "stocked"
  return order[currentIndex - 1];
}

/**
 * Check if stock level can be decreased
 */
export function canDecreaseStock(level: StockLevel): boolean {
  return level !== 'out';
}

/**
 * Count items by stock level
 */
export function countByStockLevel<T extends { level: StockLevel }>(
  items: T[]
): Record<StockLevel, number> {
  const counts: Record<StockLevel, number> = {
    stocked: 0,
    good: 0,
    low: 0,
    out: 0,
  };

  for (const item of items) {
    counts[item.level]++;
  }

  return counts;
}
