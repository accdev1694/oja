import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Set New Password - Oja',
  description: 'Set a new password for your Oja account',
};

/**
 * Reset Password Page
 *
 * Allows users to set a new password after clicking the reset link.
 * Supabase handles token verification automatically.
 */
export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[var(--color-charcoal)]">
          Set new password
        </h1>
        <p className="text-[var(--color-muted)]">
          Choose a strong password for your account
        </p>
      </div>

      {/* Reset Password Form */}
      <ResetPasswordForm />

      {/* Footer Links */}
      <div className="text-center">
        <Link
          href="/login"
          className="text-sm text-[var(--color-orange)] hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
