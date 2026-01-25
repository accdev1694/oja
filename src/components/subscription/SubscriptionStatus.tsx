'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import {
  SubscriptionPlan,
  FEATURES,
  type SubscriptionStatus as SubscriptionStatusType,
} from '@/lib/types/subscription';
import {
  getSubscriptionStatus,
  getTrialDaysRemaining,
  getPlanDisplayName,
  formatSubscriptionDate,
  hasPremiumAccess,
} from '@/lib/utils/subscriptionStorage';

interface SubscriptionStatusProps {
  /** Callback when user clicks upgrade */
  onUpgrade?: () => void;
}

/**
 * Subscription Status Component
 *
 * Displays current subscription plan, trial status,
 * and available features.
 */
export function SubscriptionStatus({ onUpgrade }: SubscriptionStatusProps) {
  // Use lazy initializers to load data on mount
  const [status] = useState<SubscriptionStatusType | null>(() =>
    getSubscriptionStatus()
  );
  const [trialDays] = useState(() => getTrialDaysRemaining());
  const [isPremium] = useState(() => hasPremiumAccess());

  if (!status) {
    return (
      <div
        className="animate-pulse bg-gray-100 rounded-lg h-48"
        data-testid="subscription-loading"
      />
    );
  }

  const planBadgeColors: Record<SubscriptionPlan, string> = {
    [SubscriptionPlan.TRIAL]: 'bg-blue-100 text-blue-800',
    [SubscriptionPlan.FREE]: 'bg-gray-100 text-gray-800',
    [SubscriptionPlan.MONTHLY]:
      'bg-[var(--color-primary)] bg-opacity-20 text-[var(--color-primary)]',
    [SubscriptionPlan.ANNUAL]:
      'bg-[var(--color-safe-zone-green)] bg-opacity-20 text-[var(--color-safe-zone-green)]',
  };

  return (
    <div
      className="bg-white rounded-lg p-5 shadow-sm border border-[var(--color-border)]"
      data-testid="subscription-status"
    >
      {/* Plan Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text)]">
            Subscription
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage your plan
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${planBadgeColors[status.plan]}`}
          data-testid="plan-badge"
        >
          {getPlanDisplayName(status.plan)}
        </span>
      </div>

      {/* Trial Banner */}
      {status.plan === SubscriptionPlan.TRIAL && trialDays > 0 && (
        <div
          className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4"
          data-testid="trial-banner"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">⏰</span>
            <div>
              <p className="text-sm font-medium text-blue-800">
                {trialDays} {trialDays === 1 ? 'day' : 'days'} left in your
                trial
              </p>
              <p className="text-xs text-blue-600">
                Enjoy all premium features during your trial
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trial Expired Banner */}
      {status.plan === SubscriptionPlan.FREE && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4"
          data-testid="free-tier-banner"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🔓</span>
            <div>
              <p className="text-sm font-medium text-amber-800">
                You&apos;re on the Free plan
              </p>
              <p className="text-xs text-amber-600">
                Upgrade to unlock all features
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Paid Plan Banner */}
      {(status.plan === SubscriptionPlan.MONTHLY ||
        status.plan === SubscriptionPlan.ANNUAL) && (
        <div
          className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4"
          data-testid="paid-plan-banner"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <div>
              <p className="text-sm font-medium text-green-800">
                Premium member
              </p>
              {status.subscriptionEndDate && (
                <p className="text-xs text-green-600">
                  Renews on {formatSubscriptionDate(status.subscriptionEndDate)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Features List */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">
          {isPremium ? 'Your Features' : 'Free Plan Limits'}
        </h4>
        <ul className="space-y-2">
          {FEATURES.map((feature) => (
            <li
              key={feature.id}
              className="flex items-center justify-between text-sm"
              data-testid={`feature-${feature.id}`}
            >
              <span className="text-[var(--color-text)]">{feature.name}</span>
              <span
                className={
                  isPremium
                    ? 'text-[var(--color-safe-zone-green)] font-medium'
                    : 'text-[var(--color-text-secondary)]'
                }
              >
                {isPremium ? feature.paidBenefit : feature.freeLimit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Upgrade Button (only show for free/trial users) */}
      {(status.plan === SubscriptionPlan.FREE ||
        status.plan === SubscriptionPlan.TRIAL) && (
        <Button
          type="button"
          variant="primary"
          size="default"
          className="w-full"
          onClick={onUpgrade}
          data-testid="upgrade-button"
        >
          {status.plan === SubscriptionPlan.TRIAL
            ? 'View Upgrade Options'
            : 'Upgrade to Premium'}
        </Button>
      )}

      {/* Manage Subscription (for paid users) */}
      {(status.plan === SubscriptionPlan.MONTHLY ||
        status.plan === SubscriptionPlan.ANNUAL) && (
        <Button
          type="button"
          variant="secondary"
          size="default"
          className="w-full"
          onClick={onUpgrade}
          data-testid="manage-subscription-button"
        >
          Manage Subscription
        </Button>
      )}
    </div>
  );
}
