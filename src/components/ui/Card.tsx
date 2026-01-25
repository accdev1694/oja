import { HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'compact' | 'default' | 'spacious';
  interactive?: boolean;
}

/**
 * Card Component
 *
 * Container component with 12px border radius.
 * - Composable with CardHeader, CardContent, CardFooter
 * - Support for interactive/hoverable state
 * - Supports reduced motion
 *
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader><h3>Title</h3></CardHeader>
 *   <CardContent>Content here</CardContent>
 *   <CardFooter>Actions</CardFooter>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { padding = 'default', interactive = false, className = '', children, ...props },
    ref
  ) => {
    const baseStyles =
      'rounded-[var(--radius-md)] bg-white border border-[var(--color-border)] transition-shadow motion-reduce:transition-none';

    const interactiveStyles = interactive
      ? 'hover:shadow-md cursor-pointer active:shadow-sm'
      : '';

    const paddingStyles = {
      compact: 'p-3',
      default: 'p-4',
      spacious: 'p-6',
    };

    const classes = `${baseStyles} ${interactiveStyles} ${paddingStyles[padding]} ${className}`;

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * CardHeader Component
 *
 * Header section for Card with bottom border.
 */
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`border-b border-[var(--color-border)] pb-3 mb-4 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * CardContent Component
 *
 * Main content section for Card.
 */
export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

/**
 * CardFooter Component
 *
 * Footer section for Card with top border.
 */
export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`border-t border-[var(--color-border)] pt-3 mt-4 flex items-center gap-2 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
