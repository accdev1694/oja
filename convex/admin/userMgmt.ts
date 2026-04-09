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
      return {
        ...u,
        subscriptionDisplay: getSubscriptionDisplay(sub, Date.now(), {
          isAdmin: u.isAdmin === true,
        }),
      };
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

/**
 * Dedicated bulk query for CSV export — bypasses the 2-char minimum in
 * `searchUsers` and skips subscriptionDisplay enrichment (not needed for CSV).
 * Capped at 5000 rows to keep the action response bounded.
 */
export const listUsersForExport = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_users");
    const cap = Math.min(args.limit ?? 5000, 5000);
    return await ctx.db
      .query("users")
      .withIndex("by_created")
      .order("desc")
      .take(cap);
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

export const toggleSuspension = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");

    // Self-lockout guard: an admin suspending their own account would
    // immediately lose access to the dashboard with no way back in except
    // through the database. Block it at the server as a safety net.
    if (args.userId === admin._id) {
      throw new Error("Security Violation: Cannot suspend your own account");
    }

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
      subscriptionDisplay: getSubscriptionDisplay(subscription, Date.now(), {
        isAdmin: u.isAdmin === true,
      }),
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
