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
 */
export async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
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
 * Require that the current user has admin privileges.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireCurrentUser(ctx);
  if (!user.isAdmin) {
    throw new Error("Admin privileges required");
  }
  return user;
}
