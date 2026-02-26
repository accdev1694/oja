import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

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

    const monthlyPrice = monthlyPricing?.priceAmount || 2.99; // Fallback for safety
    const annualPrice = annualPricing?.priceAmount || 21.99;

    // Get subscriptions
    let subs = await ctx.db.query("subscriptions").collect();
    if (args.dateFrom) subs = subs.filter(s => s.createdAt >= args.dateFrom!);
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
  },
});

export const getFinancialReport = query({
  args: { dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
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
    return await ctx.db.query("cohortMetrics").order("desc").collect();
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
    
    // Get all events
    const allEvents = await ctx.db.query("funnelEvents").collect();
    
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
    return await ctx.db.query("churnMetrics").order("desc").collect();
  },
});

export const getLTVMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db.query("ltvMetrics").order("desc").collect();
  },
});

export const getUserSegmentSummary = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    const segments = await ctx.db.query("userSegments").collect();
    
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

export const getAdminTickets = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_analytics"); // Support access
    
    let tickets;
    if (args.status) {
      tickets = await ctx.db
        .query("supportTickets")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .order("desc")
        .collect();
    } else {
      tickets = await ctx.db.query("supportTickets").order("desc").collect();
    }
    
    return await Promise.all(
      tickets.map(async (t) => {
        const u = await ctx.db.get(t.userId);
        return {
          ...t,
          userName: u?.name || "Unknown",
          userEmail: u?.email || "",
        };
      })
    );
  },
});

export const getAdminSupportSummary = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    const allTickets = await ctx.db.query("supportTickets").collect();
    const open = allTickets.filter(t => t.status === "open").length;
    const inProgress = allTickets.filter(t => t.status === "in_progress").length;
    const resolved = allTickets.filter(t => t.status === "resolved").length;
    
    return {
      total: allTickets.length,
      open,
      inProgress,
      resolved,
      unassigned: allTickets.filter(t => !t.assignedTo && t.status !== "resolved").length,
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
    return await ctx.db.query("automationWorkflows").collect();
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
  args: { limit: v.optional(v.number()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()), searchTerm: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_receipts");

    let receipts = [];

    // Apply date range filter using index if provided
    if (args.dateFrom || args.dateTo) {
      const allReceipts = await ctx.db.query("receipts").withIndex("by_created").order("desc").collect();
      receipts = allReceipts.filter(r => {
        if (args.dateFrom && r.createdAt < args.dateFrom) return false;
        if (args.dateTo && r.createdAt > args.dateTo) return false;
        return true;
      });
    } else if (args.status) {
      // Apply status filter using index
      const validStatus = args.status as "completed" | "pending" | "processing" | "failed";
      receipts = await ctx.db.query("receipts")
        .withIndex("by_processing_status", q => q.eq("processingStatus", validStatus))
        .order("desc")
        .collect();
    } else {
      // No filters - just get recent
      receipts = await ctx.db.query("receipts").order("desc").take(args.limit || 100);
    }

    // Enrich with user data
    const enriched = await Promise.all(receipts.map(async receipt => {
      const u = await ctx.db.get(receipt.userId);
      return {
        ...receipt,
        userName: u?.name || "User",
        userEmail: u?.email || ""
      };
    }));

    // Apply search term filter (after enrichment for user name/email search)
    let filtered = enriched;
    if (args.searchTerm && args.searchTerm.length >= 2) {
      const term = args.searchTerm.toLowerCase();
      filtered = enriched.filter(r =>
        r.storeName?.toLowerCase().includes(term) ||
        r.userName?.toLowerCase().includes(term) ||
        r.userEmail?.toLowerCase().includes(term)
      );
    }

    // Apply status filter if not using index
    if (args.status && !(args.dateFrom || args.dateTo)) {
      // Already filtered by index above
    } else if (args.status) {
      filtered = filtered.filter(r => r.processingStatus === args.status);
    }

    // Apply limit
    return filtered.slice(0, args.limit || 100);
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

    // Get most recent 5000 price records for performance
    const recentPrices = await ctx.db
      .query("currentPrices")
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
      if (args.action === "delete") {
        await ctx.db.delete(id);
      } else {
        // Type-safe: "completed" is a valid processingStatus literal
        await ctx.db.patch(id, {
          processingStatus: "completed" as "completed" | "pending" | "processing" | "failed",
        });
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

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const getFeatureFlags = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "manage_flags");
    const flags = await ctx.db.query("featureFlags").collect();
    // Enrich with updatedBy admin name
    return await Promise.all(flags.map(async (f) => {
      if (!f.updatedBy) return { ...f, updatedByName: "System" };
      const admin = await ctx.db.get(f.updatedBy);
      return { ...f, updatedByName: admin?.name || "Unknown" };
    }));
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
    return await ctx.db.query("announcements").order("desc").collect();
  },
});

export const createAnnouncement = mutation({
  args: { title: v.string(), body: v.string(), type: v.string() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_announcements");

    if (!args.title || !args.body) {
      throw new Error("Title and body are required");
    }

    const announcementId = await ctx.db.insert("announcements", {
      title: args.title,
      body: args.body,
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
      details: `Created announcement: ${args.title}`,
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

    await ctx.db.patch(args.announcementId, {
      title: args.title,
      body: args.body,
      type: args.type as "info" | "warning" | "promo",
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "update_announcement",
      targetType: "announcement",
      targetId: args.announcementId,
      details: `Updated announcement: ${args.title}`,
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
  args: { planId: v.string(), priceAmount: v.number() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_pricing");

    if (args.priceAmount <= 0) {
      throw new Error("Price must be positive");
    }

    if (args.priceAmount > 10000) {
      throw new Error("Price exceeds maximum (£10,000)");
    }

    const existing = await ctx.db
      .query("pricingConfig")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .first();

    if (!existing) {
      throw new Error(`Plan ${args.planId} not found`);
    }

    await ctx.db.patch(existing._id, {
      priceAmount: args.priceAmount,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "update_pricing",
      targetType: "pricingConfig",
      targetId: args.planId,
      details: `Updated ${args.planId} price to £${args.priceAmount}`,
      createdAt: Date.now(),
    });

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

    const items = await ctx.db.query("pantryItems").collect();

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

    // Get all unique store names from currentPrices
    const prices = await ctx.db.query("currentPrices").collect();

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

    // Update all currentPrices records
    const prices = await ctx.db.query("currentPrices").collect();
    let updatedCount = 0;

    for (const price of prices) {
      if (args.fromNames.includes(price.storeName)) {
        await ctx.db.patch(price._id, { storeName: args.toName });
        updatedCount++;
      }
    }

    // Also update priceHistory records
    const history = await ctx.db.query("priceHistory").collect();
    for (const h of history) {
      if (args.fromNames.includes(h.storeName)) {
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
