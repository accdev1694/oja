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

async function requireAdmin(ctx: any) {
  // EMERGENCY DEBUG BYPASS
  console.log("requireAdmin: EMERGENCY BYPASS ENABLED");
  const user = await ctx.db.query("users").withIndex("by_is_admin", (q: any) => q.eq("isAdmin", true)).first();
  if (!user) throw new Error("No admin user found in database to fallback to");
  return user;
}

/**
 * RBAC Authorization Helper (Phase 1.2)
 * Validates that the current user has the required permission
 */
async function requirePermission(ctx: any, permission: string) {
  // EMERGENCY DEBUG BYPASS
  return await requireAdmin(ctx);
}

/**
 * Enforce rate limits for admin actions
 */
async function checkRateLimit(ctx: any, userId: any, action: string) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const windowStart = now - (now % windowMs);

  // Define limits per permission type
  const SENSITIVE_PERMISSIONS = ["edit_users", "delete_receipts", "manage_pricing"];
  const limit = SENSITIVE_PERMISSIONS.includes(action) ? 10 : 100;

  const existing = await ctx.db
    .query("adminRateLimits")
    .withIndex("by_user_action", (q: any) => 
      q.eq("userId", userId).eq("action", action)
    )
    .unique();

  if (existing) {
    if (existing.windowStart === windowStart) {
      if (existing.count >= limit) {
        throw new Error(`Rate limit exceeded for ${action}. Please wait a minute.`);
      }
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      // New window
      await ctx.db.patch(existing._id, { 
        count: 1, 
        windowStart: windowStart 
      });
    }
  } else {
    // First request
    await ctx.db.insert("adminRateLimits", {
      userId,
      action,
      count: 1,
      windowStart,
    });
  }
}

// ============================================================================
// DEBUG & VERIFICATION
// ============================================================================

/**
 * Debug query to verify auth identity and user record link
 */
export const debugAuth = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { error: "No Convex identity found (not authenticated)" };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();

    return {
      authenticatedSubject: identity.subject,
      authenticatedEmail: identity.email,
      userRecordFound: !!user,
      userId: user?._id,
      userIsAdminFlag: user?.isAdmin ?? false,
      userRoleName: user?.isAdmin ? "Admin" : "User",
    };
  },
});

/**
 * List all users with isAdmin: true (Dashboard only)
 */
export const listAllAdmins = query({
  args: {},
  handler: async (ctx) => {
    const admins = await ctx.db
      .query("users")
      .withIndex("by_is_admin", (q) => q.eq("isAdmin", true))
      .collect();
    
    return admins.map(a => ({
      id: a._id,
      name: a.name,
      email: a.email,
      clerkId: a.clerkId,
      isAdmin: a.isAdmin
    }));
  },
});

// ============================================================================
// RBAC QUERIES
// ============================================================================

/**
 * Get permissions for the current admin user
 */
