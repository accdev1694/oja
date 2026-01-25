import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { EnvelopeSimple } from '@phosphor-icons/react/dist/ssr';

export const metadata: Metadata = {
  title: 'Verify Email - Oja',
  description: 'Check your email to verify your Oja account',
};

/**
 * Email Verification Page
 *
 * Shown after registration when email confirmation is required.
 */
export default function VerifyEmailPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-orange)]/10 flex items-center justify-center">
          <EnvelopeSimple
            size={32}
            weight="duotone"
            className="text-[var(--color-orange)]"
          />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-charcoal)]">
          Check your email
        </h1>
        <p className="text-[var(--color-muted)]">
          We sent you a verification link to confirm your account
        </p>
      </div>

      {/* Instructions */}
      <Card padding="spacious">
        <div className="space-y-4 text-center">
          <p className="text-sm text-[var(--color-charcoal)]">
            Click the link in your email to verify your account and start your
            7-day free trial.
          </p>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-muted)] mb-4">
              Didn&apos;t receive the email? Check your spam folder or try
              again.
            </p>
            <Link href="/register">
              <Button variant="secondary" size="default">
                Back to Registration
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
