'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input, Button } from '@/components/ui';
import { PasswordInput } from './PasswordInput';
import { PasswordStrength } from './PasswordStrength';
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth';
import { signUpWithEmail } from '@/lib/supabase/auth';

/**
 * Registration Form Component
 *
 * Handles user registration with email and password.
 * - Client-side validation with Zod
 * - Password strength indicator
 * - Inline error messages
 * - Loading states
 */
export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof RegisterFormData | 'root', string>>
  >({});

  const handleChange =
    (field: keyof RegisterFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    // Validate form data
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof RegisterFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof RegisterFormData;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }

    // Attempt registration
    const { user, error } = await signUpWithEmail(
      formData.email,
      formData.password
    );

    if (error) {
      // Handle specific error cases
      if (error.message.includes('already registered')) {
        setErrors({
          email: 'This email is already registered. Try signing in instead.',
        });
      } else {
        setErrors({
          root: error.message || 'An error occurred during registration.',
        });
      }
      setIsLoading(false);
      return;
    }

    if (user) {
      // Redirect to welcome screen or email confirmation page
      if (user.email_confirmed_at) {
        router.push('/welcome');
      } else {
        router.push('/verify-email');
      }
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Root error message */}
      {errors.root && (
        <div
          className="p-4 rounded-md bg-[var(--color-error)]/10 border border-[var(--color-error)]/20"
          role="alert"
        >
          <p className="text-sm text-[var(--color-error)]">{errors.root}</p>
        </div>
      )}

      {/* Email field */}
      <Input
        type="email"
        label="Email"
        placeholder="you@example.com"
        value={formData.email}
        onChange={handleChange('email')}
        error={errors.email}
        disabled={isLoading}
        autoComplete="email"
        autoFocus
      />

      {/* Password field */}
      <div>
        <PasswordInput
          label="Password"
          placeholder="Create a password"
          value={formData.password}
          onChange={handleChange('password')}
          error={errors.password}
          disabled={isLoading}
          autoComplete="new-password"
        />
        <PasswordStrength password={formData.password} />
      </div>

      {/* Confirm Password field */}
      <PasswordInput
        label="Confirm Password"
        placeholder="Confirm your password"
        value={formData.confirmPassword}
        onChange={handleChange('confirmPassword')}
        error={errors.confirmPassword}
        disabled={isLoading}
        autoComplete="new-password"
      />

      {/* Submit button */}
      <Button
        type="submit"
        variant="primary"
        size="large"
        className="w-full"
        isLoading={isLoading}
        disabled={isLoading}
      >
        Create Account
      </Button>

      {/* Sign in link */}
      <p className="text-center text-sm text-[var(--color-muted)]">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-[var(--color-orange)] hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
