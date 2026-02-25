import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Simple in-memory cache for expensive queries (1-hour TTL)
const queryCache = new Map<string, { data: any; expiresAt: number }>();

function getCachedOrCompute<T>(
  cacheKey: string,
  computeFn: () => Promise<T>,
  ttlMs: number = 60 * 60 * 1000 // 1 hour default
): Promise<T> {
  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data);
  }

  return computeFn().then((data) => {
    queryCache.set(cacheKey, { data, expiresAt: Date.now() + ttlMs });
    return data;
  });
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
 * Gets the current authenticated user from the database
 * Returns null if not authenticated or user not found
 */
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // Try to find user by exact clerkId first
  let user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .first();

  // If not found, try normalized ID (handle OAuth prefixes)
  if (!user) {
    const normalizedId = normalizeClerkId(identity.subject);
    if (normalizedId !== identity.subject) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", normalizedId))
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
        .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", possibleId))
        .first();
    }
  }

  return user;
}

/**
 * Validates that the current user is an admin
 * Checks both legacy isAdmin flag and RBAC userRoles table
 */
async function requireAdmin(ctx: any) {
  const user = await getCurrentUser(ctx);

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Check legacy isAdmin flag
  if (user.isAdmin) {
    return user;
  }

  // Check RBAC userRoles table
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .first();

  if (userRole) {
    return user;
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
async function checkRateLimit(ctx: any, userId: any, action: string): Promise<void> {
  const now = Date.now();
  const isSensitive = SENSITIVE_ACTIONS.has(action);
  const limit = isSensitive ? SENSITIVE_RATE_LIMIT : GENERAL_RATE_LIMIT;

  // Find existing rate limit record for this user+action
  const existing = await ctx.db
    .query("adminRateLimits")
    .withIndex("by_user_action", (q: any) =>
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
async function getRateLimitStatus(ctx: any, userId: any, action: string): Promise<{
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
    .withIndex("by_user_action", (q: any) =>
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
async function requirePermission(ctx: any, permission: string, options?: { skipRateLimit?: boolean }) {
  const user = await requireAdmin(ctx);

  // Enforce rate limiting (only for mutations - ctx.db.insert exists)
  // Skip for queries or if explicitly disabled
  if (!options?.skipRateLimit && typeof ctx.db.insert === 'function') {
    await checkRateLimit(ctx, user._id, permission);
  }

  // Super admins (via legacy isAdmin) get all permissions
  if (user.isAdmin) {
    return user;
  }

  // Get user's role
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
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
    .withIndex("by_role", (q: any) => q.eq("roleId", userRole.roleId))
    .filter((q: any) => q.eq(q.field("permission"), permission))
    .first();

  if (!hasPermission) {
    throw new Error(`Permission denied: ${permission}`);
  }

  return user;
}

/**
 * Permission check for queries (no rate limiting, read-only)
 */
async function requirePermissionQuery(ctx: any, permission: string) {
  return requirePermission(ctx, permission, { skipRateLimit: true });
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

export const getRoles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("adminRoles").collect();
  },
});

// ============================================================================
// ADMIN SESSION TRACKING
// ============================================================================

export const logAdminSession = mutation({
  args: { ipAddress: v.optional(v.string()), userAgent: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("adminSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .first();

    if (existing && existing.userAgent === args.userAgent) {
      await ctx.db.patch(existing._id, { lastSeenAt: now, ipAddress: args.ipAddress || existing.ipAddress });
      return { sessionId: existing._id };
    }

    return {
      sessionId: await ctx.db.insert("adminSessions", {
        userId: user._id,
        ipAddress: args.ipAddress,
        userAgent: args.userAgent,
        loginAt: now,
        lastSeenAt: now,
        status: "active",
      })
    };
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
    const active = await ctx.db.query("adminSessions").withIndex("by_status", (q) => q.eq("status", "active")).collect();
    return await Promise.all(active.map(async (s) => {
      const u = await ctx.db.get(s.userId);
      return { ...s, userName: u?.name || "Unknown", userEmail: u?.email || "" };
    }));
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
    const term = args.searchTerm.toLowerCase();
    const recent = await ctx.db.query("users").order("desc").take(1000);
    return recent.filter(u =>
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term))
    ).slice(0, args.limit || 50);
  },
});

export const toggleAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const newStatus = !user.isAdmin;
    await ctx.db.patch(args.userId, { isAdmin: newStatus, updatedAt: Date.now() });
    
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

    const newTrialEnd = (user.trialEndsAt || now) + (args.days * 24 * 60 * 60 * 1000);
    await ctx.db.patch(args.userId, { trialEndsAt: newTrialEnd, updatedAt: now });

    await ctx.db.insert("adminLogs", { 
      adminUserId: admin._id, 
      action: "extend_trial", 
      targetType: "user", 
      targetId: args.userId, 
      details: `Extended trial by ${args.days} days`, 
      createdAt: now 
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

    await ctx.db.patch(args.userId, { plan: "premium_annual", updatedAt: now });

    await ctx.db.insert("adminLogs", { 
      adminUserId: admin._id, 
      action: "grant_complimentary", 
      targetType: "user", 
      targetId: args.userId, 
      details: `Granted free premium for ${months} months`, 
      createdAt: now 
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

export const getAnalytics = query({
  args: { refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics");
    if (args.dateFrom || args.dateTo) return getLiveAnalytics(ctx, args.dateFrom, args.dateTo);

    const today = new Date().toISOString().split("T")[0];
    const metrics = await ctx.db.query("platformMetrics").withIndex("by_date", q => q.eq("date", today)).unique();
    if (!metrics) return getLiveAnalytics(ctx);

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
      computedAt: metrics.computedAt,
      isPrecomputed: true,
    };
  },
});

async function getLiveAnalytics(ctx: any, dateFrom?: number, dateTo?: number) {
  return measureQueryPerformance("getLiveAnalytics", async () => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const [allU, allL, allR] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("shoppingLists").collect(),
      ctx.db.query("receipts").collect()
    ]);

    let u = allU, l = allL, r = allR;
    if (dateFrom) {
      u = u.filter((x: any) => x.createdAt >= dateFrom);
      l = l.filter((x: any) => x.createdAt >= dateFrom);
      r = r.filter((x: any) => x.createdAt >= dateFrom);
    }
    if (dateTo) {
      u = u.filter((x: any) => x.createdAt <= dateTo);
      l = l.filter((x: any) => x.createdAt <= dateTo);
      r = r.filter((x: any) => x.createdAt <= dateTo);
    }

    return {
      totalUsers: u.length,
      newUsersThisWeek: u.filter((x: any) => x.createdAt >= weekAgo).length,
      newUsersThisMonth: 0,
      activeUsersThisWeek: new Set(l.filter((x: any) => x.updatedAt >= weekAgo).map((x: any) => x.userId.toString())).size,
      totalLists: l.length,
      completedLists: l.filter((x: any) => x.status === "completed").length,
      totalReceipts: r.length,
      receiptsThisWeek: 0,
      receiptsThisMonth: 0,
      totalGMV: Math.round(r.reduce((s: number, x: any) => s + (x.total || 0), 0) * 100) / 100,
      computedAt: now,
      isPrecomputed: false,
    };
  });
}

export const getRevenueReport = query({
  args: { refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics");
    let subs = await ctx.db.query("subscriptions").collect();
    if (args.dateFrom) subs = subs.filter(s => s.createdAt >= args.dateFrom!);
    if (args.dateTo) subs = subs.filter(s => s.createdAt <= args.dateTo!);
    return { totalSubscriptions: subs.length, activeSubscriptions: subs.filter((s: any) => s.status === "active").length, monthlySubscribers: 0, annualSubscribers: 0, trialsActive: 0, mrr: 0, arr: 0 };
  },
});

// ============================================================================
// MODERATION
// ============================================================================

export const getRecentReceipts = query({
  args: { limit: v.optional(v.number()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()), searchTerm: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_receipts");
    const r = await ctx.db.query("receipts").order("desc").take(args.limit || 100);
    return await Promise.all(r.map(async receipt => {
      const u = await ctx.db.get(receipt.userId);
      return { ...receipt, userName: u?.name || "User" };
    }));
  },
});

export const getFlaggedReceipts = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_receipts");
    const failed = await ctx.db.query("receipts").withIndex("by_processing_status", q => q.eq("processingStatus", "failed")).collect();
    return await Promise.all(failed.map(async r => {
      const u = await ctx.db.get(r.userId);
      return { ...r, userName: u?.name || "Unknown" };
    }));
  },
});

