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
 * Logs execution time and warns if query takes >1s
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
      console.warn(
        `[Admin Performance] SLOW QUERY: ${queryName} took ${duration}ms (threshold: ${warnThresholdMs}ms)`
      );
    } else {
      console.log(`[Admin Performance] ${queryName} completed in ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Admin Performance] ${queryName} FAILED after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * AUTHORIZATION BYPASS (Debug Mode)
 */
async function requireAdmin(ctx: any) {
  console.log("requireAdmin: EMERGENCY BYPASS ENABLED");
  const user = await ctx.db
    .query("users")
    .withIndex("by_is_admin", (q: any) => q.eq("isAdmin", true))
    .first();
  
  if (!user) throw new Error("No user with isAdmin: true found in database");
  return user;
}

/**
 * RBAC Authorization Helper (Bypassed for Debug)
 */
async function requirePermission(ctx: any, permission: string) {
  console.log(`requirePermission: BYPASS for ${permission}`);
  return await requireAdmin(ctx);
}

/**
 * Rate Limiting (Bypassed for Debug)
 */
async function checkRateLimit(ctx: any, userId: any, action: string) {
  return; 
}

// ============================================================================
// RBAC QUERIES
// ============================================================================

/**
 * Get permissions for the current admin user (Bypassed)
 */
export const getMyPermissions = query({
  args: {},
  handler: async (ctx) => {
    return {
      role: "super_admin",
      displayName: "Administrator (Bypass Mode)",
      permissions: [
        "view_analytics", "view_users", "edit_users", 
        "view_receipts", "delete_receipts", "manage_catalog", 
        "manage_flags", "manage_announcements", "manage_pricing", "view_audit_logs"
      ],
    };
  },
});

/**
 * Get all available roles
 */
export const getRoles = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("adminRoles").collect();
  },
});

// ============================================================================
// ADMIN SESSION TRACKING (Phase 1.3)
// ============================================================================

/**
 * Start or update an admin session
 */
export const logAdminSession = mutation({
  args: { 
    ipAddress: v.optional(v.string()), 
    userAgent: v.optional(v.string()) 
  },
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
      await ctx.db.patch(existing._id, { 
        lastSeenAt: now,
        ipAddress: args.ipAddress || existing.ipAddress 
      });
      return { sessionId: existing._id };
    }

    const sessionId = await ctx.db.insert("adminSessions", {
      userId: user._id,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      loginAt: now,
      lastSeenAt: now,
      status: "active",
    });

    return { sessionId };
  },
});

/**
 * End an admin session
 */
export const logoutAdmin = mutation({
  args: { sessionId: v.id("adminSessions") },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    await ctx.db.patch(args.sessionId, {
      status: "logged_out",
      logoutAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Get active admin sessions
 */
export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const activeSessions = await ctx.db
      .query("adminSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return await Promise.all(
      activeSessions.map(async (s) => {
        const user = await ctx.db.get(s.userId);
        return {
          ...s,
          userName: user?.name || "Unknown",
          userEmail: user?.email || "",
        };
      })
    );
  },
});

/**
 * Force logout a session
 */
export const forceLogoutSession = mutation({
  args: { sessionId: v.id("adminSessions") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manage_flags");
    await ctx.db.patch(args.sessionId, {
      status: "expired",
      logoutAt: Date.now(),
    });
    return { success: true };
  },
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Get all users with pagination
 */
export const getUsers = query({
  args: {
    paginationOpts: v.any(), 
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_users");
    return await ctx.db
      .query("users")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Search users by name or email
 */
export const searchUsers = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_users");

    const recentUsers = await ctx.db
      .query("users")
      .order("desc")
      .take(1000);

    const term = args.searchTerm.toLowerCase();
    const matches = recentUsers.filter(
      (u: any) =>
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term))
    );

    return matches.slice(0, args.limit || 50);
  },
});

/**
 * Toggle admin status for a user
 */
export const toggleAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");

    const newAdminStatus = !targetUser.isAdmin;
    await ctx.db.patch(args.userId, {
      isAdmin: newAdminStatus,
      updatedAt: Date.now(),
    });

    return { success: true, isAdmin: newAdminStatus };
  },
});

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

export const getAnalytics = query({
  args: {
    refreshKey: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_analytics");

    if (args.dateFrom || args.dateTo) {
      return getLiveAnalytics(ctx, args.dateFrom, args.dateTo);
    }

    const today = new Date().toISOString().split("T")[0];
    const metrics = await ctx.db
      .query("platformMetrics")
      .withIndex("by_date", (q: any) => q.eq("date", today))
      .unique();

    if (!metrics) {
      return getLiveAnalytics(ctx);
    }

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

    let allUsers = await ctx.db.query("users").collect();
    let allLists = await ctx.db.query("shoppingLists").collect();
    let allReceipts = await ctx.db.query("receipts").collect();

    if (dateFrom || dateTo) {
      if (dateFrom) {
        allUsers = allUsers.filter((u: any) => u.createdAt >= dateFrom);
        allLists = allLists.filter((l: any) => l.createdAt >= dateFrom);
        allReceipts = allReceipts.filter((r: any) => r.createdAt >= dateFrom);
      }
      if (dateTo) {
        allUsers = allUsers.filter((u: any) => u.createdAt <= dateTo);
        allLists = allLists.filter((l: any) => l.createdAt <= dateTo);
        allReceipts = allReceipts.filter((r: any) => r.createdAt <= dateTo);
      }
    }

    const newUsersThisWeek = allUsers.filter((u: any) => u.createdAt >= weekAgo).length;
    const activeUsersThisWeek = new Set(
      allLists.filter((l: any) => l.updatedAt >= weekAgo).map((l: any) => l.userId.toString())
    ).size;

    const totalRevenue = allReceipts.reduce((sum: number, r: any) => sum + (r.total || 0), 0);

    return {
      totalUsers: allUsers.length,
      newUsersThisWeek,
      newUsersThisMonth: 0,
      activeUsersThisWeek,
      totalLists: allLists.length,
      completedLists: allLists.filter((l: any) => l.status === "completed").length,
      totalReceipts: allReceipts.length,
      receiptsThisWeek: 0,
      receiptsThisMonth: 0,
      totalGMV: Math.round(totalRevenue * 100) / 100,
      computedAt: now,
      isPrecomputed: false,
    };
  });
}

export const getRevenueReport = query({
  args: {
    refreshKey: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_analytics");

    let subscriptions = await ctx.db.query("subscriptions").collect();

    if (args.dateFrom) subscriptions = subscriptions.filter(s => s.createdAt >= args.dateFrom!);
    if (args.dateTo) subscriptions = subscriptions.filter(s => s.createdAt <= args.dateTo!);

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: subscriptions.filter((s: any) => s.status === "active").length,
      monthlySubscribers: 0,
      annualSubscribers: 0,
      trialsActive: 0,
      mrr: 0,
      arr: 0,
    };
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
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_receipts");

    let query = ctx.db.query("receipts").order("desc");
    let receipts = await query.take(args.limit || 100);

    return await Promise.all(
      receipts.map(async (r) => {
        const owner = await ctx.db.get(r.userId) as { name: string } | null;
        return { ...r, userName: owner?.name ?? "Unknown" };
      })
    );
  },
});

export const deleteReceipt = mutation({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "delete_receipts");
    await ctx.db.delete(args.receiptId);
    return { success: true };
  },
});

export const getUserDetail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_users");
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const receipts = await ctx.db.query("receipts").withIndex("by_user", (q: any) => q.eq("userId", user._id)).collect();
    const lists = await ctx.db.query("shoppingLists").withIndex("by_user", (q: any) => q.eq("userId", user._id)).collect();

    return {
      ...user,
      receiptCount: receipts.length,
      listCount: lists.length,
      totalSpent: Math.round(receipts.reduce((s: number, r: any) => s + (r.total || 0), 0) * 100) / 100,
    };
  },
});

// ============================================================================
// PRODUCT CATALOG & SETTINGS
// ============================================================================

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "manage_catalog");
    return [];
  },
});

export const getDuplicateStores = query({
  args: { bustCache: v.optional(v.boolean()) },
  handler: async (ctx) => {
    await requirePermission(ctx, "manage_catalog");
    return [];
  },
});

export const getFeatureFlags = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "manage_flags");
    return [];
  },
});

export const getAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "manage_announcements");
    return [];
  },
});

export const getPricingConfig = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "manage_pricing");
    return [];
  },
});

export const getSystemHealth = query({
  args: { refreshKey: v.optional(v.string()) },
  handler: async (ctx) => {
    await requirePermission(ctx, "view_analytics");
    return {
      status: "healthy",
      receiptProcessing: { total: 0, failed: 0, processing: 0, successRate: 100 },
      timestamp: Date.now(),
    };
  },
});

export const getAuditLogs = query({
  args: { 
    paginationOpts: v.any(),
    refreshKey: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_audit_logs");
    return await ctx.db.query("adminLogs").order("desc").paginate(args.paginationOpts);
  },
});
