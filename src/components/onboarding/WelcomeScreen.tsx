'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Button } from '@/components/ui';

interface WelcomeScreenProps {
  /** Callback when user taps to continue */
  onContinue: () => void;
}

/**
 * Welcome Screen Component
 *
 * Animated welcome experience for new users after registration.
 * - Uses Framer Motion for smooth 60fps animations
 * - Respects prefers-reduced-motion accessibility setting
 * - Single tap to proceed to next onboarding step
 */
export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const shouldReduceMotion = useReducedMotion();

  // Animation variants - simplified if user prefers reduced motion
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.5,
        staggerChildren: shouldReduceMotion ? 0 : 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.5,
        ease: 'easeOut' as const,
      },
    },
  };

  const logoVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.8,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.6,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-background)] p-6 text-center"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      data-testid="welcome-screen"
    >
      {/* Logo */}
      <motion.div variants={logoVariants} className="mb-8">
        <div
          className="w-24 h-24 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-lg"
          aria-hidden="true"
        >
          <span className="text-4xl font-bold text-white">O</span>
        </div>
      </motion.div>

      {/* Welcome Text */}
      <motion.h1
        variants={itemVariants}
        className="text-3xl font-bold text-[var(--color-text)] mb-3"
      >
        Welcome to Oja
      </motion.h1>

      <motion.p
        variants={itemVariants}
        className="text-lg text-[var(--color-text-secondary)] mb-2 max-w-sm"
      >
        Your budget-first shopping companion
      </motion.p>

      <motion.p
        variants={itemVariants}
        className="text-base text-[var(--color-text-secondary)] mb-12 max-w-sm"
      >
        Take control of your spending before, during, and after every shopping
        trip.
      </motion.p>

      {/* Continue Button */}
      <motion.div variants={itemVariants} className="w-full max-w-xs">
        <Button
          type="button"
          variant="primary"
          size="default"
          onClick={onContinue}
          className="w-full"
        >
          Get Started
        </Button>
      </motion.div>

      {/* Decorative elements - only animate if motion is allowed */}
      {!shouldReduceMotion && (
        <>
          <motion.div
            className="absolute top-20 left-10 w-16 h-16 rounded-full bg-[var(--color-primary)]/10"
            animate={{
              y: [0, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            aria-hidden="true"
          />
          <motion.div
            className="absolute bottom-32 right-8 w-12 h-12 rounded-full bg-[var(--color-success)]/10"
            animate={{
              y: [0, 10, 0],
              scale: [1, 0.9, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
            aria-hidden="true"
          />
        </>
      )}
    </motion.div>
  );
}
