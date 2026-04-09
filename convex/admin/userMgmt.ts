import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  requirePermission,
  requirePermissionQuery,
} from "./helpers";
import { getSubscriptionDisplay } from "../lib/subscriptionDisplay";

type UserDoc = Doc<"users">;

/** Attach the computed subscriptionDisplay to a list of users. */
async function attachSubscriptionDisplay(
  ctx: QueryCtx,
  users: UserDoc[]
): Promise<(UserDoc & { subscriptionDisplay: ReturnType<typeof getSubscriptionDisplay> })[]> {
  return Promise.all(
    users.map(async (u) => {
      const sub = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .order("desc")
        .first();
      return { ...u, subscriptionDisplay: getSubscriptionDisplay(sub) };
    })
  );
}

export const getUsers = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_users");
    const page = await ctx.db.query("users").withIndex("by_created").order("desc").paginate(args.paginationOpts);
    const enriched = await attachSubscriptionDisplay(ctx, page.page);
    return { ...page, page: enriched };
  },
});

export const searchUsers = query({
  args: { searchTerm: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_users");
    const term = args.searchTerm;
    if (term.length < 2) return [];

    const byName = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", term))
      .take(args.limit || 50);

    const byEmail = await ctx.db
      .query("users")
      .withSearchIndex("search_email", (q) => q.search("email", term))
      .take(args.limit || 50);

    const results = [...byName];
    const userIds = new Set<Id<"users">>(results.map(u => u._id));

    for (const user of byEmail) {
      if (!userIds.has(user._id)) {
        results.push(user);
        userIds.add(user._id);
      }
    }

    // Cap enrichment fan-out at 20 for search to bound N+1 subscription lookups
    // (pagination already limits to 50 per page in getUsers)
    const limited = results.slice(0, Math.min(args.limit || 50, 20));
    return attachSubscriptionDisplay(ctx, limited);
  },
});

export const toggleAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");
    
    if (args.userId === admin._id) {
      throw new Error("Security Violation: Cannot toggle your own admin status");
    }

    const isSuperAdmin = admin.isAdmin === true;
    let hasSuperRole = false;
    
    if (!isSuperAdmin) {
      const userRole = await ctx.db.query("userRoles").withIndex("by_user", q => q.eq("userId", admin._id)).first();
      if (userRole) {
        const role = await ctx.db.get(userRole.roleId);
        if (role && role.name === "super_admin") {
          hasSuperRole = true;
        }
      }
    }

    if (!isSuperAdmin && !hasSuperRole) {
      throw new Error("Security Violation: Only super_admins can toggle admin status for other users");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const newStatus = !user.isAdmin;

    const patchData: { isAdmin: boolean; updatedAt: number; adminGrantedAt?: number } = { isAdmin: newStatus, updatedAt: Date.now() };
    if (newStatus) {
      patchData.adminGrantedAt = Date.now();
    }

    await ctx.db.patch(args.userId, patchData);
    
    if (newStatus) {
      const exists = await ctx.db.query("userRoles").withIndex("by_user", q => q.eq("userId", args.userId)).first();
      if (!exists) {
        const role = await ctx.db.query("adminRoles").withIndex("by_name", q => q.eq("name", "super_admin")).first();
        if (role) await ctx.db.insert("userRoles", { userId: args.userId, roleId: role._id, grantedBy: admin._id, grantedAt: Date.now() });
      }
    } else {
      const role = await ctx.db.query("userRoles").withIndex("by_user", q => q.eq("userId", args.userId)).first();
      if (role) await ctx.db.delete(role._id);
    }

    await ctx.db.insert("adminLogs", { adminUserId: admin._id, action: newStatus ? "grant_admin" : "revoke_admin", targetType: "user", targetId: args.userId, details: "Toggled admin status", createdAt: Date.now() });
    return { success: true, isAdmin: newStatus };
  },
});

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

export const toggleSuspension = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const isSuspended = !!user.suspended;
    await ctx.db.patch(args.userId, { suspended: !isSuspended, updatedAt: Date.now() });
    
    await ctx.db.insert("adminLogs", { 
      adminUserId: admin._id, 
      action: isSuspended ? "unsuspend_user" : "suspend_user", 
      targetType: "user", 
      targetId: args.userId, 
      createdAt: Date.now() 
    });
    return { success: true, suspended: !isSuspended };
  },
});

export const getUserDetail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_users");
    const u = await ctx.db.get(args.userId);
    if (!u) return null;

    const [r, l] = await Promise.all([
      ctx.db.query("receipts").withIndex("by_user", q => q.eq("userId", u._id)).collect(),
      ctx.db.query("shoppingLists").withIndex("by_user", q => q.eq("userId", u._id)).collect()
    ]);

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", u._id))
      .order("desc")
      .first();

    const pointsBalance = await ctx.db
      .query("pointsBalance")
      .withIndex("by_user", q => q.eq("userId", u._id))
      .first();

    return {
      ...u,
      receiptCount: r.length,
      listCount: l.length,
      totalSpent: Math.round(r.reduce((s, x) => s + (x.total || 0), 0) * 100) / 100,
      scanRewards: {
        lifetimeScans: pointsBalance?.tierProgress ?? r.length,
        points: pointsBalance?.availablePoints ?? 0,
        tier: pointsBalance?.tier ?? "bronze"
      },
      subscription: subscription ?? null,
      subscriptionDisplay: getSubscriptionDisplay(subscription),
    };
  },
});

export const getUserTimeline = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_users");
    
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);
      
    return events;
  },
});

export const getUserTags = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_users");
    const tags = await ctx.db
      .query("userTags")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return tags.map(t => t.tag);
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

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "bulk_extend_trial",
      targetType: "user",
      details: `Bulk extended trial by ${args.days} days for ${count} users (skipped ${skipped} active subscribers)`,
      createdAt: now,
    });

    return { success: true, count, skipped };
  },
});

export const adjustPoints = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");
    
    // H6 fix: Include full admin audit trail in metadata for both positive and negative adjustments
    if (args.amount > 0) {
      await ctx.runMutation(internal.points.awardBonusPoints, {
        userId: args.userId,
        amount: args.amount,
        source: `admin_adjustment: ${args.reason}`,
        metadata: { adminId: admin._id, reason: args.reason, adjustedBy: admin.name || "Admin" },
      });
    } else if (args.amount < 0) {
      // Use expirePoints for negative — admin trail is preserved in adminLogs entry below
      await ctx.runMutation(internal.points.expirePoints, {
        userId: args.userId,
        points: Math.abs(args.amount),
        reason: `admin_adjustment_by_${admin._id}: ${args.reason}`,
      });
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "adjust_points",
      targetType: "user",
      targetId: args.userId,
      details: `Adjusted points by ${args.amount}. Reason: ${args.reason}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
