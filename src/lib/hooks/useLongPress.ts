'use client';

import { useCallback, useRef } from 'react';

export interface UseLongPressOptions {
  /** Duration in ms before long press triggers (default: 500) */
  threshold?: number;
  /** Called when long press starts (finger/mouse down) */
  onStart?: () => void;
  /** Called when long press completes successfully */
  onFinish?: () => void;
  /** Called when long press is cancelled (move/release before threshold) */
  onCancel?: () => void;
  /** Distance in pixels before press is cancelled (default: 10) */
  moveThreshold?: number;
}

export interface UseLongPressResult {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchMove: (e: React.TouchEvent) => void;
}

/**
 * Hook for detecting long press gestures
 *
 * Supports both touch and mouse events.
 * Cancels if finger/mouse moves beyond threshold.
 *
 * @param callback - Function to call when long press is detected
 * @param options - Configuration options
 * @returns Event handlers to spread on the element
 *
 * @example
 * ```tsx
 * const longPressHandlers = useLongPress(() => {
 *   console.log('Long press detected!');
 * }, { threshold: 500 });
 *
 * return <button {...longPressHandlers}>Hold me</button>;
 * ```
 */
export function useLongPress(
  callback: () => void,
  options: UseLongPressOptions = {}
): UseLongPressResult {
  const {
    threshold = 500,
    onStart,
    onFinish,
    onCancel,
    moveThreshold = 10,
  } = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(
    (x: number, y: number) => {
      isLongPressRef.current = false;
      startPosRef.current = { x, y };
      onStart?.();

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        callback();
        onFinish?.();
      }, threshold);
    },
    [callback, threshold, onStart, onFinish]
  );

  const cancel = useCallback(() => {
    clearTimer();
    if (!isLongPressRef.current && startPosRef.current) {
      onCancel?.();
    }
    startPosRef.current = null;
  }, [clearTimer, onCancel]);

  const checkMove = useCallback(
    (x: number, y: number) => {
      if (!startPosRef.current) return;

      const dx = Math.abs(x - startPosRef.current.x);
      const dy = Math.abs(y - startPosRef.current.y);

      if (dx > moveThreshold || dy > moveThreshold) {
        cancel();
      }
    },
    [moveThreshold, cancel]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return;
      start(e.clientX, e.clientY);
    },
    [start]
  );

  const onMouseUp = useCallback(() => {
    cancel();
  }, [cancel]);

  const onMouseLeave = useCallback(() => {
    cancel();
  }, [cancel]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        start(touch.clientX, touch.clientY);
      }
    },
    [start]
  );

  const onTouchEnd = useCallback(() => {
    cancel();
  }, [cancel]);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        checkMove(touch.clientX, touch.clientY);
      }
    },
    [checkMove]
  );

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    onTouchMove,
  };
}