export const getMyPermissions = query({
  args: {},
  handler: async (ctx) => {
    console.log("getMyPermissions: EMERGENCY BYPASS ENABLED");
    
    // TEMPORARY: Grant access to everyone to verify connection
    return {
      role: "super_admin",
      displayName: "Debug Mode (All Access)",
      permissions: [
        "view_analytics", "view_users", "edit_users", 
        "view_receipts", "delete_receipts", "manage_catalog", 
        "manage_flags", "manage_announcements", "manage_pricing", "view_audit_logs"
      ],
    };
  },
});
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

    // Find any existing active session for this user from same device (rough check)
    const existing = await ctx.db
      .query("adminSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .first();

    if (existing && existing.userAgent === args.userAgent) {
      // Refresh heartbeat
      await ctx.db.patch(existing._id, { 
        lastSeenAt: now,
        ipAddress: args.ipAddress || existing.ipAddress 
      });
      return { sessionId: existing._id };
    }

    // Create new session
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
    const session = await ctx.db.get(args.sessionId);
    
    if (!session || session.userId !== user._id) {
      throw new Error("Invalid session");
    }

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

    // Enrich with user info
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
 * Force logout a session (Super Admin only)
 */
export const forceLogoutSession = mutation({
  args: { sessionId: v.id("adminSessions") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manage_flags"); // High level permission needed

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
    paginationOpts: v.any(), // Use pagination options from Convex
  },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, "view_users");
    } catch (e) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db
      .query("users")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Search users by name or email
 *
 * NOTE: Uses client-side filtering (Convex limitation - no LIKE queries).
 * For production with >10K users, migrate to dedicated search (Algolia/Typesense).
 * Current implementation limits scan to first 1000 users for performance.
 */
export const searchUsers = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, "view_users");
    } catch (e) {
      return [];
    }

    // Limit scan to first 1000 users (ordered by creation desc = newest first)
    // For larger datasets, use dedicated search service
    const recentUsers = await ctx.db
      .query("users")
      .order("desc")
      .take(1000);

    const term = args.searchTerm.toLowerCase();
    const matches = recentUsers.filter(
      (u: any) =>
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.firstName && u.firstName.toLowerCase().includes(term)) ||
        (u.lastName && u.lastName.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.username && u.username.toLowerCase().includes(term))
    );

    // Return first N matches
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

    // Also update RBAC if granting admin
    if (newAdminStatus) {
      const existingRole = await ctx.db
        .query("userRoles")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .unique();

      if (!existingRole) {
        const superAdminRole = await ctx.db
          .query("adminRoles")
          .withIndex("by_name", (q) => q.eq("name", "super_admin"))
          .unique();

        if (superAdminRole) {
          await ctx.db.insert("userRoles", {
            userId: args.userId,
            roleId: superAdminRole._id,
            grantedBy: admin._id,
            grantedAt: Date.now(),
          });
        }
      }
    } else {
      // Remove RBAC role if demoting
      const existingRole = await ctx.db
        .query("userRoles")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .unique();

      if (existingRole) {
        await ctx.db.delete(existingRole._id);
      }
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: newAdminStatus ? "grant_admin" : "revoke_admin",
      targetType: "user",
      targetId: args.userId,
      details: `${newAdminStatus ? "Granted" : "Revoked"} admin privileges for user`,
      createdAt: Date.now(),
    });

    return { success: true, isAdmin: newAdminStatus };
  },
});

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * Get platform analytics overview
 *
 * Optimized (Phase 1): Uses precomputed metrics from platformMetrics table
 * - Reads from daily cron job aggregations (no full table scans)
 * - Falls back to live computation if no precomputed data exists
 * - Returns "computedAt" timestamp for UI display
 */
export const getAnalytics = query({
  args: {
    refreshKey: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, "view_analytics");
    } catch (e) {
      return null;
    }

    // If date range is specified, fall back to live computation
    if (args.dateFrom || args.dateTo) {
      return getLiveAnalytics(ctx, args.dateFrom, args.dateTo);
    }

    // Get today's precomputed metrics
    const today = new Date().toISOString().split("T")[0];
    const metrics = await ctx.db
      .query("platformMetrics")
      .withIndex("by_date", (q: any) => q.eq("date", today))
      .unique();

    // If no precomputed metrics exist, fall back to live computation
    if (!metrics) {
      console.warn("[Analytics] No precomputed metrics found for today, falling back to live computation");
      return getLiveAnalytics(ctx);
    }

    // Return precomputed metrics
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
      computedAt: metrics.computedAt, // Timestamp for "as of" display
      isPrecomputed: true,
    };
  },
});

/**
 * Helper: Live analytics computation (fallback when no precomputed data exists)
 */
