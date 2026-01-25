'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Button } from '@/components/ui';
import {
  getOnboardingSummary,
  formatBudget,
  type OnboardingSummary,
} from '@/lib/utils/onboardingStorage';

// Pre-generated confetti particle data (generated once at module load)
const CONFETTI_PARTICLES = Array.from({ length: 50 }).map((_, i) => ({
  left: (i * 17 + 7) % 100, // Deterministic distribution
  rotate: ((i * 37 + 13) % 720) - 360,
  x: ((i * 23 + 11) % 200) - 100,
  duration: 2 + ((i * 19) % 200) / 100, // 2-4 seconds
  delay: ((i * 13) % 50) / 100, // 0-0.5 seconds
  colorIndex: i % 5,
}));

interface OnboardingCompleteProps {
  /** Callback when user clicks to continue to pantry */
  onContinue: () => void;
  /** Loading state during transition */
  isLoading?: boolean;
}

/**
 * Onboarding Complete Component
 *
 * Displays "Ready to Shop!" celebration after completing onboarding.
 * Shows summary of setup and confetti animation (respects reduced motion).
 */
export function OnboardingComplete({
  onContinue,
  isLoading = false,
}: OnboardingCompleteProps) {
  const shouldReduceMotion = useReducedMotion();
  // Use lazy initializer to load summary on mount
  const [summary] = useState<OnboardingSummary | null>(() =>
    getOnboardingSummary()
  );
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti after a brief delay (if motion allowed)
    if (!shouldReduceMotion) {
      const timer = setTimeout(() => {
        setShowConfetti(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldReduceMotion]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.5,
        staggerChildren: shouldReduceMotion ? 0 : 0.15,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.5,
        ease: 'easeOut',
      },
    },
  };

  const celebrationVariants: Variants = {
    hidden: { scale: shouldReduceMotion ? 1 : 0.5, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.6,
        ease: [0.34, 1.56, 0.64, 1], // Bounce effect
      },
    },
  };

  return (
    <div
      className="flex flex-col min-h-screen bg-[var(--color-background)] relative overflow-hidden"
      data-testid="onboarding-complete"
    >
      {/* Confetti Animation */}
      {showConfetti && !shouldReduceMotion && (
        <div
          className="absolute inset-0 pointer-events-none"
          data-testid="confetti-container"
          aria-hidden="true"
        >
          {/* Simple CSS confetti particles */}
          {CONFETTI_PARTICLES.map((particle, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${particle.left}%`,
                backgroundColor: [
                  'var(--color-primary)',
                  'var(--color-safe-zone-green)',
                  'var(--color-warning)',
                  '#FF6B9D',
                  '#9B59B6',
                ][particle.colorIndex],
              }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{
                y: '100vh',
                opacity: [1, 1, 0],
                rotate: particle.rotate,
                x: particle.x,
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: 'easeIn',
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Celebration Icon */}
        <motion.div
          className="w-28 h-28 rounded-full bg-[var(--color-safe-zone-green)] bg-opacity-20 flex items-center justify-center mb-6"
          variants={celebrationVariants}
          data-testid="celebration-icon"
        >
          <span className="text-6xl" role="img" aria-label="Party popper">
            🎉
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-3xl font-bold text-[var(--color-text)] text-center mb-2"
          variants={itemVariants}
        >
          Ready to Shop!
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-[var(--color-text-secondary)] text-center mb-8"
          variants={itemVariants}
        >
          Your pantry is all set up. Let&apos;s save some money!
        </motion.p>

        {/* Summary Card */}
        {summary && (
          <motion.div
            className="w-full max-w-sm bg-white rounded-xl p-5 shadow-sm border border-[var(--color-border)] mb-8"
            variants={itemVariants}
            data-testid="onboarding-summary"
          >
            <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-4">
              What we set up for you
            </h2>

            <div className="space-y-3">
              {/* Products */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🛒</span>
                  <span className="text-sm text-[var(--color-text)]">
                    Pantry items
                  </span>
                </div>
                <span
                  className="text-sm font-medium text-[var(--color-text)]"
                  data-testid="products-count"
                >
                  {summary.productsCount} items
                </span>
              </div>

              {/* Budget */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💰</span>
                  <span className="text-sm text-[var(--color-text)]">
                    Weekly budget
                  </span>
                </div>
                <span
                  className="text-sm font-medium text-[var(--color-text)]"
                  data-testid="budget-display"
                >
                  {formatBudget(summary.budget, summary.currency)}
                </span>
              </div>

              {/* Currency */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🌍</span>
                  <span className="text-sm text-[var(--color-text)]">
                    Currency
                  </span>
                </div>
                <span
                  className="text-sm font-medium text-[var(--color-text)]"
                  data-testid="currency-display"
                >
                  {summary.currency}
                </span>
              </div>

              {/* Location */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <span className="text-sm text-[var(--color-text)]">
                    Location services
                  </span>
                </div>
                <span
                  className={`text-sm font-medium ${
                    summary.locationEnabled
                      ? 'text-[var(--color-safe-zone-green)]'
                      : 'text-[var(--color-text-secondary)]'
                  }`}
                  data-testid="location-status"
                >
                  {summary.locationEnabled ? 'Enabled' : 'Skipped'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Footer */}
      <motion.div
        className="p-4 bg-[var(--color-background)]"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <Button
          type="button"
          variant="primary"
          size="default"
          onClick={onContinue}
          disabled={isLoading}
          className="w-full"
          data-testid="start-shopping-button"
        >
          {isLoading ? 'Setting up...' : 'Start Shopping'}
        </Button>
      </motion.div>
    </div>
  );
}
