'use client';

import { useMemo } from 'react';
import { checkPasswordStrength } from '@/lib/validations/auth';
import { Check, X } from '@phosphor-icons/react';

interface PasswordStrengthProps {
  password: string;
}

/**
 * Password Strength Indicator
 *
 * Shows password strength with visual meter and requirements checklist.
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label } = useMemo(
    () => checkPasswordStrength(password),
    [password]
  );

  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
  ];

  const strengthColors = {
    weak: 'bg-[var(--color-error)]',
    fair: 'bg-[var(--color-warning)]',
    good: 'bg-[var(--color-success)]',
    strong: 'bg-[var(--color-success)]',
  };

  const strengthLabels = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
  };

  if (!password) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Strength meter */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index < score
                  ? strengthColors[label]
                  : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-[var(--color-muted)]">
          Password strength:{' '}
          <span
            className={`font-medium ${
              label === 'weak'
                ? 'text-[var(--color-error)]'
                : label === 'fair'
                  ? 'text-[var(--color-warning)]'
                  : 'text-[var(--color-success)]'
            }`}
          >
            {strengthLabels[label]}
          </span>
        </p>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1.5">
        {requirements.map((req) => (
          <li
            key={req.label}
            className={`flex items-center gap-2 text-xs ${
              req.met
                ? 'text-[var(--color-success)]'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {req.met ? (
              <Check size={14} weight="bold" />
            ) : (
              <X size={14} weight="bold" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