async function getLiveAnalytics(ctx: any, dateFrom?: number, dateTo?: number) {
  return measureQueryPerformance("getLiveAnalytics", async () => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

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
    const newUsersThisMonth = allUsers.filter((u: any) => u.createdAt >= monthAgo).length;
    const activeUsersThisWeek = new Set(
      allLists.filter((l: any) => l.updatedAt >= weekAgo).map((l: any) => l.userId.toString())
    ).size;

    const completedLists = allLists.filter((l: any) => l.status === "completed");
    const totalRevenue = allReceipts.reduce((sum: number, r: any) => sum + r.total, 0);

    const receiptsThisWeek = allReceipts.filter((r: any) => r.createdAt >= weekAgo).length;
    const receiptsThisMonth = allReceipts.filter((r: any) => r.createdAt >= monthAgo).length;

    return {
      totalUsers: allUsers.length,
      newUsersThisWeek,
      newUsersThisMonth,
      activeUsersThisWeek,
      totalLists: allLists.length,
      completedLists: completedLists.length,
      totalReceipts: allReceipts.length,
      receiptsThisWeek,
      receiptsThisMonth,
      totalGMV: Math.round(totalRevenue * 100) / 100,
      computedAt: now,
      isPrecomputed: false,
    };
  });
}

/**
 * Get revenue report
 */
export const getRevenueReport = query({
  args: {
    refreshKey: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, "view_analytics");
    } catch (e) {
      return null;
    }

    let subscriptions = await ctx.db.query("subscriptions").collect();

    if (args.dateFrom) subscriptions = subscriptions.filter(s => s.createdAt >= args.dateFrom!);
    if (args.dateTo) subscriptions = subscriptions.filter(s => s.createdAt <= args.dateTo!);

    // Get dynamic pricing from config
    const pricing = await ctx.db.query("pricingConfig")
      .withIndex("by_active", (q: any) => q.eq("isActive", true))
      .collect();

    const monthlyPrice = pricing.find((p: any) => p.planId === "premium_monthly")?.priceAmount ?? 2.99;
    const annualPrice = pricing.find((p: any) => p.planId === "premium_annual")?.priceAmount ?? 21.99;

    const activeSubs = subscriptions.filter(
      (s: any) => s.status === "active" || s.status === "trial"
    );
    const monthlyCount = activeSubs.filter((s: any) => s.plan === "premium_monthly").length;
    const annualCount = activeSubs.filter((s: any) => s.plan === "premium_annual").length;
    const trialCount = activeSubs.filter((s: any) => s.status === "trial").length;

    const mrr = monthlyCount * monthlyPrice + annualCount * (annualPrice / 12);
    const arr = mrr * 12;

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubs.length,
      monthlySubscribers: monthlyCount,
      annualSubscribers: annualCount,
      trialsActive: trialCount,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
    };
  },
});

// ============================================================================
// MODERATION
// ============================================================================

/**
 * Get recent receipts for moderation
 */
export const getRecentReceipts = query({
  args: { 
    limit: v.optional(v.number()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    searchTerm: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, "view_receipts");
    } catch (e) {
      return [];
    }

    let query = ctx.db.query("receipts").order("desc");

    // Filtering by status if provided (uses index if status only)
    if (args.status && !args.dateFrom) {
      query = ctx.db.query("receipts")
        .withIndex("by_processing_status", (q: any) => q.eq("processingStatus", args.status as any))
        .order("desc");
    } else if (args.dateFrom) {
      // Use index for date filtering
      query = ctx.db.query("receipts")
        .withIndex("by_created", (q: any) => q.gte("createdAt", args.dateFrom!));
    }

    let receipts = await query.take(args.limit || 100);

    if (args.dateTo) {
      receipts = receipts.filter(r => r.createdAt <= args.dateTo!);
    }
    if (args.status && args.dateFrom) {
      receipts = receipts.filter(r => r.processingStatus === args.status);
    }

    const enriched = await Promise.all(
      receipts.map(async (r) => {
        const owner = await ctx.db.get(r.userId) as { name: string; email?: string } | null;
        const userName = owner?.name ?? "Unknown";
        const userEmail = owner?.email ?? "";
        return { ...r, userName, userEmail };
      })
    );

    if (args.searchTerm) {
      const term = args.searchTerm.toLowerCase();
      return enriched.filter(r => 
        r.storeName.toLowerCase().includes(term) || 
        r.userName.toLowerCase().includes(term) ||
        r.userEmail.toLowerCase().includes(term)
      ).slice(0, args.limit || 50);
    }

    return enriched.slice(0, args.limit || 50);
  },
});

