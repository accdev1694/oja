'use client';

import { useEffect } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { Button } from './Button';

interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Confirm button text (default: "Confirm") */
  confirmText?: string;
  /** Cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Confirm button variant ("danger" for delete actions, "primary" otherwise) */
  variant?: 'danger' | 'primary';
  /** Callback when dialog is closed/cancelled */
  onClose: () => void;
  /** Callback when action is confirmed */
  onConfirm: () => void;
  /** Loading state during confirmation */
  isLoading?: boolean;
}

/**
 * Confirm Dialog Component
 *
 * Generic confirmation dialog for user actions.
 * Centered modal with backdrop.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  onClose,
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const shouldReduceMotion = useReducedMotion();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const dialogVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.95,
      y: shouldReduceMotion ? 0 : 10,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.2,
        ease: 'easeOut' as const,
      },
    },
    exit: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.95,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.15,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={isLoading ? undefined : onClose}
            data-testid="confirm-dialog-backdrop"
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.div
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
              variants={dialogVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
              data-testid="confirm-dialog"
            >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    variant === 'danger' ? 'bg-red-100' : 'bg-orange-100'
                  }`}
                >
                  <span
                    className="text-4xl"
                    role="img"
                    aria-label={variant === 'danger' ? 'Warning' : 'Question'}
                  >
                    {variant === 'danger' ? '⚠️' : '❓'}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h2
                id="confirm-dialog-title"
                className="text-xl font-bold text-[var(--color-text)] text-center mb-3"
              >
                {title}
              </h2>

              {/* Message */}
              <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6">
                {message}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="default"
                  className="flex-1"
                  onClick={onClose}
                  disabled={isLoading}
                  data-testid="confirm-dialog-cancel"
                >
                  {cancelText}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="default"
                  className={`flex-1 ${
                    variant === 'danger'
                      ? '!bg-red-600 hover:!bg-red-700 disabled:!bg-red-300'
                      : ''
                  }`}
                  onClick={handleConfirm}
                  disabled={isLoading}
                  data-testid="confirm-dialog-confirm"
                >
                  {isLoading ? 'Processing...' : confirmText}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
