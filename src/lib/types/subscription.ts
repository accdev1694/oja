/**
 * Subscription Types and Constants
 *
 * Defines subscription plans, features, and related types for Oja.
 */

/**
 * Subscription plan tiers
 */
export enum SubscriptionPlan {
  TRIAL = 'trial',
  FREE = 'free',
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

/**
 * Plan display names
 */
export const PLAN_DISPLAY_NAMES: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.TRIAL]: 'Trial',
  [SubscriptionPlan.FREE]: 'Free',
  [SubscriptionPlan.MONTHLY]: 'Monthly',
  [SubscriptionPlan.ANNUAL]: 'Annual',
};

/**
 * Plan prices (in pence)
 */
export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.TRIAL]: 0,
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.MONTHLY]: 299, // £2.99
  [SubscriptionPlan.ANNUAL]: 2499, // £24.99
};

/**
 * Trial duration in days
 */
export const TRIAL_DURATION_DAYS = 14;

/**
 * Features available per plan
 */
export interface PlanFeatures {
  maxPantryItems: number | null; // null = unlimited
  maxShoppingLists: number | null; // null = unlimited
  maxReceiptsPerMonth: number | null; // null = unlimited
  priceHistory: boolean;
  fullInsights: boolean;
  exportData: boolean;
}

/**
 * Feature limits by plan
 */
export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  [SubscriptionPlan.TRIAL]: {
    maxPantryItems: null,
    maxShoppingLists: null,
    maxReceiptsPerMonth: null,
    priceHistory: true,
    fullInsights: true,
    exportData: true,
  },
  [SubscriptionPlan.FREE]: {
    maxPantryItems: 20,
    maxShoppingLists: 2,
    maxReceiptsPerMonth: 3,
    priceHistory: false,
    fullInsights: false,
    exportData: false,
  },
  [SubscriptionPlan.MONTHLY]: {
    maxPantryItems: null,
    maxShoppingLists: null,
    maxReceiptsPerMonth: null,
    priceHistory: true,
    fullInsights: true,
    exportData: true,
  },
  [SubscriptionPlan.ANNUAL]: {
    maxPantryItems: null,
    maxShoppingLists: null,
    maxReceiptsPerMonth: null,
    priceHistory: true,
    fullInsights: true,
    exportData: true,
  },
};

/**
 * Feature display information
 */
export interface FeatureInfo {
  id: string;
  name: string;
  description: string;
  freeLimit?: string;
  paidBenefit: string;
}

/**
 * All features for display
 */
export const FEATURES: FeatureInfo[] = [
  {
    id: 'pantryItems',
    name: 'Pantry Items',
    description: 'Track items in your pantry',
    freeLimit: '20 items',
    paidBenefit: 'Unlimited items',
  },
  {
    id: 'shoppingLists',
    name: 'Shopping Lists',
    description: 'Create and manage shopping lists',
    freeLimit: '2 lists',
    paidBenefit: 'Unlimited lists',
  },
  {
    id: 'receiptScanning',
    name: 'Receipt Scanning',
    description: 'Scan receipts to track prices',
    freeLimit: '3 per month',
    paidBenefit: 'Unlimited scans',
  },
  {
    id: 'priceHistory',
    name: 'Price History',
    description: 'View price trends over time',
    freeLimit: 'Not available',
    paidBenefit: 'Full history',
  },
  {
    id: 'insights',
    name: 'Insights & Reports',
    description: 'Spending analytics and reports',
    freeLimit: 'Basic only',
    paidBenefit: 'Full analytics',
  },
  {
    id: 'exportData',
    name: 'Export Data',
    description: 'Export your data to CSV',
    freeLimit: 'Not available',
    paidBenefit: 'Full export',
  },
];

/**
 * User's subscription status
 */
export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  trialStartDate: string | null; // ISO date string
  trialEndDate: string | null; // ISO date string
  subscriptionStartDate: string | null; // ISO date string
  subscriptionEndDate: string | null; // ISO date string (for renewal/expiry)
  isActive: boolean;
}

/**
 * Check if a plan is a paid plan
 */
export function isPaidPlan(plan: SubscriptionPlan): boolean {
  return plan === SubscriptionPlan.MONTHLY || plan === SubscriptionPlan.ANNUAL;
}

/**
 * Check if a plan has premium features
 */
export function hasPremiumFeatures(plan: SubscriptionPlan): boolean {
  return plan === SubscriptionPlan.TRIAL || isPaidPlan(plan);
}

/**
 * Get features for a plan
 */
export function getPlanFeatures(plan: SubscriptionPlan): PlanFeatures {
  return PLAN_FEATURES[plan];
}

/**
 * Check if a specific feature is available for a plan
 */
export function isFeatureAvailable(
  plan: SubscriptionPlan,
  featureId: keyof PlanFeatures
): boolean {
  const features = getPlanFeatures(plan);
  const value = features[featureId];

  if (typeof value === 'boolean') {
    return value;
  }

  // For numeric limits, null means unlimited (available)
  return value === null || value > 0;
}
