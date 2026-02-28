import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Doc, Id, DataModel } from "./_generated/dataModel";
import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { logToSIEM } from "./lib/siem";

type QueryCtx = GenericQueryCtx<DataModel>;
type MutationCtx = GenericMutationCtx<DataModel>;

// Simple in-memory cache for expensive queries (5-minute TTL)
const queryCache = new Map<string, { data: any; expiresAt: number }>();

/**
 * Helper to fetch from cache or compute and store
 */
async function getCachedOrCompute<T>(
  cacheKey: string,
  ttlMs: number,
  computeFn: () => Promise<T>
): Promise<T> {
  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  
  const result = await computeFn();
  queryCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + ttlMs,
  });
  return result;
}

/**
 * Performance logging wrapper for admin queries
 */
async function measureQueryPerformance<T>(
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

/**
 * Normalizes Clerk ID by stripping any OAuth prefix (e.g., "oauth_google|abc123" -> "abc123")
 * Some Clerk IDs have prefixes, some don't - this handles both cases
 */
function normalizeClerkId(clerkId: string): string {
  if (clerkId.includes("|")) {
    return clerkId.split("|").pop() || clerkId;
  }
  return clerkId;
}

/**
 * Simple XSS sanitization - escapes common HTML special characters
 */
function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Gets the current authenticated user from the database
 * Returns null if not authenticated or user not found
 */
async function getCurrentUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // Try to find user by exact clerkId first
  let user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  // If not found, try normalized ID (handle OAuth prefixes)
  if (!user) {
    const normalizedId = normalizeClerkId(identity.subject);
    if (normalizedId !== identity.subject) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", normalizedId))
        .first();
    }
  }

  // If still not found, try finding by tokenIdentifier (fallback)
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
 * Checks both legacy isAdmin flag and RBAC userRoles table
 */
async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);

  if (!user) {
    // We don't have a userId here, but we log the blocked attempt
    if ("db" in ctx) {
      // SIEM only works in mutations (where ctx.db.insert exists)
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

  // P0 Fix: Check if user is suspended
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

  // P1 Fix: MFA Requirement for Admins (with 14-day grace period)
  if (!user.mfaEnabled) {
    const now = Date.now();
    const GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

    // Bootstrap: If adminGrantedAt doesn't exist, set it now (mutation context only)
    let adminGrantedAt = user.adminGrantedAt;
    const isMutation = "db" in ctx && "patch" in (ctx as any).db;

    if (!adminGrantedAt && isMutation) {
      adminGrantedAt = now;
      await (ctx as MutationCtx).db.patch(user._id, { adminGrantedAt });
    }

    // Calculate time since admin access was granted
    // If no adminGrantedAt and we're in a query, treat as "just granted" (grace period active)
    const timeSinceGrant = adminGrantedAt ? now - adminGrantedAt : 0;
    const daysRemaining = Math.ceil((GRACE_PERIOD_MS - timeSinceGrant) / (24 * 60 * 60 * 1000));

    if (timeSinceGrant > GRACE_PERIOD_MS) {
      // Grace period expired - block access
      if (isMutation) {
        await logToSIEM(ctx as MutationCtx, {
          action: "admin_access_attempt",
          userId: user._id,
          status: "blocked",
          severity: "high",
          details: `MFA grace period expired (${Math.floor(timeSinceGrant / (24 * 60 * 60 * 1000))} days since grant)`
        });
      }
      throw new Error("MFA_REQUIRED: Multi-factor authentication setup required. Your 14-day grace period has expired.");
    }

    // Within grace period - allow but log warning
    if (isMutation) {
      await logToSIEM(ctx as MutationCtx, {
        action: "admin_access_attempt",
        userId: user._id,
        status: "allowed_grace_period",
        severity: "low",
        details: `Admin access without MFA (${daysRemaining} days remaining in grace period)`
      });
    }
  }

  // P3 Fix: IP Whitelisting check
  if (user.allowedIps && user.allowedIps.length > 0) {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .filter(q => q.eq(q.field("status"), "active"))
      .order("desc")
      .first();
      
    if (session && session.ipAddress && !user.allowedIps.includes(session.ipAddress)) {
      if ("db" in ctx) {
        await logToSIEM(ctx as MutationCtx, {
          action: "admin_access_attempt",
          userId: user._id,
          status: "blocked",
          severity: "high",
          ipAddress: session.ipAddress,
          details: `IP restriction: Access attempt from unauthorized IP ${session.ipAddress}`
        });
      }
      throw new Error(`IP_RESTRICTED: Admin access not allowed from IP ${session.ipAddress}`);
    }
  }

  // Check legacy isAdmin flag or RBAC table
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();

  if (user.isAdmin || userRole) {
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

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Sensitive actions that have a lower rate limit (10/min instead of 100/min)
 * These are destructive or high-impact operations
 */
const SENSITIVE_ACTIONS = new Set([
  "delete_receipts",      // Deleting data
  "edit_users",           // Modifying user accounts (suspend, grant access)
  "manage_catalog",       // Merging stores (affects many records)
  "bulk_operation",       // Any bulk operation
]);

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const GENERAL_RATE_LIMIT = 100;         // 100 requests per minute
const SENSITIVE_RATE_LIMIT = 10;        // 10 requests per minute for sensitive actions

/**
 * Checks and enforces rate limits for admin actions
 * @param ctx - Convex context (must be mutation context for writes)
 * @param userId - The admin user's ID
 * @param action - The action/permission being performed
 * @returns true if within limits, throws error if exceeded
 */
async function checkRateLimit(ctx: MutationCtx, userId: Id<"users">, action: string): Promise<void> {
  const now = Date.now();
  const isSensitive = SENSITIVE_ACTIONS.has(action);
  const limit = isSensitive ? SENSITIVE_RATE_LIMIT : GENERAL_RATE_LIMIT;

  // Find existing rate limit record for this user+action
  const existing = await ctx.db
    .query("adminRateLimits")
    .withIndex("by_user_action", (q) =>
      q.eq("userId", userId).eq("action", action)
    )
    .first();

  if (!existing) {
    // First request for this action - create new record
    await ctx.db.insert("adminRateLimits", {
      userId,
      action,
      count: 1,
      windowStart: now,
    });
    return;
  }

  // Check if window has expired (1 minute has passed)
  const windowExpired = (now - existing.windowStart) >= RATE_LIMIT_WINDOW_MS;

  if (windowExpired) {
    // Reset the window
    await ctx.db.patch(existing._id, {
      count: 1,
      windowStart: now,
    });
    return;
  }

  // Window is still active - check if limit exceeded
  if (existing.count >= limit) {
    const resetInSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - existing.windowStart)) / 1000);
    throw new Error(
      `Rate limit exceeded: ${existing.count}/${limit} requests for ${action}. ` +
      `Try again in ${resetInSeconds} seconds.`
    );
  }

  // Increment counter
  await ctx.db.patch(existing._id, {
    count: existing.count + 1,
  });
}

/**
 * Query-safe rate limit check (read-only, doesn't enforce)
 * For queries that want to check limit status without modifying
 */
async function getRateLimitStatus(ctx: QueryCtx, userId: Id<"users">, action: string): Promise<{
  count: number;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}> {
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
    return { count: 0, limit, remaining: limit, resetInSeconds: 0 };
  }

  const windowExpired = (now - existing.windowStart) >= RATE_LIMIT_WINDOW_MS;
  if (windowExpired) {
    return { count: 0, limit, remaining: limit, resetInSeconds: 0 };
  }

  const resetInSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - existing.windowStart)) / 1000);
  return {
    count: existing.count,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetInSeconds,
  };
}

// ============================================================================
// RBAC AUTHORIZATION
// ============================================================================

/**
 * RBAC Authorization Helper
 * Checks if user has a specific permission via their assigned role
 * Also enforces rate limiting on mutations
 */
