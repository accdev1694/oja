'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductSelection } from '@/components/onboarding';
import type { SeededProduct } from '@/lib/data/seeded-products';

/**
 * Products Selection Page
 *
 * Second step in onboarding - select pantry items.
 * Selected items will be added to the user's pantry.
 */
export default function ProductsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async (selectedProducts: SeededProduct[]) => {
    setIsLoading(true);

    try {
      // TODO: Save selected products to database when Supabase tables are set up
      // For now, store in localStorage as a placeholder
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'onboarding_products',
          JSON.stringify(selectedProducts.map((p) => p.id))
        );
      }

      // Navigate to next onboarding step (budget setting)
      router.push('/budget');
    } catch (error) {
      console.error('Failed to save products:', error);
      // Still navigate even on error for now
      router.push('/budget');
    } finally {
      setIsLoading(false);
    }
  };

  return <ProductSelection onConfirm={handleConfirm} isLoading={isLoading} />;
}
