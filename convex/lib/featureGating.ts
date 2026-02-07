/**
 * Feature gating helpers for subscription enforcement.
 * Used by mutations to check if a user can perform premium actions.
 */

// AI feature limits by plan (monthly)
export const AI_LIMITS = {
  voice: {
    free: 20,
    premium_monthly: 200,
    premium_annual: 200,
  },
  // Receipts: free users get 3/mo, paid users unlimited (they earn sub discount)
  receipt: {
    free: 3,
    premium_monthly: -1, // unlimited
    premium_annual: -1, // unlimited
  },
} as const;

function getFreeFeatures() {
  return {
    maxLists: 3,
    maxPantryItems: 50,
    maxReceiptScans: AI_LIMITS.receipt.free,
    maxVoiceRequests: AI_LIMITS.voice.free,
    receiptScanning: true,
    priceHistory: true,
    partnerMode: true,
    insights: true,
    exportData: true,
  };
}

function getPlanFeatures(plan: string) {
  if (plan === "free") return getFreeFeatures();
  const voiceLimit = AI_LIMITS.voice[plan as keyof typeof AI_LIMITS.voice] ?? 200;
  return {
    maxLists: -1,
    maxPantryItems: -1,
    maxReceiptScans: -1, // unlimited for paid
    maxVoiceRequests: voiceLimit,
    receiptScanning: true,
    priceHistory: true,
    partnerMode: true,
    insights: true,
    exportData: true,
  };
}

/** Read-time guard: treat expired trials as expired even if the cron hasn't run yet. */
function isEffectivelyPremium(sub: any): boolean {
  if (sub.status === "trial" && sub.trialEndsAt != null && sub.trialEndsAt <= Date.now()) {
    return false;
  }
  return sub.status === "active" || sub.status === "trial";
}

/**
 * Check feature access for a user.
 * Returns plan features and whether the user has premium.
 */
export async function checkFeatureAccess(ctx: any, userId: any) {
  const sub = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .order("desc")
    .first();

  const isPremium = sub ? isEffectivelyPremium(sub) : false;

  const plan = sub?.plan ?? "free";
  const features = isPremium ? getPlanFeatures(plan) : getFreeFeatures();

  return { isPremium, plan, features };
}

/**
 * Check if user can create a new shopping list.
 * Free tier: max 3 active lists.
 */
export async function canCreateList(ctx: any, userId: any): Promise<{ allowed: boolean; reason?: string; currentCount?: number; maxCount?: number }> {
  const { isPremium, features } = await checkFeatureAccess(ctx, userId);
  if (isPremium || features.maxLists === -1) {
    return { allowed: true };
  }

  const activeLists = await ctx.db
    .query("shoppingLists")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  const activeCount = activeLists.filter(
    (l: any) => l.status === "active" || l.status === "shopping"
  ).length;

  if (activeCount >= features.maxLists) {
    return {
      allowed: false,
      reason: `Free plan allows ${features.maxLists} active lists. Upgrade to Premium for unlimited lists.`,
      currentCount: activeCount,
      maxCount: features.maxLists,
    };
  }

  return { allowed: true, currentCount: activeCount, maxCount: features.maxLists };
}

/**
 * Check if user can add a new pantry item.
 * Free tier: max 50 items.
 */
export async function canAddPantryItem(ctx: any, userId: any): Promise<{ allowed: boolean; reason?: string; currentCount?: number; maxCount?: number }> {
  const { isPremium, features } = await checkFeatureAccess(ctx, userId);
  if (isPremium || features.maxPantryItems === -1) {
    return { allowed: true };
  }

  const items = await ctx.db
    .query("pantryItems")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  if (items.length >= features.maxPantryItems) {
    return {
      allowed: false,
      reason: `Free plan allows ${features.maxPantryItems} pantry items. Upgrade to Premium for unlimited items.`,
      currentCount: items.length,
      maxCount: features.maxPantryItems,
    };
  }

  return { allowed: true, currentCount: items.length, maxCount: features.maxPantryItems };
}

/**
 * Check if user has premium access for a specific feature.
 */
export async function requireFeature(ctx: any, userId: any, feature: string): Promise<{ allowed: boolean; reason?: string }> {
  const { features } = await checkFeatureAccess(ctx, userId);
  const hasAccess = (features as any)[feature];

  if (!hasAccess) {
    return {
      allowed: false,
      reason: `${feature} requires a Premium subscription. Upgrade to unlock this feature.`,
    };
  }

  return { allowed: true };
}

/**
 * Get AI feature limit for a user's plan.
 */
export function getAILimit(plan: string, feature: keyof typeof AI_LIMITS): number {
  const limits = AI_LIMITS[feature];
  const planKey = plan as keyof typeof limits;
  return limits[planKey] ?? limits.free;
}
