import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get the currently authenticated user from Clerk identity.
 * Returns null if not authenticated or user not found in DB.
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/**
 * Require an authenticated user.
 * Throws "Not authenticated" if no session or user document exists.
 * Throws "Account suspended" if the user is suspended.
 */
export async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  if (user.suspended) {
    throw new Error("Account suspended");
  }
  return user;
}

/**
 * Require that the current user owns a specific resource.
 * Throws if not authenticated or if IDs don't match.
 */
export async function requireOwnership(
  ctx: QueryCtx | MutationCtx,
  resourceUserId: Id<"users">
) {
  const user = await requireCurrentUser(ctx);
  if (user._id !== resourceUserId) {
    throw new Error("Not authorized");
  }
  return user;
}

/**
 * Require MFA for sensitive operations.
 * Calls requireCurrentUser first, then checks mfaEnabled.
 * Throws if user has MFA enabled on their account but it's not verified
 * in the current session (Clerk enforces this at the session level).
 *
 * For users WITHOUT MFA enabled, this serves as a server-side gate:
 * sensitive mutations will reject until MFA is set up.
 *
 * Set env var CONVEX_SKIP_MFA="true" to bypass in local dev.
 */
export async function requireMfa(ctx: QueryCtx | MutationCtx) {
  const user = await requireCurrentUser(ctx);
  // Skip MFA enforcement only when explicitly opted in for local dev
  const skipMfa = process.env.CONVEX_SKIP_MFA === "true";
  if (!skipMfa && !user.mfaEnabled) {
    throw new Error(
      "MFA required. Enable two-factor authentication in your profile settings before performing this action."
    );
  }
  return user;
}

/**
 * Require that the current user has admin privileges.
 * Checks isAdmin flag OR RBAC role assignment, and respects suspension.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireCurrentUser(ctx);

  // Super admin via isAdmin flag
  if (user.isAdmin) {
    return user;
  }

  // Check RBAC role assignment
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();

  if (userRole) {
    return user;
  }

  throw new Error("Admin privileges required");
}