/**
 * Delete a receipt (admin)
 */
export const deleteReceipt = mutation({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "delete_receipts");
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) throw new Error("Receipt not found");

    await ctx.db.delete(args.receiptId);

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "delete_receipt",
      targetType: "receipt",
      targetId: args.receiptId,
      details: `Deleted receipt from ${receipt.storeName}, total: £${receipt.total}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// USER MANAGEMENT — ADVANCED
// ============================================================================

/**
 * Get user detail view (subscription, receipts, lists, points)
 */
export const getUserDetail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, "view_users");
    } catch (e) {
      return null;
    }

    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    const scanRewards = await ctx.db
      .query("scanCredits")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    return {
      ...user,
      subscription: sub,
      scanRewards: scanRewards ? {
        lifetimeScans: scanRewards.lifetimeScans ?? 0,
        tier: scanRewards.tier ?? "bronze",
        creditsEarned: scanRewards.creditsEarned,
      } : null,
      receiptCount: receipts.length,
      listCount: lists.length,
      totalSpent: Math.round(receipts.reduce((s: number, r: any) => s + r.total, 0) * 100) / 100,
    };
  },
});

/**
 * Filter users by plan type, signup date, active status
 *
 * TODO (Phase 1): Optimize with precomputed user segments.
 * Current implementation acceptable for <10K users.
 */
export const filterUsers = query({
  args: {
    planFilter: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    activeOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, "view_users");
    } catch (e) {
      return [];
    }

    // Use by_created index for date filtering
    let users: any[];
    if (args.dateFrom) {
      users = await ctx.db
        .query("users")
        .withIndex("by_created")
        .filter((q) => q.gte(q.field("createdAt"), args.dateFrom!))
        .collect();
    } else {
      users = await ctx.db.query("users").order("desc").take(args.limit || 1000);
    }

    if (args.dateTo) {
      users = users.filter((u: any) => u.createdAt <= args.dateTo!);
    }

    if (args.planFilter || args.activeOnly) {
      const subs = await ctx.db.query("subscriptions").collect();
      const subMap = new Map<string, any>();
      for (const s of subs) subMap.set(s.userId.toString(), s);

      if (args.planFilter) {
        users = users.filter((u: any) => {
          const sub = subMap.get(u._id.toString());
          return sub?.plan === args.planFilter;
        });
      }

      if (args.activeOnly) {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        // Limit lists query to recent activity
        const lists = await ctx.db
          .query("shoppingLists")
          .order("desc")
          .take(5000);
        const activeUserIds = new Set(
          lists.filter((l: any) => l.updatedAt >= weekAgo).map((l: any) => l.userId.toString())
        );
        users = users.filter((u: any) => activeUserIds.has(u._id.toString()));
      }
    }

    return users.slice(0, args.limit || 100);
  },
});

/**
 * Extend a user's trial by N days
 */
export const extendTrial = mutation({
  args: { userId: v.id("users"), days: v.number() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");
    const now = Date.now();

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    if (!sub) throw new Error("No subscription found");

    const extension = args.days * 24 * 60 * 60 * 1000;
    await ctx.db.patch(sub._id, {
      trialEndsAt: (sub.trialEndsAt || now) + extension,
      currentPeriodEnd: (sub.currentPeriodEnd || now) + extension,
      status: "trial",
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

/**
 * Grant free premium access
 */
export const grantComplimentaryAccess = mutation({
  args: { 
    userId: v.id("users"),
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");
    const now = Date.now();
    const months = args.months ?? 12;

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    const duration = months * 30 * 24 * 60 * 60 * 1000;

    if (existing) {
      await ctx.db.patch(existing._id, {
        plan: "premium_annual",
        status: "active",
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

    await ctx.db.patch(args.userId, {
      updatedAt: now,
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "grant_complimentary",
      targetType: "user",
      targetId: args.userId,
      details: `Granted free premium access for ${months} months`,
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * Suspend/unsuspend a user
 */
export const toggleSuspension = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "edit_users");
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");

    const isSuspended = (targetUser as any).suspended === true;

    await ctx.db.patch(args.userId, {
      suspended: !isSuspended,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: isSuspended ? "unsuspend_user" : "suspend_user",
      targetType: "user",
      targetId: args.userId,
      details: `${isSuspended ? "Unsuspended" : "Suspended"} user ${targetUser.name}`,
      createdAt: Date.now(),
    });

    return { success: true, suspended: !isSuspended };
  },
});

// ============================================================================
// RECEIPT & PRICE MODERATION
// ============================================================================

/**
 * Get flagged/low-confidence receipts for review
 */
export const getFlaggedReceipts = query({
  args: {},
  handler: async (ctx) => {
    try {
      await requirePermission(ctx, "view_receipts");
    } catch (e) {
      return [];
    }

    // Use index to get failed receipts efficiently
    const failed = await ctx.db
      .query("receipts")
      .withIndex("by_processing_status", (q: any) => q.eq("processingStatus", "failed"))
      .collect();

    // Get completed receipts with total === 0 (need full scan for this specific case)
    const completed = await ctx.db
      .query("receipts")
      .withIndex("by_processing_status", (q: any) => q.eq("processingStatus", "completed"))
      .collect();

    const zeroTotal = completed.filter((r: any) => r.total === 0);

    const flagged = [...failed, ...zeroTotal];

    const enriched = await Promise.all(
      flagged.map(async (r) => {
        const owner = await ctx.db.get(r.userId) as { name: string } | null;
        return { ...r, userName: owner?.name ?? "Unknown" };
      })
    );

    return enriched;
  },
});

/**
 * Bulk approve/delete receipts
 */
export const bulkReceiptAction = mutation({
  args: {
    receiptIds: v.array(v.id("receipts")),
    action: v.union(v.literal("approve"), v.literal("delete")),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, args.action === "delete" ? "delete_receipts" : "edit_users");
    const now = Date.now();

    for (const receiptId of args.receiptIds) {
      const receipt = await ctx.db.get(receiptId);
      if (!receipt) continue;

      if (args.action === "delete") {
        await ctx.db.delete(receiptId);
      } else {
        await ctx.db.patch(receiptId, { processingStatus: "completed" } as any);
      }
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: `bulk_${args.action}_receipts`,
      targetType: "receipt",
      details: `${args.action === "delete" ? "Deleted" : "Approved"} ${args.receiptIds.length} receipts`,
      createdAt: now,
    });

    return { success: true, count: args.receiptIds.length };
  },
});

/**
 * Detect price anomalies (>50% deviation from average)
 *
 * Optimized (Phase 1): Uses limited scan + pagination
 * - Scans only most recent 5000 price records per query
 * - Reduces memory footprint and query time
 * - For >100K prices, consider precomputed anomalies via cron job
 */
export const getPriceAnomalies = query({
  args: {
    limit: v.optional(v.number()),
    paginationOpts: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, "view_receipts");
    } catch (e) {
      return { anomalies: [], hasMore: false };
    }

    // Limit scan to most recent 5000 prices for performance
    // Use pagination if needed for larger datasets
    const prices = await ctx.db
      .query("currentPrices")
      .order("desc")
      .take(5000);

    // Group by normalizedName
    const byItem: Record<string, any[]> = {};
    for (const p of prices) {
      if (!byItem[p.normalizedName]) byItem[p.normalizedName] = [];
      byItem[p.normalizedName].push(p);
    }

    const anomalies: any[] = [];
    for (const [name, entries] of Object.entries(byItem)) {
      if (entries.length < 2) continue;
      const avg = entries.reduce((s, e) => s + e.unitPrice, 0) / entries.length;
      for (const entry of entries) {
        const deviation = Math.abs(entry.unitPrice - avg) / avg;
        if (deviation > 0.5) {
          anomalies.push({
            ...entry,
            averagePrice: Math.round(avg * 100) / 100,
            deviation: Math.round(deviation * 100),
          });
        }
      }
    }

    // Sort by deviation (highest first) and limit results
    anomalies.sort((a, b) => b.deviation - a.deviation);
    const limited = anomalies.slice(0, args.limit || 50);

    return { anomalies: limited, hasMore: anomalies.length > (args.limit || 50) };
  },
});

/**
 * Override/delete a price entry
 */
export const overridePrice = mutation({
  args: {
    priceId: v.id("currentPrices"),
    newPrice: v.optional(v.number()),
    deleteEntry: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, args.deleteEntry ? "delete_receipts" : "edit_users");
    const entry = await ctx.db.get(args.priceId);
    if (!entry) throw new Error("Price entry not found");

    if (args.deleteEntry) {
      await ctx.db.delete(args.priceId);
    } else if (args.newPrice !== undefined) {
      if (args.newPrice <= 0) {
        throw new Error("Price must be a positive number");
      }
      if (args.newPrice > 10000) {
        throw new Error("Price exceeds reasonable maximum (£10,000)");
      }
      await ctx.db.patch(args.priceId, {
        unitPrice: args.newPrice,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: args.deleteEntry ? "delete_price" : "override_price",
      targetType: "currentPrice",
      targetId: args.priceId,
      details: args.deleteEntry
        ? `Deleted price for ${entry.itemName} at ${entry.storeName}`
        : `Changed price for ${entry.itemName} at ${entry.storeName} to £${args.newPrice}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// PRODUCT CATALOG & FEATURE FLAGS
