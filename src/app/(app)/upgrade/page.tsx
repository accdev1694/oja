'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { SubscriptionPlan, PLAN_PRICES } from '@/lib/types/subscription';

/**
 * Upgrade Page
 *
 * Displays subscription plan options.
 * Placeholder for Stripe Checkout integration.
 */
export default function UpgradePage() {
  const router = useRouter();

  const plans = [
    {
      plan: SubscriptionPlan.MONTHLY,
      name: 'Monthly',
      price: PLAN_PRICES[SubscriptionPlan.MONTHLY],
      description: 'Billed monthly',
      features: [
        'Unlimited pantry items',
        'Unlimited shopping lists',
        'Unlimited receipt scans',
        'Full price history',
        'Advanced insights',
        'Data export',
      ],
    },
    {
      plan: SubscriptionPlan.ANNUAL,
      name: 'Annual',
      price: PLAN_PRICES[SubscriptionPlan.ANNUAL],
      description: 'Billed annually (save 30%)',
      features: [
        'Unlimited pantry items',
        'Unlimited shopping lists',
        'Unlimited receipt scans',
        'Full price history',
        'Advanced insights',
        'Data export',
      ],
      recommended: true,
    },
  ];

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    // In production, this would initiate Stripe Checkout
    alert(`Stripe integration coming soon! Selected plan: ${plan}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-[var(--color-primary)] text-sm mb-4"
          >
            &larr; Back to Settings
          </button>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Upgrade to Premium
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Unlock all features and save more on your shopping
          </p>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          {plans.map((planOption) => (
            <div
              key={planOption.plan}
              className={`bg-white rounded-lg p-4 shadow-sm border ${
                planOption.recommended
                  ? 'border-[var(--color-primary)] border-2'
                  : 'border-[var(--color-border)]'
              }`}
              data-testid={`plan-${planOption.plan}`}
            >
              {planOption.recommended && (
                <span className="inline-block bg-[var(--color-primary)] text-white text-xs font-medium px-2 py-1 rounded-full mb-2">
                  Best Value
                </span>
              )}

              <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">
                  {planOption.name}
                </h2>
                <div className="text-right">
                  <span className="text-2xl font-bold text-[var(--color-text)]">
                    {formatPrice(planOption.price)}
                  </span>
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    /
                    {planOption.plan === SubscriptionPlan.MONTHLY ? 'mo' : 'yr'}
                  </span>
                </div>
              </div>

              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                {planOption.description}
              </p>

              <ul className="space-y-2 mb-4">
                {planOption.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-[var(--color-text)]"
                  >
                    <span className="text-[var(--color-safe-zone-green)]">
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant={planOption.recommended ? 'primary' : 'secondary'}
                size="default"
                className="w-full"
                onClick={() => handleSelectPlan(planOption.plan)}
              >
                {planOption.recommended ? 'Get Annual' : 'Get Monthly'}
              </Button>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <p className="text-xs text-center text-[var(--color-text-secondary)] mt-6">
          Stripe payment integration coming in Epic 8.
          <br />
          Cancel anytime. No hidden fees.
        </p>
      </div>
    </div>
  );
}
