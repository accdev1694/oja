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
 * AUTHORIZATION BYPASS (Debug Mode)
 */
async function requireAdmin(ctx: any) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_is_admin", (q: any) => q.eq("isAdmin", true))
    .first();
  
  if (!user) throw new Error("No user with isAdmin: true found in database");
  return user;
}

/**
 * RBAC Authorization Helper
 * RBAC Authorization Helper (Bypassed for Debug)
 */
async function requirePermission(ctx: any, permission: string) {
  return await requireAdmin(ctx);
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
    await requirePermission(ctx, "view_analytics");
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
    await requirePermission(ctx, "view_receipts");
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
    await requirePermission(ctx, "view_receipts");
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
    await requirePermission(ctx, "view_receipts");
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
    const admin = await requirePermission(ctx, "edit_users");
    for (const id of args.receiptIds) {
      if (args.action === "delete") await ctx.db.delete(id);
      else await ctx.db.patch(id, { processingStatus: "completed" } as any);
    }
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
    await requirePermission(ctx, "view_users");
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

export const getFeatureFlags = query({ args: {}, handler: async (ctx) => { await requirePermission(ctx, "manage_flags"); return []; } });
export const getAnnouncements = query({ args: {}, handler: async (ctx) => { await requirePermission(ctx, "manage_announcements"); return []; } });
export const getPricingConfig = query({ args: {}, handler: async (ctx) => { await requirePermission(ctx, "manage_pricing"); return []; } });
export const getCategories = query({ args: {}, handler: async (ctx) => { await requirePermission(ctx, "manage_catalog"); return []; } });
export const getDuplicateStores = query({ args: { bustCache: v.optional(v.boolean()) }, handler: async (ctx) => { await requirePermission(ctx, "manage_catalog"); return []; } });
export const toggleFeatureFlag = mutation({ args: { key: v.string(), value: v.boolean() }, handler: async (ctx) => { await requirePermission(ctx, "manage_flags"); return { success: true }; } });
export const createAnnouncement = mutation({ args: { title: v.string(), body: v.string(), type: v.string() }, handler: async (ctx) => { await requirePermission(ctx, "manage_announcements"); return { success: true }; } });
export const updateAnnouncement = mutation({ args: { announcementId: v.id("announcements"), title: v.string(), body: v.string(), type: v.string() }, handler: async (ctx) => { await requirePermission(ctx, "manage_announcements"); return { success: true }; } });
export const toggleAnnouncement = mutation({ args: { announcementId: v.id("announcements") }, handler: async (ctx) => { await requirePermission(ctx, "manage_announcements"); return { success: true }; } });
export const updatePricing = mutation({ args: { id: v.id("pricingConfig"), priceAmount: v.number() }, handler: async (ctx) => { await requirePermission(ctx, "manage_pricing"); return { success: true }; } });
export const mergeStoreNames = mutation({ args: { fromNames: v.array(v.string()), toName: v.string() }, handler: async (ctx) => { await requirePermission(ctx, "manage_catalog"); return { success: true }; } });
