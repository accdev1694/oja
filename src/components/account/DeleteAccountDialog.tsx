'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { Button } from '@/components/ui';
import {
  DELETION_CONFIRMATION_TEXT,
  isValidDeletionConfirmation,
} from '@/lib/utils/accountDeletion';

interface DeleteAccountDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when deletion is confirmed */
  onConfirm: () => Promise<void>;
  /** Loading state during deletion */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
}

/**
 * Delete Account Dialog Component
 *
 * Modal dialog for confirming account deletion.
 * Requires typing "DELETE" to enable the delete button.
 */
export function DeleteAccountDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  error = null,
}: DeleteAccountDialogProps) {
  const shouldReduceMotion = useReducedMotion();
  const [confirmText, setConfirmText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(isOpen);

  const isConfirmValid = isValidDeletionConfirmation(confirmText);

  // Handle close with state reset
  const handleClose = useCallback(() => {
    setConfirmText('');
    onClose();
  }, [onClose]);

  // Focus input when dialog opens (transition from closed to open)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Reset text when opening (async to satisfy lint rule)
      // Use microtask to avoid cascading render warning
      queueMicrotask(() => {
        setConfirmText('');
      });
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, isLoading, handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmValid && !isLoading) {
      await onConfirm();
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
            onClick={isLoading ? undefined : handleClose}
            data-testid="dialog-backdrop"
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
              aria-labelledby="delete-dialog-title"
              data-testid="delete-account-dialog"
            >
              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-4xl" role="img" aria-label="Warning">
                    ⚠️
                  </span>
                </div>
              </div>

              {/* Title */}
              <h2
                id="delete-dialog-title"
                className="text-xl font-bold text-[var(--color-text)] text-center mb-2"
              >
                Delete Your Account?
              </h2>

              {/* Warning Text */}
              <div className="text-sm text-[var(--color-text-secondary)] text-center mb-6">
                <p className="mb-3">
                  This action cannot be undone. Deleting your account will:
                </p>
                <ul className="text-left space-y-1 bg-red-50 rounded-lg p-3 border border-red-100">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>Remove all your pantry items</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>Delete all shopping lists</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>Erase your budget and preferences</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>Cancel any active subscription</span>
                  </li>
                </ul>
              </div>

              {/* Confirmation Form */}
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label
                    htmlFor="confirm-delete"
                    className="block text-sm font-medium text-[var(--color-text)] mb-2"
                  >
                    Type{' '}
                    <span className="font-bold text-red-600">
                      {DELETION_CONFIRMATION_TEXT}
                    </span>{' '}
                    to confirm
                  </label>
                  <input
                    ref={inputRef}
                    id="confirm-delete"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={`Type ${DELETION_CONFIRMATION_TEXT} to confirm`}
                    className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={isLoading}
                    autoComplete="off"
                    data-testid="confirm-delete-input"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
                    role="alert"
                    data-testid="delete-error"
                  >
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="default"
                    className="flex-1"
                    onClick={handleClose}
                    disabled={isLoading}
                    data-testid="cancel-delete-button"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="default"
                    className="flex-1 !bg-red-600 hover:!bg-red-700 disabled:!bg-red-300"
                    disabled={!isConfirmValid || isLoading}
                    data-testid="confirm-delete-button"
                  >
                    {isLoading ? 'Deleting...' : 'Delete Account'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
