'use client';

import { useState, useCallback, useRef, type ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import { hapticLight, hapticMedium } from '@/lib/utils/haptics';

interface SwipeableListItemProps {
  /** The content to display */
  children: ReactNode;
  /** Callback when remove is triggered */
  onRemove: () => void;
  /** Optional test ID */
  testId?: string;
  /** Whether swipe is disabled */
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 80;
const REVEAL_WIDTH = 80;

/**
 * Swipeable List Item Component
 *
 * Wraps content with swipe-to-reveal delete functionality.
 * Swipe left to reveal "Remove" button.
 */
export function SwipeableListItem({
  children,
  onRemove,
  testId,
  disabled = false,
}: SwipeableListItemProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Motion values for swipe
  const x = useMotionValue(0);

  // Transform for button opacity (fade in as swiped)
  const buttonOpacity = useTransform(x, [-REVEAL_WIDTH, 0], [1, 0]);

  // Handle drag end
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled) return;

      const shouldReveal = info.offset.x < -SWIPE_THRESHOLD;
      const shouldHide = info.offset.x > SWIPE_THRESHOLD / 2;

      if (shouldReveal && !isRevealed) {
        setIsRevealed(true);
        hapticLight();
      } else if (shouldHide && isRevealed) {
        setIsRevealed(false);
      } else if (!shouldReveal && !isRevealed) {
        // Snap back
        x.set(0);
      }
    },
    [disabled, isRevealed, x]
  );

  // Handle remove click
  const handleRemove = useCallback(() => {
    hapticMedium();
    onRemove();
  }, [onRemove]);

  // Handle tap on revealed item (close)
  const handleTap = useCallback(() => {
    if (isRevealed) {
      setIsRevealed(false);
    }
  }, [isRevealed]);

  return (
    <div
      className="relative overflow-hidden"
      ref={constraintsRef}
      data-testid={testId}
    >
      {/* Remove button (behind the content) */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500"
        style={{
          width: REVEAL_WIDTH,
          opacity: buttonOpacity,
        }}
        data-testid={testId ? `${testId}-remove-action` : 'remove-action'}
      >
        <button
          type="button"
          onClick={handleRemove}
          className="w-full h-full flex items-center justify-center text-white font-medium text-sm"
          aria-label="Remove item"
          data-testid={testId ? `${testId}-remove-button` : 'remove-button'}
        >
          Remove
        </button>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        className="relative bg-white"
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        animate={{ x: isRevealed ? -REVEAL_WIDTH : 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{ x }}
        data-testid={testId ? `${testId}-content` : 'swipeable-content'}
      >
        {children}
      </motion.div>
    </div>
  );
}
