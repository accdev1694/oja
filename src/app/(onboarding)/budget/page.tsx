'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BudgetDial } from '@/components/onboarding';

// localStorage key for budget (value stored in pence)
const BUDGET_STORAGE_KEY = 'oja_default_budget';

/**
 * Budget Setting Page
 *
 * Third step in onboarding - set weekly budget.
 * Users can set their default weekly budget using a dial interface,
 * or skip this step to complete onboarding later.
 */
export default function BudgetPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async (budgetInPence: number) => {
    setIsLoading(true);

    try {
      // Save budget to localStorage (placeholder until Supabase profile is set up)
      // Budget is stored as integer in pence per architecture patterns
      if (typeof window !== 'undefined') {
        localStorage.setItem(BUDGET_STORAGE_KEY, budgetInPence.toString());
      }

      // Navigate to next onboarding step (location permission)
      router.push('/location');
    } catch (error) {
      console.error('Failed to save budget:', error);
      // Still navigate even on error for now
      router.push('/location');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Clear any existing budget and navigate
    if (typeof window !== 'undefined') {
      localStorage.removeItem(BUDGET_STORAGE_KEY);
    }
    // Navigate to next step even when skipped
    router.push('/location');
  };

  return (
    <BudgetDial
      onConfirm={handleConfirm}
      onSkip={handleSkip}
      isLoading={isLoading}
    />
  );
}
