/**
 * Feature gating helpers for subscription enforcement.
 * Used by mutations to check if a user can perform premium actions.
 */

function getFreeFeatures() {
  return {
    maxLists: 10,
    maxPantryItems: 50,
    receiptScanning: true,
    priceHistory: false,
    partnerMode: false,
    insights: false,
    exportData: false,
  };
}

function getPlanFeatures(plan: string) {
  if (plan === "free") return getFreeFeatures();
  return {
    maxLists: -1,
    maxPantryItems: -1,
    receiptScanning: true,
    priceHistory: true,
    partnerMode: true,
    insights: true,
    exportData: true,
  };
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

  const isPremium = sub
    ? sub.status === "active" || sub.status === "trial"
    : false;

  const plan = sub?.plan ?? "free";
  const features = getPlanFeatures(plan);

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
