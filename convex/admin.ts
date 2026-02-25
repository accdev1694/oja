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
 * Validates that the user is an admin
 */
async function requireAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  
  // Handle Clerk IDs that might come with a prefix
  const clerkId = identity.subject.includes("|") 
    ? identity.subject.split("|").pop()! 
    : identity.subject;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
    .unique();
    
  if (!user) throw new Error("User not found");
  if (!user.isAdmin) throw new Error("Admin access required");
  return user;
}

/**
 * RBAC Authorization Helper
 */
async function requirePermission(ctx: any, permission: string) {
  const user = await requireAdmin(ctx);

  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .unique();

  if (!userRole) {
    // Legacy fallback for isAdmin: true users
    if (user.isAdmin) {
      await checkRateLimit(ctx, user._id, permission);
      return user;
    }
    throw new Error("No admin role assigned");
  }

  const hasPermission = await ctx.db
    .query("rolePermissions")
    .withIndex("by_role", (q: any) => q.eq("roleId", userRole.roleId))
    .filter((q: any) => q.eq(q.field("permission"), permission))
    .unique();

  if (!hasPermission) throw new Error(`Missing permission: ${permission}`);

  await checkRateLimit(ctx, user._id, permission);
  return user;
}

/**
 * Enforce rate limits
 */
async function checkRateLimit(ctx: any, userId: any, action: string) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const windowStart = now - (now % windowMs);

  const SENSITIVE_PERMISSIONS = ["edit_users", "delete_receipts", "manage_pricing"];
  const limit = SENSITIVE_PERMISSIONS.includes(action) ? 10 : 100;

  const existing = await ctx.db
    .query("adminRateLimits")
    .withIndex("by_user_action", (q: any) => q.eq("userId", userId).eq("action", action))
    .unique();

  if (existing) {
    if (existing.windowStart === windowStart) {
      if (existing.count >= limit) throw new Error("Rate limit exceeded");
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.patch(existing._id, { count: 1, windowStart });
    }
  } else {
    await ctx.db.insert("adminRateLimits", { userId, action, count: 1, windowStart });
  }
}

// ============================================================================
// RBAC QUERIES
// ============================================================================

export const getMyPermissions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const clerkId = identity.subject.includes("|") 
      ? identity.subject.split("|").pop()! 
      : identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
      .unique();

    if (!user || !user.isAdmin) return null;

    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .unique();

    if (!userRole) {
      return {
        role: "super_admin",
        displayName: "Administrator (Legacy)",
        permissions: [
          "view_analytics", "view_users", "edit_users", 
          "view_receipts", "delete_receipts", "manage_catalog", 
          "manage_flags", "manage_announcements", "manage_pricing", "view_audit_logs"
        ],
      };
    }

    const role = await ctx.db.get(userRole.roleId);
    if (!role) return null;

    const permissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q: any) => q.eq("roleId", userRole.roleId))
      .collect();

    return {
      role: role.name,
      displayName: role.displayName,
      permissions: permissions.map((p) => p.permission),
    };
  },
});

export const getRoles = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
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
    await requirePermission(ctx, "view_users");
    return await ctx.db.query("users").order("desc").paginate(args.paginationOpts);
  },
});

