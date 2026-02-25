import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Find all users with isAdmin: true and assign them the super_admin role
 */
export const migrate = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Get the super_admin role ID
    const superAdminRole = await ctx.db
      .query("adminRoles")
      .withIndex("by_name", (q) => q.eq("name", "super_admin"))
      .unique();

    if (!superAdminRole) {
      throw new Error("Super admin role not found. Run seedRBAC:seed first.");
    }

    // 2. Find all existing admins
    const admins = await ctx.db
      .query("users")
      .withIndex("by_is_admin", (q) => q.eq("isAdmin", true))
      .collect();

    let migratedCount = 0;
    const now = Date.now();

    for (const admin of admins) {
      // Check if they already have a role assigned
      const existingUserRole = await ctx.db
        .query("userRoles")
        .withIndex("by_user", (q) => q.eq("userId", admin._id))
        .unique();

      if (!existingUserRole) {
        await ctx.db.insert("userRoles", {
          userId: admin._id,
          roleId: superAdminRole._id,
          grantedAt: now,
        });
        migratedCount++;
      }
    }

    return { migratedCount, totalAdmins: admins.length };
  },
});