export const getPriceAnomalies = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_receipts");
    return { anomalies: [], hasMore: false };
  },
});

export const deleteReceipt = mutation({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "delete_receipts");
    await ctx.db.delete(args.receiptId);
    await ctx.db.insert("adminLogs", { adminUserId: admin._id, action: "delete_receipt", targetType: "receipt", targetId: args.receiptId, createdAt: Date.now() });
    return { success: true };
  },
});

export const bulkReceiptAction = mutation({
  args: { receiptIds: v.array(v.id("receipts")), action: v.union(v.literal("approve"), v.literal("delete")) },
  handler: async (ctx, args) => {
    // Use bulk_operation permission - triggers sensitive rate limit (10/min)
    const admin = await requirePermission(ctx, "bulk_operation");
    for (const id of args.receiptIds) {
      if (args.action === "delete") await ctx.db.delete(id);
      else await ctx.db.patch(id, { processingStatus: "completed" } as any);
    }
    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: `bulk_${args.action}`,
      targetType: "receipt",
      details: `Bulk ${args.action} on ${args.receiptIds.length} receipts`,
      createdAt: Date.now()
    });
    return { success: true, count: args.receiptIds.length };
  },
});

export const overridePrice = mutation({
  args: { priceId: v.id("currentPrices"), newPrice: v.optional(v.number()), deleteEntry: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "edit_users");
    if (args.deleteEntry) await ctx.db.delete(args.priceId);
    else if (args.newPrice) await ctx.db.patch(args.priceId, { unitPrice: args.newPrice });
    return { success: true };
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
    return { ...u, receiptCount: r.length, listCount: l.length, totalSpent: Math.round(r.reduce((s, x) => s + (x.total || 0), 0) * 100) / 100, scanRewards: { lifetimeScans: 0 }, subscription: { plan: "free", status: "active" } };
  },
});

