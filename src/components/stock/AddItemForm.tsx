'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui';
import { PRODUCT_CATEGORIES } from '@/lib/data/seeded-products';
import { type StockLevel } from '@/lib/utils/onboardingStorage';
import { STOCK_LEVEL_CONFIG } from '@/lib/utils/stockLevel';

interface AddItemFormProps {
  /** Callback when form is submitted */
  onSubmit: (data: {
    name: string;
    category: string;
    level: StockLevel;
  }) => void;
  /** Callback when form is cancelled */
  onCancel: () => void;
  /** Loading state during submission */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
}

const STOCK_LEVELS: StockLevel[] = ['stocked', 'good', 'low', 'out'];

/**
 * Add Item Form Component
 *
 * Form for adding a new pantry item with name, category, and stock level.
 */
export function AddItemForm({
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}: AddItemFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('pantry');
  const [level, setLevel] = useState<StockLevel>('stocked');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isValid = name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !isLoading) {
      onSubmit({ name: name.trim(), category, level });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Item Name */}
      <div>
        <label
          htmlFor="item-name"
          className="block text-sm font-medium text-[var(--color-text)] mb-2"
        >
          Item Name <span className="text-red-500">*</span>
        </label>
        <input
          ref={inputRef}
          id="item-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Olive Oil, Pasta, Chicken"
          className="w-full px-4 py-3 border border-[var(--color-border)] rounded-xl text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          disabled={isLoading}
          autoComplete="off"
          data-testid="item-name-input"
        />
      </div>

      {/* Category Selection */}
      <div>
        <label
          htmlFor="item-category"
          className="block text-sm font-medium text-[var(--color-text)] mb-2"
        >
          Category
        </label>
        <div
          className="grid grid-cols-3 gap-2"
          role="radiogroup"
          aria-label="Select category"
        >
          {PRODUCT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              disabled={isLoading}
              className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                category === cat.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] bg-opacity-10'
                  : 'border-[var(--color-border)] hover:border-gray-300'
              }`}
              role="radio"
              aria-checked={category === cat.id}
              data-testid={`category-${cat.id}`}
            >
              <span className="text-xl mb-1" role="img" aria-hidden="true">
                {cat.emoji}
              </span>
              <span
                className={`text-xs ${
                  category === cat.id
                    ? 'text-[var(--color-primary)] font-medium'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stock Level Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
          Initial Stock Level
        </label>
        <div
          className="flex gap-2"
          role="radiogroup"
          aria-label="Select stock level"
        >
          {STOCK_LEVELS.map((stockLevel) => {
            const config = STOCK_LEVEL_CONFIG[stockLevel];
            return (
              <button
                key={stockLevel}
                type="button"
                onClick={() => setLevel(stockLevel)}
                disabled={isLoading}
                className={`flex-1 py-2.5 px-3 rounded-xl border-2 transition-all text-sm font-medium ${
                  level === stockLevel
                    ? 'border-current'
                    : 'border-[var(--color-border)] hover:border-gray-300'
                }`}
                style={{
                  color: level === stockLevel ? config.color : undefined,
                  backgroundColor:
                    level === stockLevel ? config.bgColor : undefined,
                }}
                role="radio"
                aria-checked={level === stockLevel}
                data-testid={`level-${stockLevel}`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
          role="alert"
          data-testid="add-item-error"
        >
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="default"
          className="flex-1"
          onClick={onCancel}
          disabled={isLoading}
          data-testid="cancel-button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="default"
          className="flex-1"
          disabled={!isValid || isLoading}
          data-testid="add-button"
        >
          {isLoading ? 'Adding...' : 'Add Item'}
        </Button>
      </div>
    </form>
  );
}
