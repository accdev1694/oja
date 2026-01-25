'use client';

import { useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Button } from '@/components/ui';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import {
  getCurrencyFromCountry,
  detectCountryFromLocale,
} from '@/lib/utils/currencyDetection';

interface LocationPermissionProps {
  /** Callback when location is granted with detected country/currency */
  onGranted: (data: { country: string; currency: string }) => void;
  /** Callback when user skips location permission */
  onSkip: () => void;
  /** Loading state during save */
  isLoading?: boolean;
}

/**
 * Location Permission Component
 *
 * Requests location permission during onboarding to auto-detect
 * country and currency. Users can skip if they prefer.
 */
export function LocationPermission({
  onGranted,
  onSkip,
  isLoading = false,
}: LocationPermissionProps) {
  const shouldReduceMotion = useReducedMotion();
  const {
    requestLocation,
    loading: geoLoading,
    error,
    isSupported,
  } = useGeolocation();
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleEnableLocation = async () => {
    const position = await requestLocation();

    if (position) {
      // For now, use locale-based detection as reverse geocoding requires external API
      // In production, you'd use the coordinates with a reverse geocoding service
      const country = detectCountryFromLocale();
      const currency = getCurrencyFromCountry(country);

      onGranted({ country, currency });
    } else {
      // Permission denied or error
      setPermissionDenied(true);
    }
  };

  const handleSkip = () => {
    // Use locale-based detection as fallback
    const _country = detectCountryFromLocale();
    const _currency = getCurrencyFromCountry(_country);

    // Still pass the detected values, but mark as not from location
    onSkip();
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.4,
        staggerChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0.1 : 0.4 },
    },
  };

  const iconVariants: Variants = {
    hidden: { scale: shouldReduceMotion ? 1 : 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.5,
        ease: 'easeOut',
      },
    },
  };

  const isButtonLoading = isLoading || geoLoading;

  return (
    <div
      className="flex flex-col min-h-screen bg-[var(--color-background)]"
      data-testid="location-permission"
    >
      {/* Content */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Icon */}
        <motion.div
          className="w-24 h-24 rounded-full bg-[var(--color-cream)] flex items-center justify-center mb-8"
          variants={iconVariants}
          data-testid="location-icon"
        >
          <svg
            className="w-12 h-12 text-[var(--color-primary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-2xl font-bold text-[var(--color-text)] text-center mb-4"
          variants={itemVariants}
        >
          Enable Location?
        </motion.h1>

        {/* Description */}
        <motion.div
          className="text-center max-w-sm mb-8"
          variants={itemVariants}
        >
          <p className="text-[var(--color-text-secondary)] mb-4">
            Location helps Oja work better for you:
          </p>

          <ul className="text-left space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-[var(--color-primary)] mt-0.5">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
              <span className="text-sm text-[var(--color-text)]">
                <strong>Auto-detect your currency</strong> — no manual setup
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--color-primary)] mt-0.5">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
              <span className="text-sm text-[var(--color-text)]">
                <strong>Find nearby stores</strong> — for better price data
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--color-primary)] mt-0.5">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
              <span className="text-sm text-[var(--color-text)]">
                <strong>Shopping mode</strong> — auto-activates in stores
              </span>
            </li>
          </ul>
        </motion.div>

        {/* Error/Denied State */}
        {(error || permissionDenied) && (
          <motion.div
            className="bg-[var(--color-cream)] rounded-lg p-4 mb-6 max-w-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            data-testid="permission-denied-message"
          >
            <p className="text-sm text-[var(--color-text)]">
              {permissionDenied
                ? 'No problem! You can enable location later in Settings.'
                : error}
            </p>
          </motion.div>
        )}

        {/* Not Supported Message */}
        {!isSupported && (
          <motion.div
            className="bg-[var(--color-cream)] rounded-lg p-4 mb-6 max-w-sm"
            variants={itemVariants}
            data-testid="not-supported-message"
          >
            <p className="text-sm text-[var(--color-text)]">
              Location services aren&apos;t available in your browser.
              We&apos;ll use your device settings to detect your region.
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Footer */}
      <div className="p-4 space-y-3 bg-[var(--color-background)]">
        {isSupported && !permissionDenied && (
          <Button
            type="button"
            variant="primary"
            size="default"
            onClick={handleEnableLocation}
            disabled={isButtonLoading}
            className="w-full"
            data-testid="enable-location-button"
          >
            {isButtonLoading ? 'Detecting location...' : 'Enable Location'}
          </Button>
        )}

        <button
          type="button"
          onClick={handleSkip}
          disabled={isLoading}
          className="w-full py-3 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          data-testid="skip-location-button"
        >
          {permissionDenied || !isSupported ? 'Continue' : 'Maybe Later'}
        </button>
      </div>
    </div>
  );
}