async function requirePermission(ctx: MutationCtx, permission: string, options?: { skipRateLimit?: boolean }): Promise<Doc<"users">> {
  const user = await requireAdmin(ctx);

  // Enforce rate limiting
  if (!options?.skipRateLimit) {
    try {
      await checkRateLimit(ctx, user._id, permission);
    } catch (e) {
      await logToSIEM(ctx, {
        action: "rate_limit_blocked",
        userId: user._id,
        status: "blocked",
        severity: "medium",
        details: `Rate limit reached for permission: ${permission}`
      });
      throw e;
    }
  }

  // Helper to log and throw
  const deny = async (reason: string) => {
    await logToSIEM(ctx, {
      action: "permission_denied",
      userId: user._id,
      status: "blocked",
      severity: "high",
      details: `${reason}: ${permission}`
    });
    throw new Error(`Permission denied: ${permission}`);
  };

  // Super admins (via legacy isAdmin) get all permissions
  if (user.isAdmin) {
    return user;
  }

  // Get user's role
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();

  if (!userRole) {
    return await deny("No role assigned");
  }

  // Get role details
  const role = await ctx.db.get(userRole.roleId);
  if (!role) {
    return await deny("Assigned role not found");
  }

  // Super admin role gets all permissions
  if (role.name === "super_admin") {
    return user;
  }

  // Check if role has the required permission
  const hasPermission = await ctx.db
    .query("rolePermissions")
    .withIndex("by_role", (q) => q.eq("roleId", userRole.roleId))
    .filter((q) => q.eq(q.field("permission"), permission))
    .first();

  if (!hasPermission) {
    return await deny(`Role ${role.name} lacks permission`);
  }

  return user;
}

/**
 * Permission check for queries (no rate limiting, read-only)
 */
async function requirePermissionQuery(ctx: QueryCtx, permission: string): Promise<Doc<"users">> {
  const user = await requireAdmin(ctx);

  // Super admins (via legacy isAdmin) get all permissions
  if (user.isAdmin) {
    return user;
  }

  // Get user's role
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();

  if (!userRole) {
    throw new Error(`Permission denied: ${permission}`);
  }

  // Get role details
  const role = await ctx.db.get(userRole.roleId);
  if (!role) {
    throw new Error(`Permission denied: ${permission}`);
  }

  // Super admin role gets all permissions
  if (role.name === "super_admin") {
    return user;
  }

  // Check if role has the required permission
  const hasPermission = await ctx.db
    .query("rolePermissions")
    .withIndex("by_role", (q) => q.eq("roleId", userRole.roleId))
    .filter((q) => q.eq(q.field("permission"), permission))
    .first();

  if (!hasPermission) {
    throw new Error(`Permission denied: ${permission} for role ${role.name}`);
  }

  return user;
}

// ============================================================================
// RBAC QUERIES
// ============================================================================

/**
 * Get permissions for the current admin user
 * Returns null if user is not an admin (triggers Access Denied in UI)
 */
export const getMyPermissions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return null; // Not authenticated
    }

    // Check if user is admin via legacy flag
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

    // Check RBAC userRoles table
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();

    if (!userRole) {
      return null; // Not an admin
    }

    // Get role details
    const role = await ctx.db.get(userRole.roleId);
    if (!role) {
      return null;
    }

    // Get all permissions for this role
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

    // Not an admin - return null
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();

    if (!user.isAdmin && !userRole) {
      return null;
    }

    // Already has MFA enabled - no grace period needed
    if (user.mfaEnabled) {
      return {
        mfaEnabled: true,
        inGracePeriod: false,
        daysRemaining: 0,
        gracePeriodExpired: false,
      };
    }

    // Calculate grace period status
    const now = Date.now();
    const GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
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

// ============================================================================
// ADMIN SESSION TRACKING
// ============================================================================

// 8 hours in milliseconds
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const MAX_CONCURRENT_SESSIONS = 3;

export const logAdminSession = mutation({
  args: { ipAddress: v.optional(v.string()), userAgent: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const now = Date.now();

    // 1. Get all currently active sessions for this user
    const activeSessions = await ctx.db
      .query("adminSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .collect();

    // 2. Identify and handle expired or duplicate sessions
    let currentSession = null;
    const trulyActive = [];

    for (const session of activeSessions) {
      const isExpired = (now - session.lastSeenAt) > SESSION_TIMEOUT_MS;
      if (isExpired) {
        await ctx.db.patch(session._id, { status: "expired", logoutAt: now });
      } else if (!currentSession && session.userAgent === args.userAgent) {
        // Same browser/device - reuse this session
        await ctx.db.patch(session._id, { lastSeenAt: now, ipAddress: args.ipAddress || session.ipAddress });
        currentSession = session;
        trulyActive.push(session);
      } else {
        trulyActive.push(session);
      }
    }

    if (currentSession) return { sessionId: currentSession._id };

    // 3. Enforce concurrency limit (Max 3)
    // If we're about to add a new one, we must have at most MAX-1
    if (trulyActive.length >= MAX_CONCURRENT_SESSIONS) {
      // Sort oldest first and expire until we have space
      const sortedByAge = [...trulyActive].sort((a, b) => a.loginAt - b.loginAt);
      const toExpireCount = trulyActive.length - (MAX_CONCURRENT_SESSIONS - 1);
      
      for (let i = 0; i < toExpireCount; i++) {
        const sessionToKill = sortedByAge[i];
        await ctx.db.patch(sessionToKill._id, { 
          status: "expired", 
          logoutAt: now,
          // Add metadata to note it was killed by concurrency limit
        });
      }

      await ctx.db.insert("adminLogs", {
        adminUserId: user._id,
        action: "session_limit_exceeded",
        targetType: "session",
        details: `Automatic logout of ${toExpireCount} oldest session(s) due to concurrency limit (${MAX_CONCURRENT_SESSIONS})`,
        createdAt: now,
      });

      await logToSIEM(ctx, {
        action: "session_limit_enforced",
        userId: user._id,
        status: "success",
        severity: "medium",
        details: `Concurrency limit (${MAX_CONCURRENT_SESSIONS}) reached. Expired ${toExpireCount} old sessions.`
      });
    }

    const sessionId = await ctx.db.insert("adminSessions", {
      userId: user._id,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      loginAt: now,
      lastSeenAt: now,
      status: "active",
    });

    await logToSIEM(ctx, {
      action: "admin_login",
      userId: user._id,
      status: "success",
      severity: "low",
      ipAddress: args.ipAddress,
      details: `Admin logged in from ${args.userAgent || "unknown device"}`
    });

    return { sessionId };
  },
});

export const logoutAdmin = mutation({
  args: { sessionId: v.id("adminSessions") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) throw new Error("Invalid session");
    await ctx.db.patch(args.sessionId, { status: "logged_out", logoutAt: Date.now() });
    return { success: true };
  },
});

export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    // P1 Fix: Use index and limit
    const active = await ctx.db
      .query("adminSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(100);
      
    // P1 Fix: Batch load unique users to avoid N+1
    const userIds = [...new Set(active.map(s => s.userId))];
    const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
    const userMap = new Map(users.filter(u => u).map(u => [u!._id, u!]));

    return active.map((s) => {
      const u = userMap.get(s.userId);
      return { ...s, userName: u?.name || "Unknown", userEmail: u?.email || "" };
    });
  },
});

export const forceLogoutSession = mutation({
  args: { sessionId: v.id("adminSessions") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manage_flags");
    await ctx.db.patch(args.sessionId, { status: "expired", logoutAt: Date.now() });
    return { success: true };
  },
});

/**
 * Periodically cleanup expired admin sessions
 * Called by cron job hourly
 */
export const cleanupExpiredSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredThreshold = now - SESSION_TIMEOUT_MS;

    const activeSessions = await ctx.db
      .query("adminSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let count = 0;
    for (const session of activeSessions) {
      if (session.lastSeenAt < expiredThreshold) {
        await ctx.db.patch(session._id, {
          status: "expired",
          logoutAt: now,
        });
        count++;
      }
    }

    if (count > 0) {
      console.log(`[Admin] Cleaned up ${count} expired admin sessions`);
    }
    return { count };
  },
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

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
    
    // Minimum 2 characters for performance
    if (term.length < 2) return [];

    const byName = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q: any) => q.search("name", term))
      .take(args.limit || 50);

    const byEmail = await ctx.db
      .query("users")
      .withSearchIndex("search_email", (q: any) => q.search("email", term))
      .take(args.limit || 50);

    // Merge results and de-duplicate by ID
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
    
    // P0 Fix: Prevent self-promotion/demotion
    if (args.userId === admin._id) {
      throw new Error("Security Violation: Cannot toggle your own admin status");
    }

    // P0 Fix: Check if performing admin is a super_admin
    // (only super_admins can grant/revoke admin privileges)
    const isSuperAdmin = admin.isAdmin === true; // legacy super_admin
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

    // Set adminGrantedAt when granting admin access (starts MFA grace period)
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

    // Find user's subscription
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

    // Find or create subscription
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

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * Generates a temporary download URL for a receipt image
 */
