'use client';

import { useState, forwardRef, useId, type InputHTMLAttributes } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

export interface PasswordInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  label?: string;
  error?: string;
}

/**
 * Password Input Component
 *
 * Input field with show/hide toggle for passwords.
 * - 44px touch target
 * - WCAG AA compliant
 * - Accessible labels and states
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = useId();
    const inputId = id || `password-${generatedId}`;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--color-charcoal)] mb-2"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            className={`
              w-full h-11 px-4 pr-12 rounded-md border bg-white font-sans text-base
              transition-colors focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[var(--color-orange)] focus-visible:ring-offset-2
              disabled:cursor-not-allowed disabled:opacity-50
              motion-reduce:transition-none
              ${
                error
                  ? 'border-[var(--color-error)] focus:border-[var(--color-error)]'
                  : 'border-[var(--color-border)] focus:border-[var(--color-orange)]'
              }
              ${className}
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={errorId}
            {...props}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--color-muted)] hover:text-[var(--color-charcoal)] transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeSlash size={20} weight="bold" />
            ) : (
              <Eye size={20} weight="bold" />
            )}
          </button>
        </div>

        {error && (
          <p
            id={errorId}
            className="mt-2 text-sm text-[var(--color-error)]"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
