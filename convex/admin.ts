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
// USER MANAGEMENT — ADVANCED
// ============================================================================

/**
 * Get user detail view (subscription, receipts, lists, points)
 */
export const getUserDetail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!admin || !admin.isAdmin) return null;

    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    const loyalty = await ctx.db
      .query("loyaltyPoints")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .unique();

    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    return {
      ...user,
      subscription: sub,
      loyalty,
      receiptCount: receipts.length,
      listCount: lists.length,
      totalSpent: Math.round(receipts.reduce((s: number, r: any) => s + r.total, 0) * 100) / 100,
    };
  },
});

/**
 * Filter users by plan type, signup date, active status
 */
export const filterUsers = query({
  args: {
    planFilter: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!admin || !admin.isAdmin) return [];

    let users = await ctx.db.query("users").collect();

    if (args.dateFrom) users = users.filter((u: any) => u.createdAt >= args.dateFrom!);
    if (args.dateTo) users = users.filter((u: any) => u.createdAt <= args.dateTo!);

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
        const lists = await ctx.db.query("shoppingLists").collect();
        const activeUserIds = new Set(
          lists.filter((l: any) => l.updatedAt >= weekAgo).map((l: any) => l.userId.toString())
        );
        users = users.filter((u: any) => activeUserIds.has(u._id.toString()));
      }
    }

    return users;
  },
});

/**
 * Extend a user's trial by N days
 */
export const extendTrial = mutation({
  args: { userId: v.id("users"), days: v.number() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
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
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        plan: "premium_annual",
        status: "active",
        currentPeriodEnd: now + 365 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        plan: "premium_annual",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: now + 365 * 24 * 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "grant_complimentary",
      targetType: "user",
      targetId: args.userId,
      details: "Granted free premium annual access",
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
    const admin = await requireAdmin(ctx);
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");

    const isSuspended = (targetUser as any).suspended === true;

    await ctx.db.patch(args.userId, {
      ...(isSuspended ? { suspended: false } : { suspended: true }),
      updatedAt: Date.now(),
    } as any);

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!admin || !admin.isAdmin) return [];

    const receipts = await ctx.db.query("receipts").collect();
    const flagged = receipts.filter(
      (r: any) => r.processingStatus === "failed" || r.total === 0
    );

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
    const admin = await requireAdmin(ctx);
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
 */
export const getPriceAnomalies = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!admin || !admin.isAdmin) return [];

    const prices = await ctx.db.query("currentPrices").collect();

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

    return anomalies.slice(0, 50);
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
    const admin = await requireAdmin(ctx);
    const entry = await ctx.db.get(args.priceId);
    if (!entry) throw new Error("Price entry not found");

    if (args.deleteEntry) {
      await ctx.db.delete(args.priceId);
    } else if (args.newPrice !== undefined) {
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
 */
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!admin || !admin.isAdmin) return [];

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
 */
export const getDuplicateStores = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!admin || !admin.isAdmin) return [];

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
});

/**
 * Merge store names
 */
export const mergeStoreNames = mutation({
  args: {
    fromNames: v.array(v.string()),
    toName: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const prices = await ctx.db.query("currentPrices").collect();

    let updated = 0;
    for (const price of prices) {
      if (args.fromNames.includes(price.storeName) && price.storeName !== args.toName) {
        await ctx.db.patch(price._id, { storeName: args.toName, updatedAt: Date.now() });
        updated++;
      }
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "merge_stores",
      targetType: "store",
      details: `Merged ${args.fromNames.join(", ")} → ${args.toName} (${updated} records)`,
      createdAt: Date.now(),
    });

    return { success: true, updated };
  },
});

/**
 * Feature flags — get all
 */
export const getFeatureFlags = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!admin || !admin.isAdmin) return [];

    return await ctx.db.query("featureFlags").collect();
  },
});

/**
 * Feature flags — toggle
 */
export const toggleFeatureFlag = mutation({
  args: { key: v.string(), value: v.boolean(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!admin || !admin.isAdmin) return [];

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
    const admin = await requireAdmin(ctx);
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
 * Announcements — toggle active
 */
export const toggleAnnouncement = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
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