export const getReceiptImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_receipts");
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getAnalytics = query({
  args: { refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    // P0 Fix: If a date range is provided, we still need to compute it, 
    // but let's make the "overview" (default) use precomputed ONLY.
    if (!args.dateFrom && !args.dateTo) {
      const today = new Date().toISOString().split("T")[0];
      let metrics = await ctx.db.query("platformMetrics").withIndex("by_date", q => q.eq("date", today)).unique();
      
      // Fallback to latest available precomputed metrics
      if (!metrics) {
        metrics = await ctx.db.query("platformMetrics").order("desc").first();
      }
      
      if (metrics) {
        return {
          totalUsers: metrics.totalUsers,
          newUsersThisWeek: metrics.newUsersThisWeek,
          newUsersThisMonth: metrics.newUsersThisMonth,
          activeUsersThisWeek: metrics.activeUsersThisWeek,
          totalLists: metrics.totalLists,
          completedLists: metrics.completedLists,
          totalReceipts: metrics.totalReceipts,
          receiptsThisWeek: metrics.receiptsThisWeek,
          receiptsThisMonth: metrics.receiptsThisMonth,
          totalGMV: metrics.totalGMV,
          gmvThisWeek: metrics.gmvThisWeek,
          gmvThisMonth: metrics.gmvThisMonth,
          gmvThisYear: metrics.gmvThisYear || 0,
          computedAt: metrics.computedAt,
          isPrecomputed: true,
        };
      }
    }

    // If date range provided OR precomputed metrics missing, use optimized live analytics
    return getLiveAnalytics(ctx, args.dateFrom, args.dateTo);
  },
});

async function getLiveAnalytics(ctx: QueryCtx, dateFrom?: number, dateTo?: number) {
  const cacheKey = `live_analytics_${dateFrom || 0}_${dateTo || 0}`;
  return await getCachedOrCompute(cacheKey, 5 * 60 * 1000, async () => {
    return measureQueryPerformance("getLiveAnalytics", async () => {
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      const yearAgo = now - 365 * 24 * 60 * 60 * 1000;
      
      // P0 Fix: Optimized queries using indexes instead of .collect() on everything
      // For 50k+ records, we should still use .take() or pagination if possible, 
      // but for analytics totals, we often need to touch all records.
      // At scale, this MUST come from platformMetrics only.
      
      const usersQuery = dateFrom 
        ? ctx.db.query("users").withIndex("by_created", (q: any) => q.gte("createdAt", dateFrom))
        : ctx.db.query("users").withIndex("by_created");
        
      const listsQuery = dateFrom
        ? ctx.db.query("shoppingLists").withIndex("by_created", (q: any) => q.gte("createdAt", dateFrom))
        : ctx.db.query("shoppingLists").withIndex("by_created");
      
    const receiptsQuery = dateFrom
      ? ctx.db.query("receipts").withIndex("by_created", (q: any) => q.gte("createdAt", dateFrom))
      : ctx.db.query("receipts").withIndex("by_created");

    // We still have to collect to filter/aggregate if dateTo is provided or for status checks
    // This is the bottleneck that platformMetrics solves.
    let u = await usersQuery.collect();
    let l = await listsQuery.collect();
    let r = await receiptsQuery.collect();

    if (dateTo) {
      u = u.filter((x: any) => x.createdAt <= dateTo);
      l = l.filter((x: any) => x.createdAt <= dateTo);
      r = r.filter((x: any) => x.createdAt <= dateTo);
    }

    const computeGMV = (receipts: any[]) => Math.round(receipts.reduce((s: number, x: any) => s + (x.total || 0), 0) * 100) / 100;

    return {
      totalUsers: u.length,
      newUsersThisWeek: u.filter((x: any) => x.createdAt >= weekAgo).length,
      newUsersThisMonth: u.filter((x: any) => x.createdAt >= monthAgo).length,
      activeUsersThisWeek: new Set(l.filter((x: any) => x.updatedAt >= weekAgo).map((x: any) => x.userId.toString())).size,
      totalLists: l.length,
      completedLists: l.filter((x: any) => x.status === "completed").length,
      totalReceipts: r.length,
      receiptsThisWeek: r.filter((x: any) => x.createdAt >= weekAgo).length,
      receiptsThisMonth: r.filter((x: any) => x.createdAt >= monthAgo).length,
      totalGMV: computeGMV(r),
      gmvThisWeek: computeGMV(r.filter((x: any) => x.createdAt >= weekAgo)),
      gmvThisMonth: computeGMV(r.filter((x: any) => x.createdAt >= monthAgo)),
      gmvThisYear: computeGMV(r.filter((x: any) => x.createdAt >= yearAgo)),
      computedAt: now,
      isPrecomputed: false,
    };
  });
  });
}

export const getRevenueReport = query({
  args: { refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics");

    const cacheKey = `revenue_report_${args.dateFrom || 0}_${args.dateTo || 0}`;
    return await getCachedOrCompute(cacheKey, 5 * 60 * 1000, async () => {
      // Get dynamic pricing
      const monthlyPricing = await ctx.db
        .query("pricingConfig")
        .withIndex("by_plan", (q) => q.eq("planId", "premium_monthly"))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      const annualPricing = await ctx.db
        .query("pricingConfig")
        .withIndex("by_plan", (q) => q.eq("planId", "premium_annual"))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      const monthlyPrice = monthlyPricing?.priceAmount || 0;
      const annualPrice = annualPricing?.priceAmount || 0;

      // P0 Fix: Optimized query using index
      const subsQuery = args.dateFrom 
        ? ctx.db.query("subscriptions").withIndex("by_created", q => q.gte("createdAt", args.dateFrom!))
        : ctx.db.query("subscriptions").withIndex("by_created");
        
      let subs = await subsQuery.collect();
      if (args.dateTo) subs = subs.filter(s => s.createdAt <= args.dateTo!);

      const activeSubs = subs.filter((s: any) => s.status === "active");
      const monthlyCount = activeSubs.filter((s: any) => s.plan === "premium_monthly").length;
      const annualCount = activeSubs.filter((s: any) => s.plan === "premium_annual").length;
      const trialsActive = subs.filter((s: any) => s.status === "trial").length;

      const mrr = monthlyCount * monthlyPrice + (annualCount * annualPrice) / 12;
      const arr = mrr * 12;

      return {
        totalSubscriptions: subs.length,
        activeSubscriptions: activeSubs.length,
        monthlySubscribers: monthlyCount,
        annualSubscribers: annualCount,
        trialsActive,
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
      };
    });
  },
});

export const getFinancialReport = query({
  args: { 
    refreshKey: v.optional(v.string()),
    dateFrom: v.optional(v.number()), 
    dateTo: v.optional(v.number()) 
  },
  handler: async (ctx, args): Promise<{
    grossRevenue: number;
    estimatedTax: number;
    estimatedCOGS: number;
    netRevenue: number;
    margin: number;
  }> => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    // This would ideally pull from a real payments table
    // For now we estimate from active subscriptions
    const rev = await ctx.runQuery(api.admin.getRevenueReport, args);

    const grossRevenue = rev.mrr;
    const estimatedTax = grossRevenue * 0.20; // 20% VAT

    // Estimate COGS (API costs: OpenAI, Clerk, etc.)
    // Let's assume £0.50 per active user per month
    const analytics = await ctx.runQuery(api.admin.getAnalytics, {});
    const activeUsers = analytics.activeUsersThisWeek; // Approximate
    const estimatedCOGS = activeUsers * 0.50;
    
    const netRevenue = grossRevenue - estimatedTax - estimatedCOGS;
    
    return {
      grossRevenue,
      estimatedTax,
      estimatedCOGS,
      netRevenue,
      margin: grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0,
    };
  },
});

