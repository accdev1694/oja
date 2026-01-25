'use client';

import { memo } from 'react';
import {
  type ShoppingList,
  getItemsForList,
} from '@/lib/utils/shoppingListStorage';
import { Card } from '@/components/ui';

interface ShoppingListCardProps {
  /** The shopping list to display */
  list: ShoppingList;
  /** Callback when card is clicked */
  onClick?: () => void;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return 'Today';
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isYesterday) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

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
 * Shopping List Card Component
 *
 * Displays a single shopping list with name, item count, budget status, and created date.
 */
function ShoppingListCardComponent({ list, onClick }: ShoppingListCardProps) {
  const items = getItemsForList(list.id);
  const itemCount = items.length;
  const checkedCount = items.filter((item) => item.isChecked).length;
  const autoAddedCount = items.filter((item) => item.isAutoAdded).length;
  const statusConfig = getStatusConfig(list.status);

  return (
    <Card
      className="cursor-pointer transition-all hover:border-[var(--color-primary)] hover:shadow-md active:scale-[0.98]"
      onClick={onClick}
      data-testid={`shopping-list-card-${list.id}`}
    >
      <div className="p-4">
        {/* Header with status badge */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--color-text)] truncate">
              {list.name}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {formatDate(list.createdAt)}
            </p>
          </div>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
            style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color,
            }}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Item count and progress */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg" role="img" aria-hidden="true">
              📝
            </span>
            <span className="text-sm text-[var(--color-text-secondary)]">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Progress when shopping or completed */}
          {(list.status === 'shopping' || list.status === 'completed') &&
            itemCount > 0 && (
              <span className="text-sm text-[var(--color-success)]">
                {checkedCount}/{itemCount} checked
              </span>
            )}
        </div>

        {/* Auto-added badge */}
        {autoAddedCount > 0 && list.status === 'active' && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)] bg-gray-100 px-2 py-0.5 rounded-full">
              <span role="img" aria-hidden="true">
                ✨
              </span>
              {autoAddedCount} auto-added from pantry
            </span>
          </div>
        )}

        {/* Budget info */}
        {list.budget !== null && (
          <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">
                Budget
              </span>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {formatBudget(list.budget)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Memoized ShoppingListCard to prevent unnecessary re-renders
 */
export const ShoppingListCard = memo(ShoppingListCardComponent);