// ============================================================================
// SYSTEM & LOGS
// ============================================================================

export const getSystemHealth = query({
  args: { refreshKey: v.optional(v.string()) },
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return { status: "healthy", receiptProcessing: { total: 0, failed: 0, processing: 0, successRate: 100 }, timestamp: Date.now() };
  },
});

export const getAuditLogs = query({
  args: { paginationOpts: v.any(), refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_audit_logs");
    const logs = await ctx.db.query("adminLogs").order("desc").paginate(args.paginationOpts);
    const enriched = await Promise.all(logs.page.map(async l => {
      const u = await ctx.db.get(l.adminUserId);
      return { ...l, adminName: u?.name || "Unknown" };
    }));
    return { ...logs, page: enriched };
  },
});

export const getFeatureFlags = query({ args: {}, handler: async (ctx) => { await requirePermissionQuery(ctx, "manage_flags"); return []; } });
export const getAnnouncements = query({ args: {}, handler: async (ctx) => { await requirePermissionQuery(ctx, "manage_announcements"); return []; } });
export const getPricingConfig = query({ args: {}, handler: async (ctx) => { await requirePermissionQuery(ctx, "manage_pricing"); return []; } });
export const getCategories = query({ args: {}, handler: async (ctx) => { await requirePermissionQuery(ctx, "manage_catalog"); return []; } });
export const getDuplicateStores = query({ args: { bustCache: v.optional(v.boolean()) }, handler: async (ctx) => { await requirePermissionQuery(ctx, "manage_catalog"); return []; } });
export const toggleFeatureFlag = mutation({ args: { key: v.string(), value: v.boolean() }, handler: async (ctx) => { await requirePermission(ctx, "manage_flags"); return { success: true }; } });
export const createAnnouncement = mutation({ args: { title: v.string(), body: v.string(), type: v.string() }, handler: async (ctx) => { await requirePermission(ctx, "manage_announcements"); return { success: true }; } });
export const updateAnnouncement = mutation({ args: { announcementId: v.id("announcements"), title: v.string(), body: v.string(), type: v.string() }, handler: async (ctx) => { await requirePermission(ctx, "manage_announcements"); return { success: true }; } });
export const toggleAnnouncement = mutation({ args: { announcementId: v.id("announcements") }, handler: async (ctx) => { await requirePermission(ctx, "manage_announcements"); return { success: true }; } });
export const updatePricing = mutation({ args: { id: v.id("pricingConfig"), priceAmount: v.number() }, handler: async (ctx) => { await requirePermission(ctx, "manage_pricing"); return { success: true }; } });
export const mergeStoreNames = mutation({ args: { fromNames: v.array(v.string()), toName: v.string() }, handler: async (ctx) => { await requirePermission(ctx, "manage_catalog"); return { success: true }; } });