export const getCohortMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db.query("cohortMetrics").order("desc").take(100);
  },
});

export const getFunnelAnalytics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    // Define funnel steps
    const steps = ["signup", "onboarding_complete", "first_list", "first_receipt", "first_scan", "subscribed"];
    
    // Count unique users per step
    const funnel: { step: string; count: number; percentage: number }[] = [];
    
    // Get recent events (limit for performance)
    const allEvents = await ctx.db.query("funnelEvents").order("desc").take(10000);
    
    let baseCount = 0;
    
    for (const step of steps) {
      const uniqueUsers = new Set(
        allEvents
          .filter(e => e.eventName === step)
          .map(e => e.userId.toString())
      ).size;
      
      if (step === "signup") baseCount = uniqueUsers;
      
      funnel.push({
        step,
        count: uniqueUsers,
        percentage: baseCount > 0 ? (uniqueUsers / baseCount) * 100 : 0,
      });
    }
    
    return funnel;
  },
});

export const getChurnMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db.query("churnMetrics").order("desc").take(100);
  },
});

export const getLTVMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db.query("ltvMetrics").order("desc").take(100);
  },
});

export const getUserSegmentSummary = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    const segments = await ctx.db.query("userSegments").take(5000);
    
    const summary: Record<string, number> = {};
    for (const s of segments) {
      summary[s.segment] = (summary[s.segment] || 0) + 1;
    }
    
    return Object.entries(summary).map(([name, count]) => ({
      name,
      count,
      percentage: segments.length > 0 ? (count / segments.length) * 100 : 0,
    }));
  },
});

// ============================================================================
// PHASE 3: SUPPORT & OPERATIONS
// ============================================================================

/**
 * Data Retention: Moves admin logs older than 90 days to cold storage
 * Runs weekly via cron
 */
export const archiveOldAdminLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    
    // Process in batches of 100 to avoid timeout/heavy ops
    const oldLogs = await ctx.db
      .query("adminLogs")
      .withIndex("by_created", (q) => q.lt("createdAt", ninetyDaysAgo))
      .take(100);

    if (oldLogs.length === 0) return { archived: 0 };

    for (const log of oldLogs) {
      // 1. Copy to archive
      await ctx.db.insert("archivedAdminLogs", {
        adminUserId: log.adminUserId,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        details: log.details,
        createdAt: log.createdAt,
        archivedAt: Date.now(),
      });
      
      // 2. Delete from active logs
      await ctx.db.delete(log._id);
    }

    return { archived: oldLogs.length };
  },
});

/**
 * Scheduled Reports: Generates and archives reports for admins
 * Runs weekly/monthly via cron
 */
export const runScheduledReports = internalMutation({
  args: { type: v.union(v.literal("weekly_summary"), v.literal("monthly_financial")) },
  handler: async (ctx, args) => {
    const activeConfigs = await ctx.db
      .query("scheduledReports")
      .filter((q) => q.and(q.eq(q.field("type"), args.type), q.eq(q.field("status"), "active")))
      .collect();

    if (activeConfigs.length === 0) return { status: "no_active_configs" };

    // 1. Compute report data (reuse existing analytics logic)
    let reportData = {};
    if (args.type === "weekly_summary") {
      reportData = await ctx.runQuery(api.admin.getAnalytics, {});
    } else {
      reportData = await ctx.runQuery(api.admin.getRevenueReport, {});
    }

    // 2. Archive the report and simulate "sending"
    for (const config of activeConfigs) {
      await ctx.db.insert("reportHistory", {
        reportId: config._id,
        data: reportData,
        sentAt: Date.now(),
        status: "success", // In future: "failed" if email API fails
      });

      await ctx.db.patch(config._id, { lastRunAt: Date.now() });

      // LOG: Admin report generated
      await ctx.db.insert("adminLogs", {
        adminUserId: config.recipientEmails[0] as any, // Mock link
        action: "report_generated",
        targetType: "report",
        targetId: config._id,
        details: `Generated ${args.type} for ${config.recipientEmails.join(", ")}`,
        createdAt: Date.now(),
      });
    }

    return { status: "success", count: activeConfigs.length };
  },
});

/**
 * Scale Testing: Simulates 50,000 users and 100,000 receipts
 * For verifying SLA monitoring and dashboard performance at scale
 * WARNING: This adds significant data and should only be run on test environments
 */
export const simulateHighLoad = internalMutation({
  args: { userCount: v.number(), receiptCount: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Batch inserts for users
    for (let i = 0; i < args.userCount; i += 100) {
      const batch = Math.min(100, args.userCount - i);
      await Promise.all(Array.from({ length: batch }).map((_, j) =>
        ctx.db.insert("users", {
          clerkId: `mock_clerk_${i + j}`,
          name: `Mock User ${i + j}`,
          email: `mock_${i + j}@example.com`,
          onboardingComplete: true,
          currency: "GBP",
          createdAt: now - Math.random() * 30 * 24 * 60 * 60 * 1000, // Last 30 days
          updatedAt: now,
        })
      ));
    }

    // Batch inserts for receipts
    const allUsers = await ctx.db.query("users").take(100); // Sample users for assignment
    for (let i = 0; i < args.receiptCount; i += 100) {
      const batch = Math.min(100, args.receiptCount - i);
      await Promise.all(Array.from({ length: batch }).map((_, j) =>
        ctx.db.insert("receipts", {
          userId: allUsers[Math.floor(Math.random() * allUsers.length)]._id,
          storeName: "Mock Store",
          total: Math.random() * 100,
          subtotal: Math.random() * 90,
          items: [],
          purchaseDate: now - Math.random() * 7 * 24 * 60 * 60 * 1000,
          processingStatus: "completed",
          createdAt: now - Math.random() * 7 * 24 * 60 * 60 * 1000,
        })
      ));
    }

    // Log the stress test
    await ctx.db.insert("adminLogs", {
      adminUserId: allUsers[0]._id, // Use mock admin
      action: "stress_test_execution",
      targetType: "system",
      details: `Generated ${args.userCount} users and ${args.receiptCount} receipts for scaling test`,
      createdAt: now,
    });

    return { success: true, users: args.userCount, receipts: args.receiptCount };
  },
});

export const getAdminTickets = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics"); // Support access
    
    let ticketsQuery;
    if (args.status) {
      ticketsQuery = ctx.db
        .query("supportTickets")
        .withIndex("by_status", (q) => q.eq("status", args.status as any));
    } else {
      ticketsQuery = ctx.db.query("supportTickets");
    }
    
    // P1 Fix: Use take(100) instead of collect()
    const tickets = await ticketsQuery.order("desc").take(100);
    
    // P1 Fix: Batch load unique users to avoid N+1
    const userIds = [...new Set(tickets.map(t => t.userId))];
    const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
    const userMap = new Map(users.filter(u => u).map(u => [u!._id, u!]));

    return tickets.map((t) => {
      const u = userMap.get(t.userId);
      return {
        ...t,
        userName: u?.name || "Unknown",
        userEmail: u?.email || "",
      };
    });
  },
});

export const getAdminSupportSummary = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    // P1 Fix: Use indexed counts instead of .collect()
    const [open, inProgress, resolved] = await Promise.all([
      ctx.db.query("supportTickets").withIndex("by_status", q => q.eq("status", "open")).collect().then(res => res.length),
      ctx.db.query("supportTickets").withIndex("by_status", q => q.eq("status", "in_progress")).collect().then(res => res.length),
      ctx.db.query("supportTickets").withIndex("by_status", q => q.eq("status", "resolved")).collect().then(res => res.length),
    ]);
    
    const unassigned = await ctx.db
      .query("supportTickets")
      .withIndex("by_assigned", q => q.eq("assignedTo", undefined))
      .filter(q => q.neq(q.field("status"), "resolved"))
      .collect()
      .then(res => res.length);
    
    return {
      total: open + inProgress + resolved,
      open,
      inProgress,
      resolved,
      unassigned,
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

// ============================================================================
// PHASE 4: ADVANCED FEATURES
// ============================================================================

export const getMonitoringSummary = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    const activeAlerts = await ctx.db
      .query("adminAlerts")
      .withIndex("by_resolved", (q) => q.eq("isResolved", false))
      .collect();
      
    const recentSLA = await ctx.db
      .query("slaMetrics")
      .order("desc")
      .take(10);
      
    return {
      alerts: activeAlerts,
      alertCount: activeAlerts.length,
      slaStatus: recentSLA.some(s => s.status === "fail") ? "failing" : 
                 recentSLA.some(s => s.status === "warn") ? "degraded" : "healthy",
      recentSLA,
    };
  },
});