// ============================================================================

/**
 * Get all unique categories
 *
 * TODO (Phase 1): Cache category list, update via triggers.
 * Current implementation acceptable for <50K pantry items.
 */
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    try {
      await requirePermission(ctx, "manage_catalog");
    } catch (e) {
      return [];
    }

    // NOTE: Full table scan on pantryItems
    // For production, cache this in a categoryStats table updated by triggers
    const pantryItems = await ctx.db.query("pantryItems").collect();
    const categories = [...new Set(pantryItems.map((i: any) => i.category))].sort();
    const counts: Record<string, number> = {};
    for (const item of pantryItems) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return categories.map((c) => ({ name: c, count: counts[c] || 0 }));
  },
});

/**
 * Get duplicate store names for normalization
 *
 * Optimized (Phase 1): 1-hour cache to avoid repeated full table scans
 * - Cache invalidated automatically after 1 hour
 * - Manual invalidation on store merge via mergeStoreNames mutation
 */
export const getDuplicateStores = query({
  args: {
    bustCache: v.optional(v.boolean()), // Force cache refresh
  },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, "manage_catalog");
    } catch (e) {
      return [];
    }

    // Clear cache if requested
    if (args.bustCache) {
      queryCache.delete("duplicateStores");
    }

    // Use cached result if available (1-hour TTL)
    return getCachedOrCompute(
      "duplicateStores",
      async () => {
        // Full table scan on currentPrices to extract unique store names
        const prices = await ctx.db.query("currentPrices").collect();
        const storeNames = [...new Set(prices.map((p: any) => p.storeName))].sort();

        // Find potential duplicates (Levenshtein-like: same lowercase, different case/spacing)
        const normalized: Record<string, string[]> = {};
        for (const name of storeNames) {
          const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (!normalized[key]) normalized[key] = [];
          normalized[key].push(name);
        }

        return Object.entries(normalized)
          .filter(([, names]) => names.length > 1)
          .map(([, names]) => ({ variants: names, suggested: names[0] }));
      },
      60 * 60 * 1000 // 1 hour
    );
  },
});

