import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset Password - Oja',
  description: 'Reset your Oja account password',
};

/**
 * Forgot Password Page
 *
 * Allows users to request a password reset email.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[var(--color-charcoal)]">
          Reset your password
        </h1>
        <p className="text-[var(--color-muted)]">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {/* Forgot Password Form */}
      <ForgotPasswordForm />

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