export const getExperiments = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db.query("experiments").order("desc").collect();
  },
});

export const getWorkflows = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    // P1 Fix: Use take(100) instead of collect()
    return await ctx.db.query("automationWorkflows").take(100);
  },
});

export const resolveAlert = mutation({
  args: { alertId: v.id("adminAlerts") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");
    
    await ctx.db.patch(args.alertId, {
      isResolved: true,
      resolvedBy: admin._id,
      resolvedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// ============================================================================
// MODERATION
// ============================================================================

export const getRecentReceipts = query({
  args: { 
    limit: v.optional(v.number()), 
    dateFrom: v.optional(v.number()), 
    dateTo: v.optional(v.number()), 
    searchTerm: v.optional(v.string()), 
    status: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_receipts");

    let receipts = [];
    const limit = args.limit || 100;

    // 1. Efficient querying based on available filters
    if (args.status && !args.dateFrom && !args.dateTo) {
      const validStatus = args.status as "completed" | "pending" | "processing" | "failed";
      receipts = await ctx.db.query("receipts")
        .withIndex("by_processing_status", q => q.eq("processingStatus", validStatus))
        .order("desc")
        .take(limit);
    } else if (args.dateFrom || args.dateTo) {
      let q = ctx.db.query("receipts").withIndex("by_created");
      if (args.dateFrom) q = q.filter(q => q.gte(q.field("createdAt"), args.dateFrom!));
      if (args.dateTo) q = q.filter(q => q.lte(q.field("createdAt"), args.dateTo!));
      receipts = await q.order("desc").take(limit);
    } else {
      receipts = await ctx.db.query("receipts").order("desc").take(limit);
    }

    // 2. Batch load unique users to avoid N+1 and redundant fetches
    const userIds = [...new Set(receipts.map(r => r.userId))];
    const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
    const userMap = new Map(users.filter(u => u).map(u => [u!._id, u!]));

    const enriched = receipts.map(receipt => {
      const u = userMap.get(receipt.userId);
      return {
        ...receipt,
        userName: u?.name || "User",
        userEmail: u?.email || ""
      };
    });

    // 3. Post-query filtering for search term and extra status filters
    let filtered = enriched;
    if (args.searchTerm && args.searchTerm.length >= 2) {
      const term = args.searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.storeName?.toLowerCase().includes(term) ||
        r.userName?.toLowerCase().includes(term) ||
        r.userEmail?.toLowerCase().includes(term)
      );
    }

    if (args.status && (args.dateFrom || args.dateTo)) {
      filtered = filtered.filter(r => r.processingStatus === args.status);
    }

    return filtered.slice(0, limit);
  },
});

export const getFlaggedReceipts = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_receipts");
    
    // P1 Fix: Use index and limit
    const failed = await ctx.db
      .query("receipts")
      .withIndex("by_processing_status", q => q.eq("processingStatus", "failed"))
      .order("desc")
      .take(100);
      
    // P1 Fix: Batch load unique users to avoid N+1
    const userIds = [...new Set(failed.map(r => r.userId))];
    const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
    const userMap = new Map(users.filter(u => u).map(u => [u!._id, u!]));
    
    return failed.map(r => ({
      ...r,
      userName: userMap.get(r.userId)?.name || "Unknown"
    }));
  },
});

export const getPriceAnomalies = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_receipts");

    // P1 Fix: Use index for most recent 5000 price records
    const recentPrices = await ctx.db
      .query("currentPrices")
      .withIndex("by_updated")
      .order("desc")
      .take(5000);

    // Group prices by itemName + storeName
    const priceGroups = new Map<string, number[]>();

    for (const price of recentPrices) {
      const key = `${price.itemName || "unknown"}|${price.storeName || "unknown"}`;
      if (!priceGroups.has(key)) {
        priceGroups.set(key, []);
      }
      priceGroups.get(key)!.push(price.unitPrice);
    }

    // Find anomalies (prices that deviate >50% from average)
    const anomalies: any[] = [];

    for (const [key, prices] of priceGroups.entries()) {
      if (prices.length < 2) continue; // Need at least 2 prices to detect anomaly

      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;

      for (let i = 0; i < prices.length; i++) {
        const price = prices[i];
        const deviation = Math.abs((price - avg) / avg);

        if (deviation > 0.5) {
          // >50% deviation is anomalous
          const [itemName, storeName] = key.split("|");
          const priceRecord = recentPrices.find(
            p => p.itemName === itemName && p.storeName === storeName && p.unitPrice === price
          );

          if (priceRecord) {
            anomalies.push({
              ...priceRecord,
              average: Math.round(avg * 100) / 100,
              deviationPercent: Math.round(deviation * 100),
            });
          }
        }
      }
    }

    // Sort by deviation (highest first) and limit
    const sorted = anomalies
      .sort((a, b) => b.deviationPercent - a.deviationPercent)
      .slice(0, args.limit || 50);

    return {
      anomalies: sorted,
      hasMore: anomalies.length > (args.limit || 50),
    };
  },
});

export const deleteReceipt = mutation({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "delete_receipts");
    
    // P1 Fix: Cascading deletes for priceHistory
    const history = await ctx.db
      .query("priceHistory")
      .withIndex("by_receipt", q => q.eq("receiptId", args.receiptId))
      .collect();
      
    for (const h of history) {
      await ctx.db.delete(h._id);
    }

    await ctx.db.delete(args.receiptId);
    await ctx.db.insert("adminLogs", { 
      adminUserId: admin._id, 
      action: "delete_receipt", 
      targetType: "receipt", 
      targetId: args.receiptId, 
      details: `Deleted receipt and ${history.length} price history entries`,
      createdAt: Date.now() 
    });
    return { success: true };
  },
});

export const bulkReceiptAction = mutation({
  args: { receiptIds: v.array(v.id("receipts")), action: v.union(v.literal("approve"), v.literal("delete")) },
  handler: async (ctx, args) => {
    // Use bulk_operation permission - triggers sensitive rate limit (10/min)
    const admin = await requirePermission(ctx, "bulk_operation");
    let deletedCount = 0;
    let approvedCount = 0;

    for (const id of args.receiptIds) {
      if (args.action === "delete") {
        // P1 Fix: Also handle cascading deletes in bulk
        const history = await ctx.db
          .query("priceHistory")
          .withIndex("by_receipt", q => q.eq("receiptId", id))
          .collect();
        for (const h of history) await ctx.db.delete(h._id);
        
        await ctx.db.delete(id);
        deletedCount++;
      } else {
        await ctx.db.patch(id, {
          processingStatus: "completed",
        });
        approvedCount++;
      }
    }
    
    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: `bulk_${args.action}`,
      targetType: "receipt",
      details: `Bulk ${args.action} on ${args.receiptIds.length} receipts`,
      createdAt: Date.now(),
    });
    return { success: true, count: args.receiptIds.length };
  },
});

export const overridePrice = mutation({
  args: { priceId: v.id("currentPrices"), newPrice: v.optional(v.number()), deleteEntry: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_catalog");
    const existing = await ctx.db.get(args.priceId);
    if (!existing) throw new Error("Price record not found");

    if (args.deleteEntry) {
      await ctx.db.delete(args.priceId);
      await ctx.db.insert("adminLogs", {
        adminUserId: admin._id,
        action: "delete_price",
        targetType: "currentPrice",
        targetId: args.priceId,
        details: `Deleted price record for ${existing.itemName} at ${existing.storeName}`,
        createdAt: Date.now()
      });
    } else if (args.newPrice !== undefined) {
      await ctx.db.patch(args.priceId, { unitPrice: args.newPrice });
      await ctx.db.insert("adminLogs", {
        adminUserId: admin._id,
        action: "override_price",
        targetType: "currentPrice",
        targetId: args.priceId,
        details: `Overrode price for ${existing.itemName} from £${existing.unitPrice} to £${args.newPrice}`,
        createdAt: Date.now()
      });
    }
    return { success: true };
  },
});

