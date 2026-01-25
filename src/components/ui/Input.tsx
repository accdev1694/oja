import { type InputHTMLAttributes, forwardRef, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

/**
 * Input Component
 *
 * Accessible form input with label and error states.
 * - 44px minimum touch target height
 * - Proper ARIA labels and descriptions
 * - WCAG AA contrast compliance
 * - Supports reduced motion
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   helperText="We'll never share your email"
 * />
 * <Input
 *   label="Password"
 *   type="password"
 *   error="Password must be at least 8 characters"
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      disabled,
      className = '',
      id,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    // Generate stable IDs for accessibility
    const generatedId = useId();
    const inputId = id || generatedId;
    const helperTextId = helperText ? `${inputId}-helper` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    const describedBy = [ariaDescribedBy, helperTextId, errorId]
      .filter(Boolean)
      .join(' ');

    const baseStyles =
      'w-full h-11 px-4 rounded-md border bg-white font-sans text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-orange)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';

    const stateStyles = error
      ? 'border-[var(--color-error)] focus:border-[var(--color-error)]'
      : 'border-[var(--color-border)] focus:border-[var(--color-orange)]';

    const classes = `${baseStyles} ${stateStyles} ${className}`;

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

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={classes}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy || undefined}
          {...props}
        />

        {helperText && !error && (
          <p
            id={helperTextId}
            className="mt-2 text-sm text-[var(--color-muted)]"
          >
            {helperText}
          </p>
        )}

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

Input.displayName = 'Input';
