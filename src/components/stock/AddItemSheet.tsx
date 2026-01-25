'use client';

import { useEffect, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { AddItemForm } from './AddItemForm';
import { type StockLevel } from '@/lib/utils/onboardingStorage';

interface AddItemSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback when sheet is closed */
  onClose: () => void;
  /** Callback when item is added */
  onAdd: (data: { name: string; category: string; level: StockLevel }) => void;
  /** Loading state during submission */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
}

/**
 * Add Item Sheet Component
 *
 * Bottom sheet modal for adding new pantry items.
 * Slides up from bottom with backdrop.
 */
export function AddItemSheet({
  isOpen,
  onClose,
  onAdd,
  isLoading = false,
  error = null,
}: AddItemSheetProps) {
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

  const handleBackdropClick = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const sheetVariants: Variants = {
    hidden: {
      y: '100%',
      opacity: shouldReduceMotion ? 0 : 1,
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: shouldReduceMotion ? 'tween' : 'spring',
        damping: 30,
        stiffness: 300,
        duration: shouldReduceMotion ? 0.15 : undefined,
      },
    },
    exit: {
      y: '100%',
      opacity: shouldReduceMotion ? 0 : 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.2,
        ease: 'easeIn' as const,
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
            onClick={handleBackdropClick}
            data-testid="sheet-backdrop"
          />

          {/* Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-hidden"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-title"
            data-testid="add-item-sheet"
          >
            <div className="bg-white rounded-t-2xl shadow-xl">
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-6 pb-4 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between">
                  <h2
                    id="add-item-title"
                    className="text-xl font-bold text-[var(--color-text)]"
                  >
                    Add Item
                  </h2>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="p-2 -mr-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    aria-label="Close"
                    data-testid="close-button"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="px-6 py-5 max-h-[calc(90vh-100px)] overflow-y-auto">
                <AddItemForm
                  onSubmit={onAdd}
                  onCancel={onClose}
                  isLoading={isLoading}
                  error={error}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
