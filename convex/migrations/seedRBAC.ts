import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Seed basic RBAC roles and permissions
 * Run this once via Convex Dashboard
 */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Define all permissions
    const PERMISSIONS = [
      "view_analytics",
      "view_users",
      "edit_users",
      "view_receipts",
      "delete_receipts",
      "manage_catalog",
      "manage_flags",
      "manage_announcements",
      "manage_pricing",
      "view_audit_logs",
    ];

    // Define roles
    const ROLES = [
      {
        name: "super_admin",
        displayName: "Super Administrator",
        description: "Full access to all admin features and data management.",
        permissions: PERMISSIONS, // All permissions
      },
      {
        name: "support",
        displayName: "Customer Support",
        description: "Can view users and receipts, manage catalog and announcements.",
        permissions: ["view_users", "view_receipts", "manage_catalog", "manage_announcements"],
      },
      {
        name: "analyst",
        displayName: "Data Analyst",
        description: "Can view analytics, users, receipts, and audit logs.",
        permissions: ["view_analytics", "view_users", "view_receipts", "view_audit_logs"],
      },
      {
        name: "developer",
        displayName: "Developer",
        description: "Access to analytics, feature flags, and audit logs for debugging.",
        permissions: ["view_analytics", "manage_flags", "view_audit_logs"],
      },
    ];

    let rolesCreated = 0;
    let permissionsCreated = 0;

    const now = Date.now();

    for (const roleData of ROLES) {
      // Check if role exists
      const existingRole = await ctx.db
        .query("adminRoles")
        .withIndex("by_name", (q) => q.eq("name", roleData.name))
        .unique();

      let roleId;
      if (!existingRole) {
        roleId = await ctx.db.insert("adminRoles", {
          name: roleData.name,
          displayName: roleData.displayName,
          description: roleData.description,
          createdAt: now,
        });
        rolesCreated++;
      } else {
        roleId = existingRole._id;
      }

      // Add permissions to role
      for (const perm of roleData.permissions) {
        const existingPerm = await ctx.db
          .query("rolePermissions")
          .withIndex("by_role", (q) => q.eq("roleId", roleId))
          .filter((q) => q.eq(q.field("permission"), perm))
          .unique();

        if (!existingPerm) {
          await ctx.db.insert("rolePermissions", {
            roleId,
            permission: perm,
            createdAt: now,
          });
          permissionsCreated++;
        }
      }
    }

    return { rolesCreated, permissionsCreated };
  },
});
