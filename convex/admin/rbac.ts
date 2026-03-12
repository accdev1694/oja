import { query } from "../_generated/server";
import { getCurrentUser } from "./helpers";

export const getMyPermissions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return null;
    }

    if (user.isAdmin) {
      return {
        role: "super_admin",
        displayName: "Super Administrator",
        permissions: [
          "view_analytics", "view_users", "edit_users",
          "view_receipts", "delete_receipts", "manage_catalog",
          "manage_flags", "manage_announcements", "manage_pricing", "view_audit_logs"
        ],
      };
    }

    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();

    if (!userRole) {
      return null;
    }

    const role = await ctx.db.get(userRole.roleId);
    if (!role) {
      return null;
    }

    const rolePerms = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q: any) => q.eq("roleId", userRole.roleId))
      .collect();

    return {
      role: role.name,
      displayName: role.displayName,
      permissions: rolePerms.map((p: any) => p.permission),
    };
  },
});

export const getMfaGracePeriodStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return null;
    }

    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();

    if (!user.isAdmin && !userRole) {
      return null;
    }

    if (user.mfaEnabled) {
      return {
        mfaEnabled: true,
        inGracePeriod: false,
        daysRemaining: 0,
        gracePeriodExpired: false,
      };
    }

    const now = Date.now();
    const GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;
    const adminGrantedAt = user.adminGrantedAt || now;
    const timeSinceGrant = now - adminGrantedAt;
    const daysRemaining = Math.max(0, Math.ceil((GRACE_PERIOD_MS - timeSinceGrant) / (24 * 60 * 60 * 1000)));
    const gracePeriodExpired = timeSinceGrant > GRACE_PERIOD_MS;

    return {
      mfaEnabled: false,
      inGracePeriod: !gracePeriodExpired,
      daysRemaining,
      gracePeriodExpired,
    };
  },
});

export const getRoles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("adminRoles").collect();
  },
});
