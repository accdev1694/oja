'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button, Input, Card } from '@/components/ui';
import { resetPassword } from '@/lib/supabase/auth';
import { EnvelopeSimple } from '@phosphor-icons/react';

const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

/**
 * Forgot Password Form Component
 *
 * Handles password reset email requests.
 * - Shows success message regardless of email existence (security)
 * - Prevents email enumeration attacks
 */
export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    // Validate email
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setFieldError(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { error: resetError } = await resetPassword(email);

      // Always show success to prevent email enumeration
      // Even if there's an error, we don't reveal it
      if (resetError) {
        // Log error for debugging but don't show to user
        console.error('Password reset error:', resetError.message);
      }

      setIsSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSubmitted) {
    return (
      <Card padding="spacious">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-success)]/10 flex items-center justify-center">
            <EnvelopeSimple
              size={32}
              weight="duotone"
              className="text-[var(--color-success)]"
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--color-charcoal)]">
              Check your email
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              If an account exists with that email, you&apos;ll receive a
              password reset link shortly.
            </p>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            Don&apos;t see it? Check your spam folder.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="spacious">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Global Error */}
        {error && (
          <div
            className="p-3 rounded-md bg-[var(--color-error)]/10 border border-[var(--color-error)]/20"
            role="alert"
          >
            <p className="text-sm text-[var(--color-error)]">{error}</p>
          </div>
        )}

        {/* Email Input */}
        <Input
          type="email"
          name="email"
          label="Email"
          placeholder="your@email.com"
          autoComplete="email"
          disabled={isLoading}
          error={fieldError ?? undefined}
          required
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="default"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>
    </Card>
  );
}
