'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Button } from '@/components/ui';

// Budget constants in pence
const BUDGET_MIN_PENCE = 3000; // £30
const BUDGET_MAX_PENCE = 30000; // £300
const BUDGET_STEP_PENCE = 500; // £5
const HAPTIC_ROUND_NUMBER_PENCE = 1000; // £10

interface BudgetDialProps {
  /** Initial budget value in pence */
  initialValue?: number;
  /** Minimum budget in pence (default: 3000 = £30) */
  min?: number;
  /** Maximum budget in pence (default: 30000 = £300) */
  max?: number;
  /** Step increment in pence (default: 500 = £5) */
  step?: number;
  /** Callback when budget changes */
  onChange?: (valueInPence: number) => void;
  /** Callback when user confirms budget */
  onConfirm: (valueInPence: number) => void;
  /** Callback when user skips */
  onSkip?: () => void;
  /** Loading state during save */
  isLoading?: boolean;
}

/**
 * Budget Dial Component
 *
 * Circular dial interface for setting weekly budget during onboarding.
 * - Range: £30-£300 (configurable)
 * - Haptic feedback on round numbers (£10 increments)
 * - Safe Zone green glow preview
 * - Full accessibility support
 */
export function BudgetDial({
  initialValue = 10000, // £100 default
  min = BUDGET_MIN_PENCE,
  max = BUDGET_MAX_PENCE,
  step = BUDGET_STEP_PENCE,
  onChange,
  onConfirm,
  onSkip,
  isLoading = false,
}: BudgetDialProps) {
  const shouldReduceMotion = useReducedMotion();
  const [value, setValue] = useState(initialValue);
  const [isDragging, setIsDragging] = useState(false);
  const dialRef = useRef<HTMLDivElement>(null);
  const previousValueRef = useRef(value);

  // Format pence to pounds display
  const formatPounds = (pence: number) => {
    return `£${(pence / 100).toFixed(0)}`;
  };

  // Check if value is a round number (£10 increments)
  const isRoundNumber = (pence: number) =>
    pence % HAPTIC_ROUND_NUMBER_PENCE === 0;

  // Trigger haptic feedback
  const triggerHaptic = useCallback((durationMs: number = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(durationMs);
    }
  }, []);

  // Calculate percentage for progress display
  const percentage = ((value - min) / (max - min)) * 100;

  // Calculate angle for dial position (270 degrees of rotation, starting from bottom-left)
  const _angle = (percentage / 100) * 270 - 135; // -135 to 135 degrees

  // Handle value change with haptic feedback
  const handleValueChange = useCallback(
    (newValue: number) => {
      // Clamp value to min/max and snap to step
      const clampedValue = Math.min(max, Math.max(min, newValue));
      const steppedValue = Math.round(clampedValue / step) * step;

      if (steppedValue !== value) {
        setValue(steppedValue);
        onChange?.(steppedValue);

        // Trigger haptic on round numbers (only when crossing the threshold)
        if (
          isRoundNumber(steppedValue) &&
          !isRoundNumber(previousValueRef.current)
        ) {
          triggerHaptic(10);
        }
        previousValueRef.current = steppedValue;
      }
    },
    [value, min, max, step, onChange, triggerHaptic]
  );

  // Handle dial drag interaction
  const handleDialInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!dialRef.current) return;

      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate angle from center
      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      const angleRad = Math.atan2(deltaY, deltaX);
      let angleDeg = (angleRad * 180) / Math.PI;

      // Convert angle to percentage (270 degree range, starting from bottom-left)
      // Adjust angle to start from -135 (bottom-left) to +135 (bottom-right)
      angleDeg = angleDeg + 90; // Rotate coordinate system
      if (angleDeg < -135) angleDeg += 360;
      if (angleDeg > 135) {
        // Outside the dial range - clamp to nearest edge
        angleDeg = angleDeg > 180 ? -135 : 135;
      }

      const newPercentage = ((angleDeg + 135) / 270) * 100;
      const newValue = min + (newPercentage / 100) * (max - min);

      handleValueChange(newValue);
    },
    [min, max, handleValueChange]
  );

  // Mouse/Touch event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleDialInteraction(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    handleDialInteraction(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleDialInteraction(e.clientX, e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        handleDialInteraction(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleDialInteraction]);

  // Keyboard support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        e.preventDefault();
        handleValueChange(value + step);
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        e.preventDefault();
        handleValueChange(value - step);
        break;
      case 'Home':
        e.preventDefault();
        handleValueChange(min);
        break;
      case 'End':
        e.preventDefault();
        handleValueChange(max);
        break;
      case 'PageUp':
        e.preventDefault();
        handleValueChange(value + HAPTIC_ROUND_NUMBER_PENCE);
        break;
      case 'PageDown':
        e.preventDefault();
        handleValueChange(value - HAPTIC_ROUND_NUMBER_PENCE);
        break;
    }
  };

  const handleConfirm = () => {
    onConfirm(value);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.4,
        ease: 'easeOut',
      },
    },
  };

  const glowVariants: Variants = {
    idle: {
      opacity: 0.15,
      scale: 1,
    },
    active: {
      opacity: shouldReduceMotion ? 0.2 : [0.15, 0.25, 0.15],
      scale: shouldReduceMotion ? 1 : [1, 1.02, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  // SVG parameters for the dial arc
  const size = 280;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Arc path calculation (270 degrees)
  const startAngle = -225; // degrees
  const endAngle = 45; // degrees
  const circumference = 2 * Math.PI * radius;
  const arcLength = (270 / 360) * circumference;
  const _progressLength = (percentage / 100) * arcLength;

  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angleDeg: number
  ) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  };

  const describeArc = (
    cx: number,
    cy: number,
    r: number,
    startAngleDeg: number,
    endAngleDeg: number
  ) => {
    const start = polarToCartesian(cx, cy, r, endAngleDeg);
    const end = polarToCartesian(cx, cy, r, startAngleDeg);
    const largeArcFlag = endAngleDeg - startAngleDeg <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  // Knob position
  const knobAngle = startAngle + (percentage / 100) * 270;
  const knobPos = polarToCartesian(center, center, radius, knobAngle);

  return (
    <div
      className="flex flex-col min-h-screen bg-[var(--color-background)]"
      data-testid="budget-dial"
    >
      {/* Header */}
      <div className="px-4 pt-8 pb-4 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
          Set Your Weekly Budget
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Drag the dial to set your target. We&apos;ll help you stay on track.
        </p>
      </div>

      {/* Dial Container with Safe Zone Glow */}
      <motion.div
        className="flex-1 flex items-center justify-center relative px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Safe Zone Glow Background */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%)`,
          }}
          variants={glowVariants}
          initial="idle"
          animate={isDragging ? 'active' : 'idle'}
          data-testid="safe-zone-glow"
          aria-hidden="true"
        />

        {/* Dial */}
        <div
          ref={dialRef}
          className="relative cursor-pointer touch-none select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="slider"
          aria-label="Weekly budget"
          aria-valuenow={value / 100}
          aria-valuemin={min / 100}
          aria-valuemax={max / 100}
          aria-valuetext={formatPounds(value)}
          data-testid="budget-dial-control"
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90"
          >
            {/* Background arc (track) */}
            <path
              d={describeArc(center, center, radius, startAngle, endAngle)}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Progress arc */}
            <motion.path
              d={describeArc(center, center, radius, startAngle, knobAngle)}
              fill="none"
              stroke="var(--color-safe-zone-green)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              initial={false}
              animate={{
                d: describeArc(center, center, radius, startAngle, knobAngle),
              }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.1,
                ease: 'linear',
              }}
            />

            {/* Knob */}
            <motion.circle
              cx={knobPos.x}
              cy={knobPos.y}
              r={20}
              fill="var(--color-primary)"
              stroke="white"
              strokeWidth={3}
              className="drop-shadow-md"
              initial={false}
              animate={{
                cx: knobPos.x,
                cy: knobPos.y,
                scale: isDragging ? 1.1 : 1,
              }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.1,
                ease: 'linear',
              }}
            />
          </svg>

          {/* Center display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 text-[var(--color-safe-zone-green)]">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm font-medium">Safe Zone</span>
            </div>
            <motion.span
              className="text-5xl font-bold text-[var(--color-text)] font-mono"
              key={value}
              initial={shouldReduceMotion ? false : { scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.15 }}
              data-testid="budget-value"
            >
              {formatPounds(value)}
            </motion.span>
            <span className="text-sm text-[var(--color-text-secondary)]">
              per week
            </span>
          </div>
        </div>
      </motion.div>

      {/* Range labels */}
      <div className="flex justify-between px-8 py-2 text-xs text-[var(--color-text-secondary)]">
        <span>{formatPounds(min)}</span>
        <span>{formatPounds(max)}</span>
      </div>

      {/* Footer */}
      <div className="p-4 space-y-3 bg-[var(--color-background)]">
        <Button
          type="button"
          variant="primary"
          size="default"
          onClick={handleConfirm}
          disabled={isLoading}
          className="w-full"
          data-testid="confirm-budget-button"
        >
          {isLoading ? 'Saving...' : 'Set Budget'}
        </Button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="w-full py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            data-testid="skip-budget-button"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
