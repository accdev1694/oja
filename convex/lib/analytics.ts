import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { Id } from "../_generated/dataModel";

/**
 * Tracks a funnel event for analytics
 * @param ctx Convex context
 * @param userId User ID
 * @param eventName Name of the event (signup, onboarding_complete, first_list, etc.)
 * @param eventData Optional metadata
 */
export async function trackFunnelEvent(
  ctx: GenericMutationCtx<any>,
  userId: Id<"users">,
  eventName: string,
  eventData?: any
) {
  const now = Date.now();
  
  // Check if this event already exists for this user (for unique events)
  const uniqueEvents = ["signup", "onboarding_complete", "first_list", "first_receipt", "first_scan", "subscribed"];
  
  if (uniqueEvents.includes(eventName)) {
    const existing = await ctx.db
      .query("funnelEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("eventName"), eventName))
      .first();
      
    if (existing) {
      return; // Only track once
    }
  }
  
  await ctx.db.insert("funnelEvents", {
    userId,
    eventName,
    eventData,
    createdAt: now,
  });
  
  console.log(`[Analytics] Tracked funnel event: ${eventName} for user ${userId}`);
}
