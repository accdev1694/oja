import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function requireAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("User not found");
  if (!user.isAdmin) throw new Error("Admin access required");
  return user;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Get all users with pagination
 */
export const getUsers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || !user.isAdmin) return [];

    const users = await ctx.db
      .query("users")
      .order("desc")
      .take(args.limit || 50);

    return users;
  },
});

/**
 * Search users by name or email
 */
export const searchUsers = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || !user.isAdmin) return [];

    const allUsers = await ctx.db.query("users").collect();
    const term = args.searchTerm.toLowerCase();

    return allUsers.filter(
      (u: any) =>
        u.name.toLowerCase().includes(term) ||
        (u.email && u.email.toLowerCase().includes(term))
    );
  },
});

/**
 * Toggle admin status for a user
 */
export const toggleAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      isAdmin: !targetUser.isAdmin,
      updatedAt: Date.now(),
    });

    // Log admin action
    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: targetUser.isAdmin ? "remove_admin" : "grant_admin",
      targetType: "user",
      targetId: args.userId,
      details: `${targetUser.isAdmin ? "Removed" : "Granted"} admin access for ${targetUser.name}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * Get platform analytics overview
 */
export const getAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || !user.isAdmin) return null;

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const allUsers = await ctx.db.query("users").collect();
    const allLists = await ctx.db.query("shoppingLists").collect();
    const allReceipts = await ctx.db.query("receipts").collect();

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
    };
  },
});

/**
 * Get revenue report
 */
export const getRevenueReport = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || !user.isAdmin) return null;

    const subscriptions = await ctx.db.query("subscriptions").collect();

    const activeSubs = subscriptions.filter(
      (s: any) => s.status === "active" || s.status === "trial"
    );
    const monthlyCount = activeSubs.filter((s: any) => s.plan === "premium_monthly").length;
    const annualCount = activeSubs.filter((s: any) => s.plan === "premium_annual").length;
    const trialCount = activeSubs.filter((s: any) => s.status === "trial").length;

    const mrr = monthlyCount * 2.99 + annualCount * (21.99 / 12);
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
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || !user.isAdmin) return [];

    const receipts = await ctx.db
      .query("receipts")
      .order("desc")
      .take(args.limit || 20);

    const enriched = await Promise.all(
      receipts.map(async (r) => {
        const owner = await ctx.db.get(r.userId) as { name: string; email?: string } | null;
        return { ...r, userName: owner?.name ?? "Unknown", userEmail: owner?.email };
      })
    );

    return enriched;
  },
});

/**
 * Delete a receipt (admin)
 */
export const deleteReceipt = mutation({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
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
// SYSTEM HEALTH
// ============================================================================

/**
 * Get system health metrics
 */
export const getSystemHealth = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || !user.isAdmin) return null;

    const failedReceipts = await ctx.db
      .query("receipts")
      .collect();
    const failed = failedReceipts.filter((r: any) => r.processingStatus === "failed");
    const processing = failedReceipts.filter((r: any) => r.processingStatus === "processing");

    return {
      status: failed.length > 10 ? "degraded" : "healthy",
      receiptProcessing: {
        total: failedReceipts.length,
        failed: failed.length,
        processing: processing.length,
        successRate: failedReceipts.length > 0
          ? Math.round(((failedReceipts.length - failed.length) / failedReceipts.length) * 100)
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
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || !user.isAdmin) return [];

    const logs = await ctx.db
      .query("adminLogs")
      .order("desc")
      .take(args.limit || 50);

    const enriched = await Promise.all(
      logs.map(async (l) => {
        const adminUser = await ctx.db.get(l.adminUserId) as { name: string } | null;
        return { ...l, adminName: adminUser?.name ?? "Unknown" };
      })
    );

    return enriched;
  },
});