export const getUserDetail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_users");
    const u = await ctx.db.get(args.userId);
    if (!u) return null;

    // P1 Fix: More efficient counting (still using collect().length as Convex lacks count() in all versions, 
    // but scoped by index is better than full scan)
    const [r, l] = await Promise.all([
      ctx.db.query("receipts").withIndex("by_user", q => q.eq("userId", u._id)).collect(),
      ctx.db.query("shoppingLists").withIndex("by_user", q => q.eq("userId", u._id)).collect()
    ]);

    // Find user's latest subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", u._id))
      .order("desc")
      .first();

    return { 
      ...u, 
      receiptCount: r.length, 
      listCount: l.length, 
      totalSpent: Math.round(r.reduce((s, x) => s + (x.total || 0), 0) * 100) / 100, 
      scanRewards: { lifetimeScans: 0 }, 
      subscription: subscription || { plan: "free", status: "active" } 
    };
  },
});

// ============================================================================
// SYSTEM & LOGS
// ============================================================================

export const getSystemHealth = query({
  args: { refreshKey: v.optional(v.string()) },
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // 1. Get active alerts
    const activeAlerts = await ctx.db
      .query("adminAlerts")
      .withIndex("by_resolved", q => q.eq("isResolved", false))
      .collect();

    // 2. Get recent receipt stats
    const recentReceipts = await ctx.db
      .query("receipts")
      .withIndex("by_created", q => q.gte("createdAt", oneDayAgo))
      .collect();
    
    const failed = recentReceipts.filter(r => r.processingStatus === "failed").length;
    const processing = recentReceipts.filter(r => r.processingStatus === "processing").length;
    const total = recentReceipts.length;
    const successRate = total > 0 ? Math.round(((total - failed) / total) * 100) : 100;

    // 3. Determine status
    let status: "healthy" | "degraded" | "down" = "healthy";
    if (activeAlerts.some(a => a.severity === "critical") || successRate < 80) {
      status = "down";
    } else if (activeAlerts.length > 0 || successRate < 95) {
      status = "degraded";
    }

    return { 
      status, 
      receiptProcessing: { 
        total, 
        failed, 
        processing, 
        successRate 
      }, 
      alertCount: activeAlerts.length,
      timestamp: now 
    };
  },
});

export const getAuditLogs = query({
  args: { paginationOpts: v.any(), refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_audit_logs");
    
    let query = ctx.db.query("adminLogs").withIndex("by_created");
    
    if (args.dateFrom) {
      query = query.filter(q => q.gte(q.field("createdAt"), args.dateFrom!));
    }
    if (args.dateTo) {
      query = query.filter(q => q.lte(q.field("createdAt"), args.dateTo!));
    }
    
    const logs = await query.order("desc").paginate(args.paginationOpts);
    
    // P1 Fix: Batch load unique admin users to avoid N+1 and redundant fetches
    const adminIds = [...new Set(logs.page.map(l => l.adminUserId))];
    const admins = await Promise.all(adminIds.map(id => ctx.db.get(id)));
    const adminMap = new Map(admins.filter(a => a).map(a => [a!._id, a!]));
    
    const enriched = logs.page.map(l => ({
      ...l,
      adminName: adminMap.get(l.adminUserId)?.name || "Unknown"
    }));
    
    return { ...logs, page: enriched };
  },
});

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const getFeatureFlags = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "manage_flags");
    const flags = await ctx.db.query("featureFlags").collect();
    
    // P1 Fix: Batch load unique admin users to avoid N+1
    const adminIds = [...new Set(flags.map(f => f.updatedBy).filter(id => !!id))];
    const admins = await Promise.all(adminIds.map(id => ctx.db.get(id!)));
    const adminMap = new Map(admins.filter(a => a).map(a => [a!._id, a!]));

    return flags.map((f) => {
      if (!f.updatedBy) return { ...f, updatedByName: "System" };
      return { 
        ...f, 
        updatedByName: adminMap.get(f.updatedBy)?.name || "Unknown" 
      };
    });
  },
});

export const toggleFeatureFlag = mutation({
  args: { key: v.string(), value: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");

    const existing = await ctx.db
      .query("featureFlags")
      .filter((q) => q.eq(q.field("key"), args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedBy: admin._id,
        updatedAt: Date.now(),
      });
    } else {
      // Create new flag if doesn't exist
      await ctx.db.insert("featureFlags", {
        key: args.key,
        value: args.value,
        description: "",
        updatedBy: admin._id,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "toggle_feature_flag",
      targetType: "featureFlag",
      targetId: args.key,
      details: `Toggled ${args.key} to ${args.value}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

export const getAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "manage_announcements");
    // P1 Fix: Use take(100) instead of collect()
    return await ctx.db.query("announcements").order("desc").take(100);
  },
});

export const createAnnouncement = mutation({
  args: { title: v.string(), body: v.string(), type: v.string() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_announcements");

    if (!args.title || !args.body) {
      throw new Error("Title and body are required");
    }

    // P0 Fix: XSS Sanitization & Length Validation
    if (args.title.length > 200) throw new Error("Title exceeds 200 characters");
    if (args.body.length > 5000) throw new Error("Body exceeds 5000 characters");

    const sanitizedTitle = sanitizeHtml(args.title);
    const sanitizedBody = sanitizeHtml(args.body);

    const announcementId = await ctx.db.insert("announcements", {
      title: sanitizedTitle,
      body: sanitizedBody,
      type: args.type as "info" | "warning" | "promo",
      active: true,
      createdBy: admin._id,
      createdAt: Date.now(),
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "create_announcement",
      targetType: "announcement",
      targetId: announcementId,
      details: `Created announcement: ${sanitizedTitle}`,
      createdAt: Date.now(),
    });

    return { success: true, id: announcementId };
  },
});

export const updateAnnouncement = mutation({
  args: {
    announcementId: v.id("announcements"),
    title: v.string(),
    body: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_announcements");

    if (!args.title || !args.body) {
      throw new Error("Title and body are required");
    }

    // P0 Fix: XSS Sanitization & Length Validation
    if (args.title.length > 200) throw new Error("Title exceeds 200 characters");
    if (args.body.length > 5000) throw new Error("Body exceeds 5000 characters");

    const sanitizedTitle = sanitizeHtml(args.title);
    const sanitizedBody = sanitizeHtml(args.body);

    await ctx.db.patch(args.announcementId, {
      title: sanitizedTitle,
      body: sanitizedBody,
      type: args.type as "info" | "warning" | "promo",
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "update_announcement",
      targetType: "announcement",
      targetId: args.announcementId,
      details: `Updated announcement: ${sanitizedTitle}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const toggleAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_announcements");

    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) throw new Error("Announcement not found");

    await ctx.db.patch(args.announcementId, {
      active: !announcement.active,
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "toggle_announcement",
      targetType: "announcement",
      targetId: args.announcementId,
      details: `Toggled announcement ${announcement.active ? "off" : "on"}: ${announcement.title}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// PRICING CONFIG
// ============================================================================

export const getPricingConfig = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "manage_pricing");
    return await ctx.db.query("pricingConfig").collect();
  },
});

export const updatePricing = mutation({
  args: { 
    planId: v.string(), 
    priceAmount: v.optional(v.number()), 
    displayName: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    region: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_pricing");

    // Find if a config exists for this plan AND region
    let existing;
    const configs = await ctx.db
      .query("pricingConfig")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();
      
    existing = configs.find(c => c.region === args.region);

    const updates: any = { updatedAt: Date.now() };
    if (args.priceAmount !== undefined) {
      if (args.priceAmount <= 0) throw new Error("Price must be positive");
      if (args.priceAmount > 10000) throw new Error("Price exceeds maximum (£10,000)");
      updates.priceAmount = args.priceAmount;
    }
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      // Create new regional override
      if (args.priceAmount === undefined || !args.displayName) {
        throw new Error("Price and display name are required for new regional overrides");
      }
      await ctx.db.insert("pricingConfig", {
        planId: args.planId,
        priceAmount: args.priceAmount,
        displayName: args.displayName,
        isActive: args.isActive ?? true,
        region: args.region,
        currency: "GBP",
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "update_pricing",
      targetType: "pricingConfig",
      targetId: args.planId,
      details: `Updated ${args.planId} ${args.region ? `(Region: ${args.region})` : '(Global)'}: ${Object.keys(updates).join(", ")}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const togglePricingPlan = mutation({
  args: { planId: v.string() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_pricing");
    const existing = await ctx.db.query("pricingConfig").withIndex("by_plan", q => q.eq("planId", args.planId)).first();
    if (!existing) throw new Error("Plan not found");
    
    const newStatus = !existing.isActive;
    await ctx.db.patch(existing._id, { isActive: newStatus, updatedAt: Date.now() });
    
    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "toggle_pricing_plan",
      targetType: "pricingConfig",
      targetId: args.planId,
      details: `${newStatus ? "Enabled" : "Disabled"} plan ${args.planId}`,
      createdAt: Date.now(),
    });
    return { success: true, isActive: newStatus };
  },
});

// ============================================================================
// WEBHOOK MANAGEMENT (Phase 4.1)
// ============================================================================

export const getWebhooks = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "manage_flags"); // Reuse flag permission for now
    return await ctx.db.query("webhooks").order("desc").collect();
  },
});