export const searchUsers = query({
  args: { searchTerm: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_users");
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
    
    // Manage userRoles entry
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

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

export const getAnalytics = query({
  args: { refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_analytics");
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
    
    let uQ = ctx.db.query("users").collect();
    let lQ = ctx.db.query("shoppingLists").collect();
    let rQ = ctx.db.query("receipts").collect();
    
    let [allU, allL, allR] = await Promise.all([uQ, lQ, rQ]);

    if (dateFrom) {
      allU = allU.filter((u: any) => u.createdAt >= dateFrom);
      allL = allL.filter((l: any) => l.createdAt >= dateFrom);
      allR = allR.filter((r: any) => r.createdAt >= dateFrom);
    }
    if (dateTo) {
      allU = allU.filter((u: any) => u.createdAt <= dateTo);
      allL = allL.filter((l: any) => l.createdAt <= dateTo);
      allR = allR.filter((r: any) => r.createdAt <= dateTo);
    }

    const gmv = allR.reduce((s: number, r: any) => s + (r.total || 0), 0);

    return {
      totalUsers: allU.length,
      newUsersThisWeek: allU.filter((u: any) => u.createdAt >= weekAgo).length,
      newUsersThisMonth: 0,
      activeUsersThisWeek: new Set(allL.filter((l: any) => l.updatedAt >= weekAgo).map((l: any) => l.userId.toString())).size,
      totalLists: allL.length,
      completedLists: allL.filter((l: any) => l.status === "completed").length,
      totalReceipts: allR.length,
      receiptsThisWeek: 0,
      receiptsThisMonth: 0,
      totalGMV: Math.round(gmv * 100) / 100,
      computedAt: now,
      isPrecomputed: false,
    };
  });
}

export const getRevenueReport = query({
  args: { refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_analytics");
    let subs = await ctx.db.query("subscriptions").collect();
    if (args.dateFrom) subs = subs.filter(s => s.createdAt >= args.dateFrom!);
    if (args.dateTo) subs = subs.filter(s => s.createdAt <= args.dateTo!);

    const active = subs.filter((s: any) => s.status === "active").length;
    return { totalSubscriptions: subs.length, activeSubscriptions: active, monthlySubscribers: 0, annualSubscribers: 0, trialsActive: 0, mrr: 0, arr: 0 };
  },
});

// ============================================================================
// MODERATION
// ============================================================================

export const getRecentReceipts = query({
  args: { limit: v.optional(v.number()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()), searchTerm: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_receipts");
    const r = await ctx.db.query("receipts").order("desc").take(args.limit || 100);
    return await Promise.all(r.map(async receipt => {
      const u = await ctx.db.get(receipt.userId);
      return { ...receipt, userName: u?.name || "User" };
    }));
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

export const getUserDetail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_users");
    const u = await ctx.db.get(args.userId);
    if (!u) return null;
    const [r, l] = await Promise.all([
      ctx.db.query("receipts").withIndex("by_user", q => q.eq("userId", u._id)).collect(),
      ctx.db.query("shoppingLists").withIndex("by_user", q => q.eq("userId", u._id)).collect()
    ]);
    return { ...u, receiptCount: r.length, listCount: l.length, totalSpent: Math.round(r.reduce((s, x) => s + (x.total || 0), 0) * 100) / 100 };
  },
});

// ============================================================================
// SYSTEM & LOGS
// ============================================================================

export const getSystemHealth = query({
  args: { refreshKey: v.optional(v.string()) },
  handler: async (ctx) => {
    await requirePermission(ctx, "view_analytics");
    return { status: "healthy", receiptProcessing: { total: 0, failed: 0, processing: 0, successRate: 100 }, timestamp: Date.now() };
  },
});

export const getAuditLogs = query({
  args: { paginationOpts: v.any(), refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "view_audit_logs");
    const logs = await ctx.db.query("adminLogs").order("desc").paginate(args.paginationOpts);
    const enriched = await Promise.all(logs.page.map(async l => {
      const u = await ctx.db.get(l.adminUserId);
      return { ...l, adminName: u?.name || "Unknown" };
    }));
    return { ...logs, page: enriched };
  },
});

// Placeholder queries for tabs
export const getFeatureFlags = query({ args: {}, handler: async (ctx) => { await requirePermission(ctx, "manage_flags"); return []; } });
export const getAnnouncements = query({ args: {}, handler: async (ctx) => { await requirePermission(ctx, "manage_announcements"); return []; } });
export const getPricingConfig = query({ args: {}, handler: async (ctx) => { await requirePermission(ctx, "manage_pricing"); return []; } });
export const getCategories = query({ args: {}, handler: async (ctx) => { await requirePermission(ctx, "manage_catalog"); return []; } });
export const getDuplicateStores = query({ args: { bustCache: v.optional(v.boolean()) }, handler: async (ctx) => { await requirePermission(ctx, "manage_catalog"); return []; } });