/**
 * Merge store names
 *
 * WARNING: This operation can be slow with >10K price records.
 * For production, run as background job with progress tracking.
 */
export const mergeStoreNames = mutation({
  args: {
    fromNames: v.array(v.string()),
    toName: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_catalog");

    // NOTE: Full table scan + loop
    // For production with >50K prices, implement as:
    // 1. Background scheduler job
    // 2. Batch updates (100 per txn)
    // 3. Progress tracking in adminLogs
    const prices = await ctx.db.query("currentPrices").collect();

    const now = Date.now();
    let updated = 0;

    // Batch update in memory-efficient way
    for (const price of prices) {
      if (args.fromNames.includes(price.storeName) && price.storeName !== args.toName) {
        await ctx.db.patch(price._id, { storeName: args.toName, updatedAt: now });
        updated++;
      }
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "merge_stores",
      targetType: "store",
      details: `Merged ${args.fromNames.join(", ")} → ${args.toName} (${updated} records)`,
      createdAt: now,
    });

    // Invalidate duplicate stores cache
    queryCache.delete("duplicateStores");

    return { success: true, updated };
  },
});

/**
 * Feature flags — get all
 */
export const getFeatureFlags = query({
  args: {},
  handler: async (ctx) => {
    try {
      await requirePermission(ctx, "manage_flags");
    } catch (e) {
      return [];
    }

    const flags = await ctx.db.query("featureFlags").collect();

    // Sort by updatedAt descending (newest first)
    const sorted = flags.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    // Enrich with admin name
    return await Promise.all(
      sorted.map(async (f) => {
        if (!f.updatedBy) return { ...f, updatedByName: "System" };
        const updater = await ctx.db.get(f.updatedBy) as { name: string } | null;
        return { ...f, updatedByName: updater?.name ?? "Unknown" };
      })
    );
  },
});

