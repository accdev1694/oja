/**
 * Subscription Storage Utilities
 *
 * Manages subscription status in localStorage.
 * Placeholder for Supabase integration.
 */

import {
  SubscriptionPlan,
  type SubscriptionStatus,
  TRIAL_DURATION_DAYS,
  PLAN_DISPLAY_NAMES,
  PLAN_FEATURES,
  type PlanFeatures,
} from '@/lib/types/subscription';

// Storage key
export const SUBSCRIPTION_STORAGE_KEY = 'oja_subscription_status';

/**
 * Check if running in browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Create a default trial subscription status
 */
export function createTrialStatus(): SubscriptionStatus {
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);

  return {
    plan: SubscriptionPlan.TRIAL,
    trialStartDate: now.toISOString(),
    trialEndDate: trialEnd.toISOString(),
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    isActive: true,
  };
}

/**
 * Get subscription status from localStorage
 * Creates a trial subscription if none exists
 */
export function getSubscriptionStatus(): SubscriptionStatus {
  if (!isBrowser) {
    return createTrialStatus();
  }

  try {
    const stored = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);

    if (!stored) {
      // First time user - create trial
      const trialStatus = createTrialStatus();
      saveSubscriptionStatus(trialStatus);
      return trialStatus;
    }

    const status = JSON.parse(stored) as SubscriptionStatus;

    // Check if trial has expired
    if (status.plan === SubscriptionPlan.TRIAL && status.trialEndDate) {
      const trialEnd = new Date(status.trialEndDate);
      if (new Date() > trialEnd) {
        // Trial expired - downgrade to free
        const expiredStatus: SubscriptionStatus = {
          ...status,
          plan: SubscriptionPlan.FREE,
          isActive: true,
        };
        saveSubscriptionStatus(expiredStatus);
        return expiredStatus;
      }
    }

    return status;
  } catch {
    return createTrialStatus();
  }
}

/**
 * Save subscription status to localStorage
 */
export function saveSubscriptionStatus(status: SubscriptionStatus): void {
  if (!isBrowser) return;
  localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(status));
}

/**
 * Calculate days remaining in trial
 * Returns 0 if not on trial or trial expired
 */
export function getTrialDaysRemaining(): number {
  const status = getSubscriptionStatus();

  if (status.plan !== SubscriptionPlan.TRIAL || !status.trialEndDate) {
    return 0;
  }

  const now = new Date();
  const trialEnd = new Date(status.trialEndDate);
  const diffMs = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Get display name for current plan
 */
export function getPlanDisplayName(plan: SubscriptionPlan): string {
  return PLAN_DISPLAY_NAMES[plan];
}

/**
 * Get features for current plan
 */
export function getCurrentPlanFeatures(): PlanFeatures {
  const status = getSubscriptionStatus();
  return PLAN_FEATURES[status.plan];
}

/**
 * Check if user has premium features
 * (Trial or paid subscription)
 */
export function hasPremiumAccess(): boolean {
  const status = getSubscriptionStatus();
  return (
    status.plan === SubscriptionPlan.TRIAL ||
    status.plan === SubscriptionPlan.MONTHLY ||
    status.plan === SubscriptionPlan.ANNUAL
  );
}

/**
 * Check if user is on a paid plan
 */
export function isOnPaidPlan(): boolean {
  const status = getSubscriptionStatus();
  return (
    status.plan === SubscriptionPlan.MONTHLY ||
    status.plan === SubscriptionPlan.ANNUAL
  );
}

/**
 * Format subscription end date for display
 */
export function formatSubscriptionDate(dateString: string | null): string {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Upgrade to a paid plan (mock for now)
 * In production, this would integrate with Stripe
 */
export function upgradeToPlan(
  plan: SubscriptionPlan.MONTHLY | SubscriptionPlan.ANNUAL
): void {
  if (!isBrowser) return;

  const now = new Date();
  const endDate = new Date(now);

  if (plan === SubscriptionPlan.MONTHLY) {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  const status: SubscriptionStatus = {
    plan,
    trialStartDate: null,
    trialEndDate: null,
    subscriptionStartDate: now.toISOString(),
    subscriptionEndDate: endDate.toISOString(),
    isActive: true,
  };

  saveSubscriptionStatus(status);
}

/**
 * Cancel subscription (revert to free)
 */
export function cancelSubscription(): void {
  if (!isBrowser) return;

  const currentStatus = getSubscriptionStatus();

  const status: SubscriptionStatus = {
    plan: SubscriptionPlan.FREE,
    trialStartDate: currentStatus.trialStartDate,
    trialEndDate: currentStatus.trialEndDate,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    isActive: true,
  };

  saveSubscriptionStatus(status);
}

/**
 * Clear subscription data (for testing)
 */
export function clearSubscriptionData(): void {
  if (!isBrowser) return;
  localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
}
