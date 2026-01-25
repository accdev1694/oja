'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LocationPermission } from '@/components/onboarding';
import {
  detectCountryFromLocale,
  getCurrencyFromCountry,
} from '@/lib/utils/currencyDetection';

// localStorage keys
const LOCATION_GRANTED_KEY = 'oja_location_granted';
const CURRENCY_KEY = 'oja_currency';
const COUNTRY_KEY = 'oja_country';

/**
 * Location Permission Page
 *
 * Fourth step in onboarding - request location permission.
 * Users can enable location for auto currency/store detection,
 * or skip to use locale-based defaults.
 */
export default function LocationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGranted = async (data: { country: string; currency: string }) => {
    setIsLoading(true);

    try {
      // Save location data to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCATION_GRANTED_KEY, 'true');
        localStorage.setItem(COUNTRY_KEY, data.country);
        localStorage.setItem(CURRENCY_KEY, data.currency);
      }

      // Navigate to next onboarding step (completion)
      router.push('/complete');
    } catch (error) {
      console.error('Failed to save location data:', error);
      router.push('/complete');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Use locale-based detection as fallback
    const country = detectCountryFromLocale();
    const currency = getCurrencyFromCountry(country);

    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCATION_GRANTED_KEY, 'false');
      localStorage.setItem(COUNTRY_KEY, country);
      localStorage.setItem(CURRENCY_KEY, currency);
    }

    // Navigate to next step even when skipped
    router.push('/complete');
  };

  return (
    <LocationPermission
      onGranted={handleGranted}
      onSkip={handleSkip}
      isLoading={isLoading}
    />
  );
}