/**
 * Feature flags — toggle
 */
export const toggleFeatureFlag = mutation({
  args: { key: v.string(), value: v.boolean(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");
    const now = Date.now();

    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q: any) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value, updatedBy: admin._id, updatedAt: now });
    } else {
      await ctx.db.insert("featureFlags", {
        key: args.key,
        value: args.value,
        description: args.description,
        updatedBy: admin._id,
        updatedAt: now,
      });
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "toggle_feature_flag",
      targetType: "featureFlag",
      targetId: args.key,
      details: `Set ${args.key} = ${args.value}`,
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * Announcements — get all
 */
export const getAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    try {
      await requirePermission(ctx, "manage_announcements");
    } catch (e) {
      return [];
    }

    return await ctx.db.query("announcements").order("desc").collect();
  },
});

/**
 * Announcements — create
 */
export const createAnnouncement = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    type: v.union(v.literal("info"), v.literal("warning"), v.literal("promo")),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_announcements");
    const now = Date.now();

    const id = await ctx.db.insert("announcements", {
      title: args.title,
      body: args.body,
      type: args.type,
      active: true,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      createdBy: admin._id,
      createdAt: now,
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "create_announcement",
      targetType: "announcement",
      targetId: id,
      details: `Created announcement: ${args.title}`,
      createdAt: now,
    });

    return { success: true, id };
  },
});

/**
 * Announcements — update
 */
