import type { Metadata } from 'next';
import { Card } from '@/components/ui';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account - Oja',
  description:
    'Create your Oja account and start managing your shopping budget',
};

/**
 * Registration Page
 *
 * New user registration with email and password.
 * Includes 7-day free trial activation.
 */
export default function RegisterPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[var(--color-charcoal)]">
          Create your account
        </h1>
        <p className="text-[var(--color-muted)]">
          Start your 7-day free trial with full access
        </p>
      </div>

      {/* Registration form */}
      <Card padding="spacious">
        <RegisterForm />
      </Card>

      {/* Terms notice */}
      <p className="text-center text-xs text-[var(--color-muted)]">
        By creating an account, you agree to our{' '}
        <a
          href="/terms"
          className="underline hover:text-[var(--color-charcoal)]"
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href="/privacy"
          className="underline hover:text-[var(--color-charcoal)]"
        >
          Privacy Policy
        </a>
      </p>
    </div>
  );
}
