/**
 * Admin subscription-modification mutations.
 *
 * Extracted from userMgmt.ts to keep that file under the 400-line limit and
 * to group the four subscription-touching operations (trial extension, bulk
 * trial extension, forced downgrade, complimentary grant) in one place so
 * their guards and audit-log conventions stay aligned.
 *
 * Every mutation here:
 *  - Uses `requirePermission` (admin gate)
 *  - Skips admin users (admins bypass subscription gating entirely)
 *  - Writes an `adminLogs` entry for the audit trail
 */
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requirePermission } from "./helpers";

export const extendTrial = mutation({
  args: { userId: v.id("users"), days: v.number() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");
    const now = Date.now();

    if (!Number.isInteger(args.days) || args.days <= 0) {
      throw new Error("days must be a positive integer");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Admins bypass subscription gating entirely — trial operations are meaningless
    // against a staff account and would clutter the subscriptions table.
    if (user.isAdmin === true) {
      throw new Error("Cannot extend trial for an admin account.");
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    // Guard: never turn an active paying premium subscriber into a trial user.
    // Use downgradeSubscription first if an admin needs to revert an active sub.
    if (subscription && subscription.status === "active") {
      throw new Error(
        "Cannot start a trial for an active premium subscriber. Downgrade first if needed."
      );
    }

    const durationMs = args.days * 24 * 60 * 60 * 1000;

    if (!subscription) {
      // Create a fresh trial subscription if none exists
      const trialEnd = now + durationMs;
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        plan: "free",
        status: "trial",
        trialEndsAt: trialEnd,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("adminLogs", {
        adminUserId: admin._id,
        action: "extend_trial",
        targetType: "user",
        targetId: args.userId,
        details: `Created trial subscription with ${args.days} days`,
        createdAt: now,
      });
      return { success: true };
    }

    // Extend from the later of (existing trialEnd, now) so an expired trial
    // gets a fresh window instead of accumulating past-dated time.
    const baseEnd = Math.max(subscription.trialEndsAt ?? 0, now);
    const newTrialEnd = baseEnd + durationMs;

    await ctx.db.patch(subscription._id, {
      status: "trial",
      trialEndsAt: newTrialEnd,
      updatedAt: now,
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "extend_trial",
      targetType: "user",
      targetId: args.userId,
      details: `Extended trial by ${args.days} days`,
      createdAt: now,
    });
    return { success: true };
  },
});

/**
 * Admin force-downgrade: ends the subscription and returns the user to free.
 * Used for refunds, abuse resolution, or correcting mis-granted access.
 * Status is set to "expired" (admin action) to distinguish from user-initiated "cancelled".
 *
 * IMPORTANT: This does NOT cancel the Stripe subscription. The stripeSubscriptionId
 * is cleared from the local record so future webhooks don't overwrite the downgrade,
 * but the Stripe subscription itself must be cancelled separately in the Stripe
 * dashboard if the user should stop being billed. The cleared stripeSubscriptionId
 * is recorded in the audit log for reference.
 *
 * No-ops gracefully if the user has no subscription or is already downgraded.
 */
export const downgradeSubscription = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");
    const now = Date.now();

    // Admins bypass subscription gating entirely — downgrading one would
    // write a misleading "expired" row and strip their Stripe links.
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (user.isAdmin === true) {
      throw new Error("Cannot downgrade an admin account.");
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    // No-op only if the sub is already in a terminal ended state.
    // Trial users (plan=free, status=trial) must still be downgradable —
    // an admin may need to revoke an active trial.
    if (
      !subscription ||
      (subscription.plan === "free" &&
        (subscription.status === "expired" || subscription.status === "cancelled"))
    ) {
      return { success: true, alreadyDowngraded: true };
    }

    const priorStripeSubId = subscription.stripeSubscriptionId;
    const priorStripeCustomerId = subscription.stripeCustomerId;

    await ctx.db.patch(subscription._id, {
      plan: "free",
      status: "expired",
      currentPeriodEnd: now,
      // Clear BOTH Stripe links so handleSubscriptionUpdated (which looks up
      // by stripeCustomerId) can't reverse this admin action. If the user
      // pays again later, checkout will create a fresh record.
      stripeSubscriptionId: undefined,
      stripeCustomerId: undefined,
      updatedAt: now,
    });

    const stripeDetails = priorStripeSubId
      ? ` Cleared Stripe sub link (${priorStripeSubId}, customer ${priorStripeCustomerId ?? "unknown"}) — cancel in Stripe dashboard if needed.`
      : "";

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "downgrade_subscription",
      targetType: "user",
      targetId: args.userId,
      details: `Downgraded subscription to free.${stripeDetails}`,
      createdAt: now,
    });
    return {
      success: true,
      priorStripeSubscriptionId: priorStripeSubId,
      stripeCancelRequired: !!priorStripeSubId,
    };
  },
});

