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
    router.push('/products');
  };

  return <WelcomeScreen onContinue={handleContinue} />;
}
