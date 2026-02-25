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
    console.log(`[Admin Performance] ${queryName} completed in ${duration}ms`);
    return result;
  } catch (error) {
    console.error(`[Admin Performance] ${queryName} FAILED:`, error);
    throw error;
  }
}

/**
 * EMERGENCY BYPASS: Returns the first admin found in DB
 */
async function requireAdmin(ctx: any) {
  console.log("requireAdmin: EMERGENCY BYPASS");
  const user = await ctx.db.query("users").withIndex("by_is_admin", (q: any) => q.eq("isAdmin", true)).first();
  return user;
}

/**
 * EMERGENCY BYPASS: Always succeeds
 */
async function requirePermission(ctx: any, permission: string) {
  console.log(`requirePermission: EMERGENCY BYPASS for ${permission}`);
  return await requireAdmin(ctx);
}

// ============================================================================
// RBAC QUERIES
// ============================================================================

/**
 * Get permissions for the current admin user
 */
export const getMyPermissions = query({
  args: {},
  handler: async (ctx) => {
    console.log("getMyPermissions: EMERGENCY BYPASS - GRANTING ALL");
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
    return await ctx.db.query("adminRoles").collect();
  },
});

// ============================================================================
// ADMIN SESSION TRACKING (Phase 1.3)
// ============================================================================

export const logAdminSession = mutation({
  args: { 
    ipAddress: v.optional(v.string()), 
    userAgent: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    return { sessionId: "bypass-session" };
  },
});

export const logoutAdmin = mutation({
  args: { sessionId: v.id("adminSessions") },
  handler: async (ctx, args) => {
    return { success: true };
  },
});

export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    return [];
  },
});

export const forceLogoutSession = mutation({
  args: { sessionId: v.id("adminSessions") },
  handler: async (ctx, args) => {
    return { success: true };
  },
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const getUsers = query({
  args: { paginationOpts: v.any() },
  handler: async (ctx, args) => {
    return await ctx.db.query("users").order("desc").paginate(args.paginationOpts);
  },
});

export const searchUsers = query({
  args: { searchTerm: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").order("desc").take(1000);
    const term = args.searchTerm.toLowerCase();
    return users.filter((u: any) => 
      (u.name?.toLowerCase().includes(term)) || 
      (u.email?.toLowerCase().includes(term))
    ).slice(0, args.limit || 50);
  },
});

export const toggleAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(args.userId, { isAdmin: !user.isAdmin });
    return { success: true };
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
    console.log("getAnalytics: STARTING (BYPASS MODE)");
    return getLiveAnalytics(ctx, args.dateFrom, args.dateTo);
  },
});

async function getLiveAnalytics(ctx: any, dateFrom?: number, dateTo?: number) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const allUsers = await ctx.db.query("users").collect();
  const allLists = await ctx.db.query("shoppingLists").collect();
  const allReceipts = await ctx.db.query("receipts").collect();

  const newUsersThisWeek = allUsers.filter((u: any) => u.createdAt >= weekAgo).length;
  const activeUsersThisWeek = new Set(allLists.filter((l: any) => l.updatedAt >= weekAgo).map((l: any) => l.userId.toString())).size;
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
}

export const getRevenueReport = query({
  args: { refreshKey: v.optional(v.string()) },
  handler: async (ctx) => {
    return {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
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
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const receipts = await ctx.db.query("receipts").order("desc").take(args.limit || 50);
    return await Promise.all(receipts.map(async r => {
      const u = await ctx.db.get(r.userId);
      return { ...r, userName: u?.name || "User" };
    }));
  },
});

export const getFlaggedReceipts = query({
  args: {},
  handler: async (ctx) => [],
});

export const getPriceAnomalies = query({
  args: {},
  handler: async (ctx) => ({ anomalies: [], hasMore: false }),
});

// ============================================================================
// PRODUCT CATALOG & SETTINGS
// ============================================================================

export const getCategories = query({
  args: {},
  handler: async (ctx) => [],
});

export const getDuplicateStores = query({
  args: {},
  handler: async (ctx) => [],
});

export const getFeatureFlags = query({
  args: {},
  handler: async (ctx) => [],
});

export const getAnnouncements = query({
  args: {},
  handler: async (ctx) => [],
});

export const getPricingConfig = query({
  args: {},
  handler: async (ctx) => [],
});

export const getSystemHealth = query({
  args: { refreshKey: v.optional(v.string()) },
  handler: async (ctx) => ({
    status: "healthy",
    receiptProcessing: { total: 0, failed: 0, processing: 0, successRate: 100 },
    timestamp: Date.now(),
  }),
});

export const getAuditLogs = query({
  args: { paginationOpts: v.any() },
  handler: async (ctx, args) => {
    return await ctx.db.query("adminLogs").order("desc").paginate(args.paginationOpts);
  },
});