export const grantComplimentaryAccess = mutation({
  args: { userId: v.id("users"), months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");
    const now = Date.now();
    const months = args.months ?? 12;

    if (!Number.isInteger(months) || months <= 0) {
      throw new Error("months must be a positive integer");
    }

    // Admins bypass subscription gating entirely — a complimentary grant is
    // meaningless against a staff account and would pollute the subs table.
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (user.isAdmin === true) {
      throw new Error("Cannot grant premium to an admin account.");
    }

    const duration = months * 30 * 24 * 60 * 60 * 1000;

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    // If already active with time remaining, extend from the current period end.
    // Otherwise start a fresh period from now. Preserves purchased time on an
    // "extend +12mo" action.
    const baseStart =
      subscription?.status === "active" &&
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd > now
        ? subscription.currentPeriodEnd
        : now;
    const newPeriodEnd = baseStart + duration;
    const isExtension = baseStart !== now;

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        plan: "premium_annual",
        status: "active",
        currentPeriodStart: isExtension ? (subscription.currentPeriodStart ?? now) : now,
        currentPeriodEnd: newPeriodEnd,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        plan: "premium_annual",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: newPeriodEnd,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "grant_complimentary",
      targetType: "user",
      targetId: args.userId,
      details: isExtension
        ? `Extended premium by ${months} months (from existing period end)`
        : `Granted free premium for ${months} months`,
      createdAt: now,
    });
    return { success: true, extended: isExtension };
  },
});

export const bulkExtendTrial = mutation({
  args: { userIds: v.array(v.id("users")), days: v.number() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "bulk_operation");
    const now = Date.now();

    if (!Number.isInteger(args.days) || args.days <= 0) {
      throw new Error("days must be a positive integer");
    }

    const duration = args.days * 24 * 60 * 60 * 1000;

    let count = 0;
    let skipped = 0;
    for (const userId of args.userIds) {
      // Skip admin accounts and users that no longer exist — admins bypass
      // subscription gating, and inserting a trial for a deleted userId would
      // orphan the subscription row.
      const targetUser = await ctx.db.get(userId);
      if (!targetUser || targetUser.isAdmin === true) {
        skipped++;
        continue;
      }

      const sub = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .first();

      if (!sub) {
        // Create a fresh trial for users with no subscription record
        await ctx.db.insert("subscriptions", {
          userId,
          plan: "free",
          status: "trial",
          trialEndsAt: now + duration,
          createdAt: now,
          updatedAt: now,
        });
        count++;
        continue;
      }

      // Skip active paying subscribers — never downgrade them implicitly
      if (sub.status === "active") {
        skipped++;
        continue;
      }

      // Extend from the later of (existing trialEnd, now) and reset status to trial
      const baseEnd = Math.max(sub.trialEndsAt ?? 0, now);
      await ctx.db.patch(sub._id, {
        status: "trial",
        trialEndsAt: baseEnd + duration,
        updatedAt: now,
      });
      count++;
    }

    // Include the full target ID list in details so a single bulk op is
    // traceable back to specific users from the audit log alone.
    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "bulk_extend_trial",
      targetType: "user",
      details: `Bulk extended trial by ${args.days} days for ${count} users (skipped ${skipped} admin/active/deleted accounts). Target IDs: [${args.userIds.join(", ")}]`,
      createdAt: now,
    });

    return { success: true, count, skipped };
  },
});