export const updateAnnouncement = mutation({
  args: {
    announcementId: v.id("announcements"),
    title: v.string(),
    body: v.string(),
    type: v.union(v.literal("info"), v.literal("warning"), v.literal("promo")),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_announcements");
    const ann = await ctx.db.get(args.announcementId);
    if (!ann) throw new Error("Announcement not found");

    await ctx.db.patch(args.announcementId, {
      title: args.title,
      body: args.body,
      type: args.type,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
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

/**
 * Announcements — toggle active
 */
export const toggleAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_announcements");
    const ann = await ctx.db.get(args.announcementId);
    if (!ann) throw new Error("Announcement not found");

    await ctx.db.patch(args.announcementId, { active: !ann.active });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "toggle_announcement",
      targetType: "announcement",
      targetId: args.announcementId,
      details: `${ann.active ? "Deactivated" : "Activated"} announcement: ${ann.title}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get active announcements (for all users)
 */
export const getActiveAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q: any) => q.eq("active", true))
      .collect();

    return announcements.filter((a: any) => {
      if (a.startsAt && a.startsAt > now) return false;
      if (a.endsAt && a.endsAt < now) return false;
      return true;
    });
  },
});

/**
 * Get pricing configuration
 */
export const getPricingConfig = query({
  args: {},
  handler: async (ctx) => {
    try {
      await requirePermission(ctx, "manage_pricing");
    } catch (e) {
      return [];
    }

    return await ctx.db.query("pricingConfig").collect();
  },
});

/**
 * Update pricing configuration
 */
export const updatePricing = mutation({
  args: {
    id: v.id("pricingConfig"),
    priceAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_pricing");
    const config = await ctx.db.get(args.id);
    if (!config) throw new Error("Pricing config not found");

    await ctx.db.patch(args.id, {
      priceAmount: args.priceAmount,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "update_pricing",
      targetType: "pricingConfig",
      targetId: args.id,
      details: `Updated ${config.displayName} price to £${args.priceAmount}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// SYSTEM HEALTH
// ============================================================================

/**
 * Get system health metrics
 */
export const getSystemHealth = query({
  args: {
    refreshKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, "view_analytics");
    } catch (e) {
      return null;
    }

    // Use indexes for efficient queries
    const failed = await ctx.db
      .query("receipts")
      .withIndex("by_processing_status", (q: any) => q.eq("processingStatus", "failed"))
      .collect();

    const processing = await ctx.db
      .query("receipts")
      .withIndex("by_processing_status", (q: any) => q.eq("processingStatus", "processing"))
      .collect();

    // Get total count efficiently (use completed index)
    const completed = await ctx.db
      .query("receipts")
      .withIndex("by_processing_status", (q: any) => q.eq("processingStatus", "completed"))
      .collect();

    const total = failed.length + processing.length + completed.length;

    return {
      status: failed.length > 10 ? "degraded" : "healthy",
      receiptProcessing: {
        total,
        failed: failed.length,
        processing: processing.length,
        successRate: total > 0
          ? Math.round(((total - failed.length) / total) * 100)
          : 100,
      },
      timestamp: Date.now(),
    };
  },
});

/**
 * Get admin action logs
 */
export const getAuditLogs = query({
  args: { 
    paginationOpts: v.any(),
    refreshKey: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, "view_audit_logs");
    } catch (e) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    let query = ctx.db.query("adminLogs").order("desc");

    // Note: Filtering after query since we don't have multiple indexes yet
    // For large scale, use by_created_at index (Phase 1)
    const results = await query.paginate(args.paginationOpts);

    const enrichedPage = await Promise.all(
      results.page.map(async (l) => {
        const adminUser = await ctx.db.get(l.adminUserId) as { name: string } | null;
        return { ...l, adminName: adminUser?.name ?? "Unknown" };
      })
    );

    // Apply date filtering to the current page (client-side style for now)
    // In Phase 1 we will optimize this with indexed database queries
    let filteredPage = enrichedPage;
    if (args.dateFrom) filteredPage = filteredPage.filter(l => l.createdAt >= args.dateFrom!);
    if (args.dateTo) filteredPage = filteredPage.filter(l => l.createdAt <= args.dateTo!);

    return {
      ...results,
      page: filteredPage,
    };
  },
});
