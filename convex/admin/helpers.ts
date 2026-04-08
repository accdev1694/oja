import { Doc, Id, DataModel } from "../_generated/dataModel";
import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { logToSIEM } from "../lib/siem";

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;

/**
 * Normalizes Clerk ID
 */
export function normalizeClerkId(clerkId: string): string {
  if (clerkId.includes("|")) {
    return clerkId.split("|").pop() || clerkId;
  }
  return clerkId;
}

/**
 * Gets the current authenticated user from the database
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  let user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    const normalizedId = normalizeClerkId(identity.subject);
    if (normalizedId !== identity.subject) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", normalizedId))
        .first();
    }
  }

  if (!user && identity.tokenIdentifier) {
    const tokenParts = identity.tokenIdentifier.split("|");
    const possibleId = tokenParts.pop();
    if (possibleId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", possibleId))
        .first();
    }
  }

  return user;
}

/**
 * Validates that the current user is an admin
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);

  if (!user) {
    if ("db" in ctx) {
      await logToSIEM(ctx as MutationCtx, {
        action: "admin_access_attempt",
        userId: "unauthenticated",
        status: "blocked",
        severity: "medium",
        details: "Unauthenticated access attempt to admin function"
      });
    }
    throw new Error("Not authenticated");
  }

  if (user.suspended) {
    if ("db" in ctx) {
      await logToSIEM(ctx as MutationCtx, {
        action: "admin_access_attempt",
        userId: user._id,
        status: "blocked",
        severity: "high",
        details: "Suspended user attempted admin access"
      });
    }
    throw new Error("Account suspended");
  }

  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();

  if (user.isAdmin || userRole) {
    // C1 fix: Enforce MFA grace period — block access after 14-day grace expires
    if (!user.mfaEnabled) {
      const GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;
      // Use userRole.grantedAt for RBAC admins who may not have adminGrantedAt
      const adminGrantedAt = user.adminGrantedAt || (userRole as { grantedAt?: number } | null)?.grantedAt || user.createdAt || 0;
      const gracePeriodExpired = (Date.now() - adminGrantedAt) > GRACE_PERIOD_MS;
      if (gracePeriodExpired) {
        console.warn(`[requireAdmin] MFA grace period expired for admin ${user._id}`);
        throw new Error("MFA required: Your 14-day grace period has expired. Please enable MFA to continue.");
      }
    }
    return user;
  }

  if ("db" in ctx) {
    await logToSIEM(ctx as MutationCtx, {
      action: "admin_access_attempt",
      userId: user._id,
      status: "blocked",
      severity: "high",
      details: "Non-admin user attempted admin access"
    });
  }
  throw new Error("Admin access required");
}

export type AdminPermission = 
  | "view_users" 
  | "edit_users" 
  | "manage_flags" 
  | "view_analytics" 
  | "manage_catalog" 
  | "view_support" 
  | "manage_announcements" 
  | "manage_pricing"
  | "delete_receipts"
  | "view_receipts"
  | "view_audit_logs"
  | "bulk_operation";

export const SENSITIVE_ACTIONS = new Set([
  "delete_receipts",
  "edit_users",
  "manage_catalog",
  "bulk_operation",
]);

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const GENERAL_RATE_LIMIT = 100;
const SENSITIVE_RATE_LIMIT = 10;

export async function checkRateLimit(ctx: MutationCtx, userId: Id<"users">, action: string): Promise<void> {
  const now = Date.now();
  const isSensitive = SENSITIVE_ACTIONS.has(action);
  const limit = isSensitive ? SENSITIVE_RATE_LIMIT : GENERAL_RATE_LIMIT;

  const existing = await ctx.db
    .query("adminRateLimits")
    .withIndex("by_user_action", (q) =>
      q.eq("userId", userId).eq("action", action)
    )
    .first();

  if (!existing) {
    await ctx.db.insert("adminRateLimits", {
      userId,
      action,
      count: 1,
      windowStart: now,
    });
    return;
  }

  const windowExpired = (now - existing.windowStart) >= RATE_LIMIT_WINDOW_MS;

  if (windowExpired) {
    await ctx.db.patch(existing._id, {
      count: 1,
      windowStart: now,
    });
    return;
  }

  if (existing.count >= limit) {
    const resetInSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - existing.windowStart)) / 1000);
    throw new Error(
      `Rate limit exceeded: ${existing.count}/${limit} requests for ${action}. ` +
      `Try again in ${resetInSeconds} seconds.`
    );
  }

  await ctx.db.patch(existing._id, {
    count: existing.count + 1,
  });
}

/**
 * Check if a user (already validated as admin) has a specific permission.
 * Shared logic for mutation and query contexts.
 */
async function checkPermissionForUser(ctx: QueryCtx | MutationCtx, user: Doc<"users">, permission: AdminPermission): Promise<void> {
  if (user.isAdmin) return;

  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();

  if (!userRole) throw new Error(`Permission denied: ${permission}`);

  const role = await ctx.db.get(userRole.roleId);
  if (!role || role.name !== "super_admin") {
    const hasPermission = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", userRole.roleId))
      .filter((q) => q.eq(q.field("permission"), permission))
      .first();

    if (!hasPermission) throw new Error(`Permission denied: ${permission}`);
  }
}

export async function requirePermission(ctx: MutationCtx, permission: AdminPermission, options?: { skipRateLimit?: boolean }): Promise<Doc<"users">> {
  const user = await requireAdmin(ctx);

  if (!options?.skipRateLimit) {
    await checkRateLimit(ctx, user._id, permission);
  }

  await checkPermissionForUser(ctx, user, permission);
  return user;
}

export async function requirePermissionQuery(ctx: QueryCtx, permission: AdminPermission): Promise<Doc<"users">> {
  const user = await requireAdmin(ctx);
  await checkPermissionForUser(ctx, user, permission);
  return user;
}

export async function measureQueryPerformance<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  warnThresholdMs: number = 1000
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    if (duration > warnThresholdMs) {
      console.warn(`[Admin Performance] SLOW QUERY: ${queryName} took ${duration}ms`);
    }
    return result;
  } catch (error) {
    console.error(`[Admin Performance] ${queryName} FAILED:`, error);
    throw error;
  }
}
