import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Check if a user has exceeded their rate limit for a specific feature.
 * Uses a simple 1-minute window.
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
  feature: string,
  limit: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / 60000) * 60000; // Start of current minute

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_feature", (q) =>
      q.eq("userId", userId).eq("feature", feature).eq("windowStart", windowStart)
    )
    .unique();

  if (existing) {
    if (existing.count >= limit) {
      return { allowed: false, remaining: 0 };
    }
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
    });
    return { allowed: true, remaining: limit - (existing.count + 1) };
  } else {
    await ctx.db.insert("rateLimits", {
      userId,
      feature,
      windowStart,
      count: 1,
    });
    return { allowed: true, remaining: limit - 1 };
  }
}
