'use client';

import { useRouter } from 'next/navigation';
import { WelcomeScreen } from '@/components/onboarding';

/**
 * Welcome Page
 *
 * First step in the onboarding flow after registration.
 * Shows animated welcome with Oja branding.
 */
export default function WelcomePage() {
  const router = useRouter();

  const handleContinue = () => {
    // Navigate to next onboarding step (seeded products selection)
    // For now, redirect to pantry until Story 2.6 is implemented
    router.push('/pantry');
  };

  return <WelcomeScreen onContinue={handleContinue} />;
}
