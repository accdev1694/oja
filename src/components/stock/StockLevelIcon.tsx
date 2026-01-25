'use client';

import { memo } from 'react';
import { Drop } from '@phosphor-icons/react';
import { type StockLevel } from '@/lib/utils/onboardingStorage';
import { STOCK_LEVEL_CONFIG } from '@/lib/utils/stockLevel';

interface StockLevelIconProps {
  /** The stock level to display */
  level: StockLevel;
  /** Size of the icon in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get Phosphor icon weight based on stock level
 * Fill weights go from full (fill) to empty (thin)
 */
function getIconWeight(
  level: StockLevel
): 'fill' | 'regular' | 'light' | 'thin' {
  const weights: Record<StockLevel, 'fill' | 'regular' | 'light' | 'thin'> = {
    stocked: 'fill',
    good: 'regular',
    low: 'light',
    out: 'thin',
  };
  return weights[level];
}

/**
 * Stock Level Icon Component
 *
 * Displays a Phosphor icon with varying fill weights to indicate stock level:
 * - Stocked: Fill weight (completely filled)
 * - Good: Regular weight (mostly filled)
 * - Low: Light weight (partially filled)
 * - Out: Thin weight (empty outline)
 *
 * Colors follow the Safe Zone palette from the design system.
 */
function StockLevelIconComponent({
  level,
  size = 24,
  className = '',
}: StockLevelIconProps) {
  const config = STOCK_LEVEL_CONFIG[level];
  const weight = getIconWeight(level);

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      data-testid={`stock-icon-${level}`}
      aria-label={`Stock level: ${config.label}`}
    >
      <Drop
        size={size}
        weight={weight}
        style={{ color: config.color }}
        aria-hidden="true"
      />
    </span>
  );
}

/**
 * Memoized StockLevelIcon to prevent unnecessary re-renders
 */
export const StockLevelIcon = memo(StockLevelIconComponent);
