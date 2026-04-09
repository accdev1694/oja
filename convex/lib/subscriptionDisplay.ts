import type { Doc } from "../_generated/dataModel";

export type BadgeVariant =
  | "free"
  | "trial"
  | "trial_expiring"
  | "premium_monthly"
  | "premium_annual"
  | "expired"
  | "cancelled";

export type EffectiveStatus = "free" | "trial" | "active" | "expired" | "cancelled";

/** Anchored to the schema's plan enum plus "none" for users with no subscription record. */
export type DisplayPlan = Doc<"subscriptions">["plan"] | "none";

export interface SubscriptionDisplay {
  variant: BadgeVariant;
  label: string;
  shortLabel: string;
  daysRemaining?: number;
  plan: DisplayPlan;
  effectiveStatus: EffectiveStatus;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TRIAL_EXPIRING_THRESHOLD_DAYS = 2;

function daysBetween(future: number, past: number): number {
  return Math.max(0, Math.ceil((future - past) / MS_PER_DAY));
}

/**
 * Compute the display state for a user's subscription.
 * Handles:
 *  - null subscription → "free"
 *  - Stale "trial" status where trialEndsAt is in the past (cron lag) → "expired"
 *  - Trials with ≤2 days remaining → "trial_expiring" variant
 *  - Active premium → shows days remaining in current billing period
 */
export function getSubscriptionDisplay(
  sub: Doc<"subscriptions"> | null,
  nowMs: number = Date.now()
): SubscriptionDisplay {
  if (!sub) {
    return {
      variant: "free",
      label: "Free",
      shortLabel: "Free",
      plan: "none",
      effectiveStatus: "free",
    };
  }

  // Stale trial that hasn't been flipped by cron yet
  // (inlined from isTrialExpired to respect the caller-supplied nowMs for deterministic tests)
  const trialIsStale =
    sub.status === "trial" && sub.trialEndsAt != null && sub.trialEndsAt <= nowMs;
  if (trialIsStale) {
    return {
      variant: "expired",
      label: "Trial expired",
      shortLabel: "Expired",
      plan: sub.plan,
      effectiveStatus: "expired",
    };
  }

  if (sub.status === "trial") {
    // daysRemaining is always ≥1 here: stale trials (trialEndsAt ≤ now) are
    // already caught above, and Math.ceil rounds any positive remainder up to 1.
    const daysRemaining = sub.trialEndsAt ? daysBetween(sub.trialEndsAt, nowMs) : 0;
    const expiringSoon = daysRemaining <= TRIAL_EXPIRING_THRESHOLD_DAYS;
    return {
      variant: expiringSoon ? "trial_expiring" : "trial",
      label: expiringSoon ? `Trial ${daysRemaining}d left` : `Trial (${daysRemaining}d left)`,
      shortLabel: `Trial ${daysRemaining}d`,
      daysRemaining,
      plan: sub.plan,
      effectiveStatus: "trial",
    };
  }

  if (sub.status === "active") {
    const daysRemaining = sub.currentPeriodEnd ? daysBetween(sub.currentPeriodEnd, nowMs) : undefined;
    const isAnnual = sub.plan === "premium_annual";
    return {
      variant: isAnnual ? "premium_annual" : "premium_monthly",
      label: isAnnual ? "Premium Annual" : "Premium Monthly",
      shortLabel: "Premium",
      daysRemaining,
      plan: sub.plan,
      effectiveStatus: "active",
    };
  }

  if (sub.status === "cancelled") {
    return {
      variant: "cancelled",
      label: "Cancelled",
      shortLabel: "Cancelled",
      plan: sub.plan,
      effectiveStatus: "cancelled",
    };
  }

  // "expired" or any other fallthrough
  return {
    variant: "expired",
    label: "Expired",
    shortLabel: "Expired",
    plan: sub.plan,
    effectiveStatus: "expired",
  };
}
