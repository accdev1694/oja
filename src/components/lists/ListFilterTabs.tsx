'use client';

import { memo } from 'react';

export type ListFilter = 'active' | 'completed' | 'all';

interface ListFilterTabsProps {
  /** Currently selected filter */
  selectedFilter: ListFilter;
  /** Callback when filter changes */
  onFilterChange: (filter: ListFilter) => void;
  /** Count of active lists */
  activeCount: number;
  /** Count of completed lists */
  completedCount: number;
}

interface TabConfig {
  value: ListFilter;
  label: string;
  count: number;
}

/**
 * List Filter Tabs Component
 *
 * Allows users to filter shopping lists by status (active, completed, or all).
 */
function ListFilterTabsComponent({
  selectedFilter,
  onFilterChange,
  activeCount,
  completedCount,
}: ListFilterTabsProps) {
  const totalCount = activeCount + completedCount;

  const tabs: TabConfig[] = [
    { value: 'active', label: 'Active', count: activeCount },
    { value: 'completed', label: 'History', count: completedCount },
    { value: 'all', label: 'All', count: totalCount },
  ];

  return (
    <div
      className="flex gap-1 p-1 bg-gray-100 rounded-xl"
      role="tablist"
      aria-label="Filter shopping lists"
      data-testid="list-filter-tabs"
    >
      {tabs.map((tab) => {
        const isSelected = selectedFilter === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={`list-panel-${tab.value}`}
            onClick={() => onFilterChange(tab.value)}
            className={`
              flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1
              ${
                isSelected
                  ? 'bg-white text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }
            `}
            data-testid={`filter-tab-${tab.value}`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`ml-1.5 text-xs ${
                  isSelected
                    ? 'text-[var(--color-text-secondary)]'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Memoized ListFilterTabs to prevent unnecessary re-renders
 */
export const ListFilterTabs = memo(ListFilterTabsComponent);