export const createWebhook = mutation({
  args: {
    url: v.string(),
    description: v.optional(v.string()),
    events: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");
    
    // Generate a signing secret
    const secret = "whsec_" + Math.random().toString(36).substring(2, 15);
    
    const webhookId = await ctx.db.insert("webhooks", {
      url: args.url,
      secret,
      description: args.description,
      events: args.events,
      isEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: admin._id,
    });
    
    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "create_webhook",
      targetType: "webhook",
      targetId: webhookId,
      details: `Created webhook for ${args.url}`,
      createdAt: Date.now(),
    });
    
    return webhookId;
  },
});

export const toggleWebhook = mutation({
  args: { id: v.id("webhooks") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");
    const webhook = await ctx.db.get(args.id);
    if (!webhook) throw new Error("Webhook not found");
    
    const newStatus = !webhook.isEnabled;
    await ctx.db.patch(args.id, { isEnabled: newStatus, updatedAt: Date.now() });
    
    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "toggle_webhook",
      targetType: "webhook",
      targetId: args.id,
      details: `${newStatus ? "Enabled" : "Disabled"} webhook ${webhook.url}`,
      createdAt: Date.now(),
    });
    
    return { success: true, isEnabled: newStatus };
  },
});

export const deleteWebhook = mutation({
  args: { id: v.id("webhooks") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");
    const webhook = await ctx.db.get(args.id);
    if (!webhook) throw new Error("Webhook not found");
    
    await ctx.db.delete(args.id);
    
    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "delete_webhook",
      targetType: "webhook",
      targetId: args.id,
      details: `Deleted webhook ${webhook.url}`,
      createdAt: Date.now(),
    });
    
    return { success: true };
  },
});

export const getActiveImpersonationToken = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // 1. Find a token that is used and not expired for this user
    const token = await ctx.db
      .query("impersonationTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.neq(q.field("usedAt"), undefined),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    if (!token) return null;

    // 2. Fetch admin name for display
    const admin = await ctx.db.get(token.createdBy);
    
    return {
      tokenValue: token.tokenValue,
      createdBy: token.createdBy,
      adminName: admin?.name || "Admin",
      expiresAt: token.expiresAt,
    };
  },
});

export const stopImpersonation = mutation({
  args: { tokenValue: v.string() },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("impersonationTokens")
      .withIndex("by_token", (q) => q.eq("tokenValue", args.tokenValue))
      .unique();

    if (token) {
      // Force expire the token
      await ctx.db.patch(token._id, { expiresAt: Date.now() - 1 });
      
      // Log the end of impersonation
      await ctx.db.insert("adminLogs", {
        adminUserId: token.createdBy,
        action: "stop_impersonation",
        targetType: "user",
        targetId: token.userId,
        details: `Stopped impersonation of user ${token.userId}`,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const getDashboardPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const prefs = await ctx.db
      .query("adminDashboardPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!prefs) {
      // Return default configuration
      return {
        overviewWidgets: [
          { id: "health", visible: true, order: 0 },
          { id: "analytics", visible: true, order: 1 },
          { id: "revenue", visible: true, order: 2 },
          { id: "audit_logs", visible: true, order: 3 },
        ],
      };
    }

    return prefs;
  },
});

export const updateDashboardPreferences = mutation({
  args: {
    overviewWidgets: v.array(v.object({
      id: v.string(),
      visible: v.boolean(),
      order: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    
    const existing = await ctx.db
      .query("adminDashboardPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        overviewWidgets: args.overviewWidgets,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("adminDashboardPreferences", {
        userId: user._id,
        overviewWidgets: args.overviewWidgets,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const testWebhook = action({
  args: { id: v.id("webhooks") },
  handler: async (ctx, args) => {
    // For now, this just updates the lastTriggeredAt field
    // In a real implementation, it would send a POST request
    await ctx.runMutation(internal.admin.updateWebhookTrigger, { id: args.id, status: 200 });
    return { success: true };
  },
});

export const updateWebhookTrigger = internalMutation({
  args: { id: v.id("webhooks"), status: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lastTriggeredAt: Date.now(),
      lastResponseStatus: args.status,
    });
  },
});

// ============================================================================
// ADVANCED FILTERING (Phase 4.2)
// ============================================================================

export const getSavedFilters = query({
  args: { tab: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || !user.isAdmin) return [];
    
    return await ctx.db
      .query("savedFilters")
      .withIndex("by_admin_tab", q => q.eq("adminUserId", user._id).eq("tab", args.tab))
      .collect();
  },
});

export const saveFilter = mutation({
  args: { name: v.string(), tab: v.string(), filterData: v.any() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "view_analytics");
    
    return await ctx.db.insert("savedFilters", {
      adminUserId: admin._id,
      name: args.name,
      tab: args.tab,
      filterData: args.filterData,
      createdAt: Date.now(),
    });
  },
});

export const deleteSavedFilter = mutation({
  args: { id: v.id("savedFilters") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "view_analytics");
    const existing = await ctx.db.get(args.id);
    if (existing && existing.adminUserId === admin._id) {
      await ctx.db.delete(args.id);
    }
    return { success: true };
  },
});

// ============================================================================
// CATALOG MANAGEMENT
// ============================================================================

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "manage_catalog");

    // P1 Fix: Avoid full table scan by taking most recent 5000 items
    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_created")
      .order("desc")
      .take(5000);

    // Count items by category
    const categoryMap = new Map<string, number>();
    for (const item of items) {
      const cat = item.category || "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    }

    // Convert to array and sort
    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category));
  },
});

export const getDuplicateStores = query({
  args: { bustCache: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "manage_catalog");

    // P1 Fix: Avoid full table scan by taking most recent 5000 price records
    const prices = await ctx.db
      .query("currentPrices")
      .withIndex("by_updated")
      .order("desc")
      .take(5000);

    const storeMap = new Map<string, string[]>();

    for (const price of prices) {
      if (!price.storeName) continue;

      const normalized = price.storeName.toLowerCase().trim();
      if (!storeMap.has(normalized)) {
        storeMap.set(normalized, []);
      }
      if (!storeMap.get(normalized)!.includes(price.storeName)) {
        storeMap.get(normalized)!.push(price.storeName);
      }
    }

    // Find groups with duplicates (different casings)
    const duplicates = Array.from(storeMap.entries())
      .filter(([_, variants]) => variants.length > 1)
      .map(([normalized, variants]) => ({
        normalized,
        variants: variants.sort(),
        canonical: variants[0], // Use first alphabetically as canonical
        count: variants.length,
      }));

    return duplicates;
  },
});

