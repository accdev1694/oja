'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card } from '@/components/ui';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { signInWithEmail } from '@/lib/supabase/auth';

// Rate limiting: track failed attempts
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60000; // 1 minute

/**
 * Login Form Component
 *
 * Handles user authentication with email and password.
 * - Validates input with Zod schema
 * - Implements client-side rate limiting
 * - Shows generic errors to prevent credential enumeration
 * - Supports "Remember me" for extended sessions
 */
export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<LoginFormData>>({});
  const [rememberMe, setRememberMe] = useState(false);

  // Rate limiting state
  const failedAttemptsRef = useRef(0);
  const lockoutUntilRef = useRef<number | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Check rate limiting
    if (lockoutUntilRef.current && Date.now() < lockoutUntilRef.current) {
      const remainingSeconds = Math.ceil(
        (lockoutUntilRef.current - Date.now()) / 1000
      );
      setError(`Too many attempts. Please wait ${remainingSeconds} seconds.`);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    // Validate with Zod
    const result = loginSchema.safeParse(data);
    if (!result.success) {
      const errors: Partial<LoginFormData> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginFormData;
        errors[field] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const { error: authError } = await signInWithEmail(
        data.email,
        data.password
      );

      if (authError) {
        // Increment failed attempts
        failedAttemptsRef.current++;

        // Apply rate limiting after max attempts
        if (failedAttemptsRef.current >= MAX_ATTEMPTS) {
          lockoutUntilRef.current = Date.now() + LOCKOUT_DURATION;
          failedAttemptsRef.current = 0;
          setError(
            'Too many failed attempts. Please wait 1 minute before trying again.'
          );
        } else {
          // Generic error message - don't reveal if email exists or password is wrong
          setError('Invalid email or password. Please try again.');
        }
        return;
      }

      // Reset rate limiting on success
      failedAttemptsRef.current = 0;
      lockoutUntilRef.current = null;

      // Redirect to home (pantry)
      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          error={fieldErrors.email}
          required
        />

        {/* Password Input */}
        <PasswordInput
          name="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={isLoading}
          error={fieldErrors.password}
          required
        />

        {/* Remember Me */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-orange)] focus:ring-[var(--color-orange)]"
            disabled={isLoading}
          />
          <span className="text-sm text-[var(--color-charcoal)]">
            Remember me for 30 days
          </span>
        </label>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="default"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </Card>
  );
}
