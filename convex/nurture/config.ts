// =============================================================================
// NURTURE SEQUENCE CONFIGURATION
// =============================================================================

/**
 * Nurture messages for new users during their first week.
 * Each message has conditions based on user state and days since signup.
 */
export const NURTURE_SEQUENCE = {
  // Day 1: Welcome & First Steps
  day_1_welcome: {
    daysSinceSignup: 0,
    title: "Welcome to Oja! 🛒",
    body: "Your AI shopping assistant is ready. Start by checking your pantry or creating your first list.",
    condition: "onboarding_complete",
    screen: "index",
    priority: 1,
  },

  // Day 2: Encourage First List
  day_2_first_list: {
    daysSinceSignup: 1,
    title: "Ready to shop smarter?",
    body: "Create your first shopping list and let Oja estimate your budget before you even leave home.",
    condition: "no_lists",
    screen: "lists",
    priority: 2,
  },

  // Day 2 (alternative): Encourage Receipt Scan
  day_2_scan_receipt: {
    daysSinceSignup: 1,
    title: "Got a receipt? 📱",
    body: "Scan it to track prices and earn scan credits. The more you scan, the smarter Oja gets!",
    condition: "no_receipts",
    screen: "scan",
    priority: 3,
  },

  // Day 3: Highlight Voice Assistant
  day_3_voice: {
    daysSinceSignup: 2,
    title: "Try asking Tobi 🎤",
    body: "\"What am I running low on?\" — Tap the mic and ask Tobi anything about your pantry or lists.",
    condition: "no_voice_usage",
    screen: "index",
    priority: 4,
  },

  // Day 4: Partner Mode
  day_4_partner: {
    daysSinceSignup: 3,
    title: "Shopping with someone?",
    body: "Invite a partner to share lists, approve items, and shop together in real-time.",
    condition: "no_partners",
    screen: "partners",
    priority: 5,
  },

  // Day 5: Weekly Insights Preview
  day_5_insights: {
    daysSinceSignup: 4,
    title: "Your first insights are ready 📊",
    body: "See how you're spending and discover ways to save. Check your weekly digest!",
    condition: "has_activity",
    screen: "insights",
    priority: 6,
  },

  // Trial Ending: 3 Days Left
  trial_ending_3d: {
    daysSinceSignup: -1, // Special: based on trialEndsAt
    daysUntilTrialEnd: 3,
    title: "3 days left of Premium",
    body: "Your trial ends soon. Keep all features — subscribe now and never miss a deal.",
    condition: "trial_active",
    screen: "subscription",
    priority: 10,
  },

  // Trial Ending: 1 Day Left
  trial_ending_1d: {
    daysSinceSignup: -1,
    daysUntilTrialEnd: 1,
    title: "Last day of Premium!",
    body: "Don't lose your price tracking and AI features. Subscribe to keep going.",
    condition: "trial_active",
    screen: "subscription",
    priority: 11,
  },

  // Trial Expired
  trial_expired: {
    daysSinceSignup: -1,
    daysUntilTrialEnd: 0,
    title: "Your trial has ended",
    body: "Thanks for trying Oja Premium! Upgrade anytime to unlock all features again.",
    condition: "trial_expired",
    screen: "subscription",
    priority: 12,
  },

  // Re-engagement: Inactive 7 Days
  inactive_7d: {
    daysSinceSignup: -1,
    daysInactive: 7,
    title: "We miss you! 👋",
    body: "Your pantry might need updating. Tap to see what's running low.",
    condition: "inactive",
    screen: "index",
    priority: 20,
  },
} as const;

type NurtureKey = keyof typeof NURTURE_SEQUENCE;

// =============================================================================
// HELPER: Calculate days since signup
// =============================================================================

export function getDaysSinceSignup(createdAt: number): number {
  const now = Date.now();
  const diffMs = now - createdAt;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function getDaysUntilTrialEnd(trialEndsAt: number | undefined): number | null {
  if (!trialEndsAt) return null;
  const now = Date.now();
  const diffMs = trialEndsAt - now;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

export function getDaysInactive(lastActiveAt: number | undefined): number {
  if (!lastActiveAt) return 999; // Never active = very inactive
  const now = Date.now();
  const diffMs = now - lastActiveAt;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

// =============================================================================
// HELPER: Format dynamic trial message
// =============================================================================

export function formatTrialMessage(trialEndsAt: number | undefined): string {
  const daysLeft = getDaysUntilTrialEnd(trialEndsAt);
  if (daysLeft === null) return "Enjoy your premium features!";
  if (daysLeft <= 0) return "Your trial has ended.";
  if (daysLeft === 1) return "You have 1 day of premium access remaining.";
  return `You have ${daysLeft} days of premium access remaining.`;
}
