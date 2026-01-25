'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, CheckCircle, Info, Warning, XCircle } from '@phosphor-icons/react';
import { useSwipe } from '@/lib/hooks/useSwipe';

export interface ToastProps {
  /** Toast message to display */
  message: string;
  /** Toast type for styling */
  type?: 'success' | 'info' | 'warning' | 'error';
  /** Optional undo action */
  onUndo?: () => void;
  /** Auto-dismiss duration in ms (default: 3000) */
  duration?: number;
  /** Called when toast is dismissed */
  onDismiss: () => void;
  /** Whether toast is visible */
  isVisible: boolean;
}

const TOAST_STYLES = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    icon: CheckCircle,
    iconColor: 'text-emerald-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: Info,
    iconColor: 'text-blue-600',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: Warning,
    iconColor: 'text-amber-600',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: XCircle,
    iconColor: 'text-red-600',
  },
};

/**
 * Toast notification component
 *
 * Displays temporary messages with optional undo action.
 * Auto-dismisses after specified duration.
 * Can be swiped away or closed with button.
 */
export function Toast({
  message,
  type = 'success',
  onUndo,
  duration = 3000,
  onDismiss,
  isVisible,
}: ToastProps) {
  const shouldReduceMotion = useReducedMotion();
  const styles = TOAST_STYLES[type];
  const Icon = styles.icon;
  const [isPaused, setIsPaused] = useState(false);

  // Swipe to dismiss
  const { onTouchStart, onTouchMove, onTouchEnd, swipeOffset, isSwiping } =
    useSwipe({
      threshold: 80,
      onSwipeLeft: onDismiss,
      onSwipeRight: onDismiss,
    });

  // Auto-dismiss timer
  useEffect(() => {
    if (!isVisible || isPaused) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration, onDismiss, isPaused]);

  // Pause timer on hover/touch
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleUndo = useCallback(() => {
    onUndo?.();
    onDismiss();
  }, [onUndo, onDismiss]);

  // Calculate opacity based on swipe distance
  const swipeOpacity = isSwiping
    ? Math.max(0, 1 - Math.abs(swipeOffset) / 150)
    : 1;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 50 }}
          animate={
            shouldReduceMotion
              ? { opacity: swipeOpacity }
              : { opacity: swipeOpacity, y: 0, x: isSwiping ? swipeOffset : 0 }
          }
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 50 }}
          transition={
            shouldReduceMotion
              ? { duration: 0.1 }
              : { type: 'spring', damping: 25, stiffness: 300 }
          }
          className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto"
          data-testid="toast"
          role="alert"
          aria-live="polite"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={(e) => {
            setIsPaused(true);
            onTouchStart(e);
          }}
          onTouchMove={onTouchMove}
          onTouchEnd={() => {
            setIsPaused(false);
            onTouchEnd();
          }}
        >
          <div
            className={`
              ${styles.bg} ${styles.border} ${styles.text}
              border rounded-xl shadow-lg p-4
              flex items-center gap-3
            `}
            data-testid="toast-content"
          >
            {/* Icon */}
            <Icon
              weight="fill"
              size={24}
              className={styles.iconColor}
              aria-hidden="true"
              data-testid="toast-icon"
            />

            {/* Message */}
            <p
              className="flex-1 text-sm font-medium"
              data-testid="toast-message"
            >
              {message}
            </p>

            {/* Undo button */}
            {onUndo && (
              <button
                type="button"
                onClick={handleUndo}
                className={`
                  text-sm font-semibold px-3 py-1 rounded-lg
                  bg-white/50 hover:bg-white/80
                  transition-colors
                  ${styles.text}
                `}
                data-testid="toast-undo"
              >
                Undo
              </button>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={onDismiss}
              className={`
                p-1 rounded-lg
                hover:bg-white/50
                transition-colors
                ${styles.iconColor}
              `}
              aria-label="Dismiss"
              data-testid="toast-close"
            >
              <X weight="bold" size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage toast state
 */
export interface ToastState {
  isVisible: boolean;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  onUndo?: () => void;
}

export interface UseToastResult {
  toast: ToastState;
  showToast: (
    message: string,
    options?: {
      type?: 'success' | 'info' | 'warning' | 'error';
      onUndo?: () => void;
    }
  ) => void;
  hideToast: () => void;
}

export function useToast(): UseToastResult {
  const [toast, setToast] = useState<ToastState>({
    isVisible: false,
    message: '',
    type: 'success',
    onUndo: undefined,
  });

  const showToast = useCallback(
    (
      message: string,
      options: {
        type?: 'success' | 'info' | 'warning' | 'error';
        onUndo?: () => void;
      } = {}
    ) => {
      setToast({
        isVisible: true,
        message,
        type: options.type || 'success',
        onUndo: options.onUndo,
      });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  return { toast, showToast, hideToast };
}
