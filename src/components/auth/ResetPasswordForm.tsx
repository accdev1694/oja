'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button, Card } from '@/components/ui';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { passwordSchema } from '@/lib/validations/auth';
import { createClient } from '@/lib/supabase/client';

const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

/**
 * Reset Password Form Component
 *
 * Allows users to set a new password after clicking reset link.
 * - Validates password with same requirements as registration
 * - Shows password strength indicator
 * - Redirects to login on success
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<ResetPasswordData>>(
    {}
  );
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    };

    // Validate with Zod
    const result = resetPasswordSchema.safeParse(data);
    if (!result.success) {
      const errors: Partial<ResetPasswordData> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ResetPasswordData;
        errors[field] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        if (updateError.message.includes('session')) {
          setError('Your reset link has expired. Please request a new one.');
        } else {
          setError('Failed to update password. Please try again.');
        }
        return;
      }

      // Redirect to login with success message
      router.push('/login?message=password_reset_success');
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

        {/* New Password Input */}
        <div>
          <PasswordInput
            name="password"
            label="New Password"
            placeholder="Enter new password"
            autoComplete="new-password"
            disabled={isLoading}
            error={fieldErrors.password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <PasswordStrength password={password} />
        </div>

        {/* Confirm Password Input */}
        <PasswordInput
          name="confirmPassword"
          label="Confirm New Password"
          placeholder="Confirm new password"
          autoComplete="new-password"
          disabled={isLoading}
          error={fieldErrors.confirmPassword}
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
          {isLoading ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </Card>
  );
}
