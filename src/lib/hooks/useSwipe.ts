'use client';

import { useCallback, useRef, useState } from 'react';

export interface UseSwipeOptions {
  /** Distance in pixels before swipe triggers (default: 50) */
  threshold?: number;
  /** Called when swiped left beyond threshold */
  onSwipeLeft?: () => void;
  /** Called when swiped right beyond threshold */
  onSwipeRight?: () => void;
  /** Whether swipe is disabled */
  disabled?: boolean;
}

export interface UseSwipeResult {
  /** Touch start handler */
  onTouchStart: (e: React.TouchEvent) => void;
  /** Touch move handler */
  onTouchMove: (e: React.TouchEvent) => void;
  /** Touch end handler */
  onTouchEnd: () => void;
  /** Current horizontal offset during swipe */
  swipeOffset: number;
  /** Whether user is currently swiping */
  isSwiping: boolean;
  /** Direction of current swipe: 'left', 'right', or null */
  swipeDirection: 'left' | 'right' | null;
}

/**
 * Hook for detecting horizontal swipe gestures
 *
 * Tracks touch movement and triggers callbacks when swipe exceeds threshold.
 * Provides offset for visual feedback during swipe.
 *
 * @param options - Configuration options
 * @returns Swipe state and event handlers
 *
 * @example
 * ```tsx
 * const { onTouchStart, onTouchMove, onTouchEnd, swipeOffset } = useSwipe({
 *   threshold: 50,
 *   onSwipeLeft: () => console.log('Swiped left!'),
 * });
 *
 * return (
 *   <div
 *     {...{ onTouchStart, onTouchMove, onTouchEnd }}
 *     style={{ transform: `translateX(${swipeOffset}px)` }}
 *   >
 *     Swipe me
 *   </div>
 * );
 * ```
 */
export function useSwipe(options: UseSwipeOptions = {}): UseSwipeResult {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    disabled = false,
  } = options;

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(
    null
  );

  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const reset = useCallback(() => {
    startXRef.current = null;
    startYRef.current = null;
    isHorizontalSwipeRef.current = null;
    setSwipeOffset(0);
    setIsSwiping(false);
    setSwipeDirection(null);
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      if (touch) {
        startXRef.current = touch.clientX;
        startYRef.current = touch.clientY;
        isHorizontalSwipeRef.current = null;
        setIsSwiping(true);
      }
    },
    [disabled]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (
        disabled ||
        startXRef.current === null ||
        startYRef.current === null
      ) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      // Determine swipe direction on first significant movement
      if (isHorizontalSwipeRef.current === null) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Need at least 10px movement to determine direction
        if (absX < 10 && absY < 10) return;

        // If vertical movement is greater, this is a scroll, not a swipe
        isHorizontalSwipeRef.current = absX > absY;

        if (!isHorizontalSwipeRef.current) {
          reset();
          return;
        }
      }

      // Only handle horizontal swipes
      if (!isHorizontalSwipeRef.current) return;

      // Prevent vertical scrolling during horizontal swipe
      e.preventDefault();

      // Update offset for visual feedback
      setSwipeOffset(deltaX);

      // Update direction
      if (deltaX < 0) {
        setSwipeDirection('left');
      } else if (deltaX > 0) {
        setSwipeDirection('right');
      } else {
        setSwipeDirection(null);
      }
    },
    [disabled, reset]
  );

  const onTouchEnd = useCallback(() => {
    if (disabled || startXRef.current === null) {
      reset();
      return;
    }

    const offset = swipeOffset;

    // Check if swipe exceeded threshold
    if (Math.abs(offset) >= threshold) {
      if (offset < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (offset > 0 && onSwipeRight) {
        onSwipeRight();
      }
    }

    reset();
  }, [disabled, swipeOffset, threshold, onSwipeLeft, onSwipeRight, reset]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    swipeOffset,
    isSwiping,
    swipeDirection,
  };
}
