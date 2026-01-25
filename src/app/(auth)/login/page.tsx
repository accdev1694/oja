import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In - Oja',
  description: 'Sign in to your Oja account to manage your pantry and shopping',
};

/**
 * Login Page
 *
 * Allows returning users to sign in with email and password.
 */
export default function LoginPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[var(--color-charcoal)]">
          Welcome back
        </h1>
        <p className="text-[var(--color-muted)]">
          Sign in to continue to your pantry
        </p>
      </div>

      {/* Login Form */}
      <LoginForm />

      {/* Footer Links */}
      <div className="text-center space-y-3">
        <Link
          href="/forgot-password"
          className="text-sm text-[var(--color-orange)] hover:underline"
        >
          Forgot your password?
        </Link>

        <p className="text-sm text-[var(--color-muted)]">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-[var(--color-orange)] font-medium hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
