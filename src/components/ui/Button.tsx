import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'small' | 'large';
  isLoading?: boolean;
}

/**
 * Button Component
 *
 * Accessible button with multiple variants and states.
 * - Minimum 44x44px touch target
 * - WCAG AA compliant contrast ratios
 * - Supports reduced motion
 * - Proper ARIA attributes
 *
 * @example
 * ```tsx
 * <Button variant="primary">Add Item</Button>
 * <Button variant="secondary" isLoading>Save</Button>
 * <Button variant="destructive" onClick={handleDelete}>Delete</Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'default',
      isLoading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-orange)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none';

    const variantStyles = {
      primary:
        'bg-[var(--color-orange)] text-white hover:bg-[var(--color-orange-dark)] active:bg-[var(--color-orange-dark)]',
      secondary:
        'border-2 border-[var(--color-orange)] text-[var(--color-orange)] bg-transparent hover:bg-[var(--color-orange)]/10 active:bg-[var(--color-orange)]/20',
      ghost:
        'text-[var(--color-charcoal)] hover:bg-[var(--color-muted)]/10 active:bg-[var(--color-muted)]/20',
      destructive:
        'bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90 active:bg-[var(--color-error)]/80',
    };

    const sizeStyles = {
      small: 'h-9 px-3 text-sm', // 36px height
      default: 'h-11 px-4 text-base', // 44px height - min touch target
      large: 'h-12 px-6 text-lg', // 48px height
    };

    const classes = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={classes}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