export const mergeStoreNames = mutation({
  args: { fromNames: v.array(v.string()), toName: v.string() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_catalog");
    
    if (args.fromNames.length === 0) {
      throw new Error("No store names provided to merge");
    }

    if (!args.toName) {
      throw new Error("Target store name is required");
    }

    let updatedCount = 0;

    // P1 Fix: Use index for currentPrices to avoid full table scan
    for (const fromName of args.fromNames) {
      const prices = await ctx.db
        .query("currentPrices")
        .withIndex("by_store", q => q.eq("storeName", fromName))
        .collect();
        
      for (const price of prices) {
        await ctx.db.patch(price._id, { storeName: args.toName });
        updatedCount++;
      }
    }

    // P1 Fix: Use index for priceHistory to avoid full table scan
    // (We should have added by_store to priceHistory earlier - verify schema)
    for (const fromName of args.fromNames) {
      // Use existing index if available, or just filter
      const history = await ctx.db
        .query("priceHistory")
        .withIndex("by_store", q => q.eq("storeName", fromName))
        .collect();
        
      for (const h of history) {
        await ctx.db.patch(h._id, { storeName: args.toName });
        updatedCount++;
      }
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "merge_stores",
      targetType: "stores",
      details: `Merged ${args.fromNames.join(", ")} → ${args.toName} (${updatedCount} records)`,
      createdAt: Date.now(),
    });

    return { success: true, updatedCount };
  },
});
/**
 * Export data to CSV
 * Generates a CSV string for the requested data type
 */
export const exportDataToCSV = action({
  args: { dataType: v.union(v.literal("users"), v.literal("receipts"), v.literal("prices"), v.literal("analytics")) },
  handler: async (ctx, args) => {
    // For simplicity, we use runQuery to get the data
    // In a real high-volume app, we might want to stream this or use a more efficient approach
    
    let csv = "";
    
    if (args.dataType === "users") {
      const users = await ctx.runQuery(api.admin.searchUsers, { searchTerm: "" });
      csv = "ID,Name,Email,IsAdmin,Suspended,CreatedAt\n";
      for (const u of users) {
        csv += `${u._id},"${u.name || ""}",${u.email || ""},${!!u.isAdmin},${!!u.suspended},${new Date(u.createdAt).toISOString()}\n`;
      }
    } else if (args.dataType === "receipts") {
      const receipts = await ctx.runQuery(api.admin.getRecentReceipts, { limit: 1000 });
      csv = "ID,Store,Total,User,Status,Date\n";
      for (const r of receipts) {
        csv += `${r._id},"${r.storeName}",${r.total},"${r.userName}",${r.processingStatus},${new Date(r.purchaseDate || Date.now()).toISOString()}\n`;
      }
    } else if (args.dataType === "prices") {
      // Get all prices
      const prices = await ctx.runQuery(api.admin.getRecentReceipts, { limit: 5000 }); // Placeholder
      // ... more complex logic for prices would go here
      csv = "Item,Store,UnitPrice,LastSeen\n";
    } else if (args.dataType === "analytics") {
      const funnel = await ctx.runQuery(api.admin.getFunnelAnalytics, {});
      csv = "Step,Count,Percentage\n";
      for (const f of funnel) {
        csv += `${f.step},${f.count},${f.percentage.toFixed(2)}%\n`;
      }
    }
    
    return { csv, fileName: `oja_export_${args.dataType}_${Date.now()}.csv` };
  },
});

/**
 * Clear all seed/placeholder data from the system
 * Removes placeholder receipts, test data, and resets demo content
 * OPTIMIZED: Uses batch processing to avoid full table scans
 */
export const clearSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requirePermission(ctx, "manage_catalog");

    let deletedReceipts = 0;
    let deletedPrices = 0;
    let deletedPriceHistory = 0;

    // Delete seed receipts in batches (process 100 at a time to avoid timeouts)
    let hasMoreReceipts = true;
    while (hasMoreReceipts) {
      const receipts = await ctx.db.query("receipts").take(100);
      if (receipts.length === 0) {
        hasMoreReceipts = false;
        break;
      }

      for (const receipt of receipts) {
        const isSeedFlag = !!receipt.isAdminSeed;
        const isDummyId = receipt.imageStorageId && (
          receipt.imageStorageId.startsWith("placeholder") ||
          receipt.imageStorageId.startsWith("seed") ||
          !receipt.imageStorageId.includes("_")
        );

        if (isSeedFlag || isDummyId) {
          await ctx.db.delete(receipt._id);
          deletedReceipts++;
        }
      }

      // If we got less than 100, we've processed all
      if (receipts.length < 100) hasMoreReceipts = false;
    }

    // Delete seed prices in batches (process 100 at a time)
    let hasMorePrices = true;
    while (hasMorePrices) {
      const prices = await ctx.db.query("currentPrices").take(100);
      if (prices.length === 0) {
        hasMorePrices = false;
        break;
      }

      for (const price of prices) {
        // Remove prices that are exactly 0, or have "seed"/"test" in item name
        const isSeedPrice =
          price.unitPrice === 0 ||
          (price.itemName && (
            price.itemName.toLowerCase().includes("seed") ||
            price.itemName.toLowerCase().includes("test") ||
            price.itemName.toLowerCase().includes("placeholder")
          ));

        if (isSeedPrice) {
          await ctx.db.delete(price._id);
          deletedPrices++;
        }
      }

      if (prices.length < 100) hasMorePrices = false;
    }

    // Delete seed price history in batches (process 100 at a time)
    let hasMoreHistory = true;
    while (hasMoreHistory) {
      const history = await ctx.db.query("priceHistory").take(100);
      if (history.length === 0) {
        hasMoreHistory = false;
        break;
      }

      for (const h of history) {
        const isSeedHistory =
          h.price === 0 ||
          (h.itemName && (
            h.itemName.toLowerCase().includes("seed") ||
            h.itemName.toLowerCase().includes("test") ||
            h.itemName.toLowerCase().includes("placeholder")
          ));

        if (isSeedHistory) {
          await ctx.db.delete(h._id);
          deletedPriceHistory++;
        }
      }

      if (history.length < 100) hasMoreHistory = false;
    }

    const now = Date.now();
    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "clear_seed_data",
      targetType: "system",
      details: `Cleared seed data: ${deletedReceipts} receipts, ${deletedPrices} prices, ${deletedPriceHistory} price history records`,
      createdAt: now,
    });

    return {
      success: true,
      message: `Cleared ${deletedReceipts} seed receipts, ${deletedPrices} seed prices, ${deletedPriceHistory} seed price history records`,
      deletedReceipts,
      deletedPrices,
      deletedPriceHistory,
    };
  },
});

// ============================================================================
// WORKFLOW MANAGEMENT
// ============================================================================

export const toggleWorkflow = mutation({
  args: { workflowId: v.id("automationWorkflows") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) throw new Error("Workflow not found");

    await ctx.db.patch(args.workflowId, {
      isEnabled: !workflow.isEnabled,
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "toggle_workflow",
      targetType: "workflow",
      targetId: args.workflowId,
      details: `${workflow.isEnabled ? "Disabled" : "Enabled"} workflow: ${workflow.name}`,
      createdAt: Date.now(),
    });

    return { success: true, isEnabled: !workflow.isEnabled };
  },
});

// ============================================================================
// EXPERIMENT MANAGEMENT
// ============================================================================

export const createExperiment = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    goalEvent: v.string(),
    variants: v.array(v.object({
      name: v.string(),
      allocationPercent: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");

    if (!args.name || !args.goalEvent) {
      throw new Error("Name and goal event are required");
    }

    if (args.variants.length < 2) {
      throw new Error("At least 2 variants are required");
    }

    // Validate allocation percentages sum to 100
    const totalAllocation = args.variants.reduce((sum, v) => sum + v.allocationPercent, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error("Variant allocations must sum to 100%");
    }

    const now = Date.now();

    const experimentId = await ctx.db.insert("experiments", {
      name: args.name,
      description: args.description,
      goalEvent: args.goalEvent,
      status: "draft",
      startDate: now,
      createdBy: admin._id,
      createdAt: now,
    });

    // Create variant records
    for (const variant of args.variants) {
      await ctx.db.insert("experimentVariants", {
        experimentId,
        variantName: variant.name,
        allocationPercent: variant.allocationPercent,
      });
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "create_experiment",
      targetType: "experiment",
      targetId: experimentId,
      details: `Created experiment: ${args.name} with ${args.variants.length} variants`,
      createdAt: now,
    });

    return { success: true, experimentId };
  },
});

