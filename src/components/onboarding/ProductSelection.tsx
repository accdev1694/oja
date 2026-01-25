'use client';

import { useState, useMemo } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Input, Button, Card } from '@/components/ui';
import {
  SEEDED_PRODUCTS,
  PRODUCT_CATEGORIES,
  filterProducts,
  type SeededProduct,
  type ProductCategory,
} from '@/lib/data/seeded-products';

interface ProductSelectionProps {
  /** Initial selected product IDs (defaults to all) */
  initialSelected?: string[];
  /** Callback when user confirms selection */
  onConfirm: (selectedProducts: SeededProduct[]) => void;
  /** Loading state during save */
  isLoading?: boolean;
}

/**
 * Product Selection Component
 *
 * Allows users to select pantry items during onboarding.
 * - UK staple items pre-selected by default
 * - Grouped by category
 * - Search/filter capability
 * - Tap to toggle selection
 */
export function ProductSelection({
  initialSelected,
  onConfirm,
  isLoading = false,
}: ProductSelectionProps) {
  const shouldReduceMotion = useReducedMotion();

  // Default to all products selected
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (initialSelected) {
      return new Set(initialSelected);
    }
    return new Set(SEEDED_PRODUCTS.map((p) => p.id));
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Filter products based on search
  const filteredProducts = useMemo(
    () => filterProducts(SEEDED_PRODUCTS, searchQuery),
    [searchQuery]
  );

  // Group filtered products by category
  const productsByCategory = useMemo(() => {
    const grouped = new Map<ProductCategory, SeededProduct[]>();

    for (const category of PRODUCT_CATEGORIES) {
      const categoryProducts = filteredProducts.filter(
        (p) => p.category === category.id
      );
      if (categoryProducts.length > 0) {
        grouped.set(category.id, categoryProducts);
      }
    }

    return grouped;
  }, [filteredProducts]);

  const toggleProduct = (productId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const selectedProducts = SEEDED_PRODUCTS.filter((p) =>
      selectedIds.has(p.id)
    );
    onConfirm(selectedProducts);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.3,
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0.1 : 0.2 },
    },
  };

  return (
    <div
      className="flex flex-col min-h-screen bg-[var(--color-background)]"
      data-testid="product-selection"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-background)] px-4 pt-4 pb-2 border-b border-[var(--color-border)]">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
          Your Pantry Essentials
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          We&apos;ve selected common UK staples. Tap to deselect items you
          don&apos;t usually buy.
        </p>

        {/* Search */}
        <Input
          type="search"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-2"
          aria-label="Search products"
        />

        {/* Selection count */}
        <p className="text-xs text-[var(--color-text-secondary)]">
          {selectedIds.size} of {SEEDED_PRODUCTS.length} items selected
        </p>
      </div>

      {/* Product List */}
      <motion.div
        className="flex-1 overflow-y-auto px-4 py-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {Array.from(productsByCategory.entries()).map(
          ([categoryId, products]) => {
            const category = PRODUCT_CATEGORIES.find(
              (c) => c.id === categoryId
            );
            if (!category) return null;

            return (
              <motion.section
                key={categoryId}
                className="mb-6"
                variants={itemVariants}
              >
                <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
                  <span>{category.emoji}</span>
                  <span>{category.name}</span>
                </h2>

                <Card padding="compact">
                  <div className="divide-y divide-[var(--color-border)]">
                    {products.map((product) => (
                      <ProductItem
                        key={product.id}
                        product={product}
                        isSelected={selectedIds.has(product.id)}
                        onToggle={() => toggleProduct(product.id)}
                      />
                    ))}
                  </div>
                </Card>
              </motion.section>
            );
          }
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            No items match your search.
          </div>
        )}
      </motion.div>

      {/* Footer */}
      <div className="sticky bottom-0 p-4 bg-[var(--color-background)] border-t border-[var(--color-border)]">
        <Button
          type="button"
          variant="primary"
          size="default"
          onClick={handleConfirm}
          disabled={isLoading || selectedIds.size === 0}
          className="w-full"
        >
          {isLoading
            ? 'Setting up your pantry...'
            : `Continue with ${selectedIds.size} items`}
        </Button>
      </div>
    </div>
  );
}

interface ProductItemProps {
  product: SeededProduct;
  isSelected: boolean;
  onToggle: () => void;
}

function ProductItem({ product, isSelected, onToggle }: ProductItemProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3 px-2 hover:bg-[var(--color-background)] transition-colors text-left"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`${product.name}${isSelected ? ', selected' : ', not selected'}`}
    >
      <span
        className={`text-sm ${isSelected ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)] line-through'}`}
      >
        {product.name}
      </span>

      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          isSelected
            ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
            : 'border-[var(--color-border)]'
        }`}
      >
        {isSelected && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
    </button>
  );
}
