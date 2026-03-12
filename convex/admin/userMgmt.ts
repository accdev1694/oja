import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { 
  requirePermission, 
  requirePermissionQuery,
} from "./helpers";

export const getUsers = query({
  args: { paginationOpts: v.any() },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_users");
    return await ctx.db.query("users").order("desc").paginate(args.paginationOpts);
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
      .withSearchIndex("search_name", (q: any) => q.search("name", term))
      .take(args.limit || 50);

    const byEmail = await ctx.db
      .query("users")
      .withSearchIndex("search_email", (q: any) => q.search("email", term))
      .take(args.limit || 50);

    const results = [...byName];
    const userIds = new Set(results.map((u: any) => u._id));
    
    for (const user of byEmail) {
      if (!userIds.has(user._id)) {
        results.push(user);
        userIds.add(user._id);
      }
    }

    return results.slice(0, args.limit || 50);
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

    const patchData: any = { isAdmin: newStatus, updatedAt: Date.now() };
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
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      throw new Error("No subscription found for user");
    }

    const newTrialEnd = (subscription.trialEndsAt || now) + (args.days * 24 * 60 * 60 * 1000);
    await ctx.db.patch(subscription._id, {
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

export const grantComplimentaryAccess = mutation({
  args: { userId: v.id("users"), months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");
    const now = Date.now();
    const months = args.months ?? 12;
    const duration = months * 30 * 24 * 60 * 60 * 1000;

    let subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        plan: "premium_annual",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: now + duration,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        plan: "premium_annual",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: now + duration,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "grant_complimentary",
      targetType: "user",
      targetId: args.userId,
      details: `Granted free premium for ${months} months`,
      createdAt: now,
    });
    return { success: true };
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
      subscription: subscription || { plan: "free", status: "active" } 
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
    const duration = args.days * 24 * 60 * 60 * 1000;
    
    let count = 0;
    for (const userId of args.userIds) {
      const sub = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
        
      if (sub) {
        const currentEnd = sub.trialEndsAt || sub.currentPeriodEnd || now;
        await ctx.db.patch(sub._id, {
          trialEndsAt: currentEnd + duration,
          currentPeriodEnd: currentEnd + duration,
          updatedAt: now,
        });
        count++;
      }
    }
    
    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "bulk_extend_trial",
      targetType: "user",
      details: `Bulk extended trial by ${args.days} days for ${count} users`,
      createdAt: now,
    });
    
    return { success: true, count };
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
    
    if (args.amount > 0) {
      // @ts-ignore
      await ctx.runMutation(internal.points.awardBonusPoints, {
        userId: args.userId,
        amount: args.amount,
        source: `admin_adjustment: ${args.reason}`,
        metadata: { adminId: admin._id }
      });
    } else if (args.amount < 0) {
      // @ts-ignore
      await ctx.runMutation(internal.points.expirePoints, {
        userId: args.userId,
        points: Math.abs(args.amount),
        reason: `admin_adjustment: ${args.reason}`
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
