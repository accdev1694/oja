/**
 * One-time migration to grant admin access to the app creator.
 *
 * Run from Convex Dashboard → Functions → grantAdminAccess:grantAdmin
 *
 * This bootstraps the first admin user who can then grant admin to others
 * via the admin dashboard.
 */
import { internalMutation } from "../_generated/server";

/**
 * Grant admin access to ollyventstores25@gmail.com
 */
export const grantAdmin = internalMutation({
  args: {},
  handler: async (ctx) => {
    const targetEmail = "ollyventstores25@gmail.com";

    // Find user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), targetEmail))
      .first();

    if (!user) {
      throw new Error(`User with email ${targetEmail} not found. Please sign in to the app first to create your account.`);
    }

    // Check if already admin
    if (user.isAdmin === true) {
      console.log(`[grantAdminAccess] User ${targetEmail} is already an admin`);
      return {
        success: true,
        message: "User is already an admin",
        email: targetEmail,
        userId: user._id
      };
    }

    // Grant admin access
    await ctx.db.patch(user._id, {
      isAdmin: true,
      updatedAt: Date.now(),
    });

    console.log(`[grantAdminAccess] Granted admin access to ${targetEmail}`);
    return {
      success: true,
      message: "Admin access granted successfully",
      email: targetEmail,
      userId: user._id
    };
  },
});
