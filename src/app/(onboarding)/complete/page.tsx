'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingComplete } from '@/components/onboarding';
import { completeOnboarding } from '@/lib/utils/onboardingStorage';

/**
 * Onboarding Complete Page
 *
 * Final step in onboarding flow. Shows celebration and summary,
 * then navigates to pantry on user action.
 */
export default function CompletePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    setIsLoading(true);

    // Complete onboarding (creates pantry items, marks complete)
    completeOnboarding();

    // Navigate to pantry
    router.push('/pantry');
  };

  return (
    <OnboardingComplete onContinue={handleContinue} isLoading={isLoading} />
  );
}
