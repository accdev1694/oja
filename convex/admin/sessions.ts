import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { requireAdmin, requirePermission, MutationCtx } from "./helpers";
import { logToSIEM } from "../lib/siem";

const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const MAX_CONCURRENT_SESSIONS = 3;

export const logAdminSession = mutation({
  args: { ipAddress: v.optional(v.string()), userAgent: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const now = Date.now();

    const activeSessions = await ctx.db
      .query("adminSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .collect();

    let currentSession = null;
    const trulyActive = [];

    for (const session of activeSessions) {
      const isExpired = (now - session.lastSeenAt) > SESSION_TIMEOUT_MS;
      if (isExpired) {
        await ctx.db.patch(session._id, { status: "expired", logoutAt: now });
      } else if (!currentSession && session.userAgent === args.userAgent) {
        await ctx.db.patch(session._id, { lastSeenAt: now, ipAddress: args.ipAddress || session.ipAddress });
        currentSession = session;
        trulyActive.push(session);
      } else {
        trulyActive.push(session);
      }
    }

    if (currentSession) return { sessionId: currentSession._id };

    if (trulyActive.length >= MAX_CONCURRENT_SESSIONS) {
      const sortedByAge = [...trulyActive].sort((a, b) => a.loginAt - b.loginAt);
      const toExpireCount = trulyActive.length - (MAX_CONCURRENT_SESSIONS - 1);
      
      for (let i = 0; i < toExpireCount; i++) {
        const sessionToKill = sortedByAge[i];
        await ctx.db.patch(sessionToKill._id, { 
          status: "expired", 
          logoutAt: now,
        });
      }

      await ctx.db.insert("adminLogs", {
        adminUserId: user._id,
        action: "session_limit_exceeded",
        targetType: "session",
        details: `Automatic logout of ${toExpireCount} oldest session(s) due to concurrency limit (${MAX_CONCURRENT_SESSIONS})`,
        createdAt: now,
      });

      await logToSIEM(ctx as MutationCtx, {
        action: "session_limit_enforced",
        userId: user._id,
        status: "success",
        severity: "medium",
        details: `Concurrency limit (${MAX_CONCURRENT_SESSIONS}) reached. Expired ${toExpireCount} old sessions.`
      });
    }

    // Note: Convex OCC (optimistic concurrency control) serializes concurrent mutations
    // on the same documents, so true race conditions are handled at the DB level.
    // No redundant re-check needed — OCC will retry if another mutation committed first.

    const sessionId = await ctx.db.insert("adminSessions", {
      userId: user._id,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      loginAt: now,
      lastSeenAt: now,
      status: "active",
    });

    await logToSIEM(ctx as MutationCtx, {
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
    
    const active = await ctx.db
      .query("adminSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(100);
      
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

    return { count };
  },
});

export const getActiveImpersonationToken = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const token = await ctx.db
      .query("impersonationTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("usedAt"), undefined),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    if (!token) return null;

    const admin = await ctx.db.get(token.createdBy);

    return {
      hasActiveToken: true,
      createdBy: token.createdBy,
      adminName: admin?.name || "Admin",
      expiresAt: token.expiresAt,
    };
  },
});

export const stopImpersonation = mutation({
  args: { tokenValue: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const token = await ctx.db
      .query("impersonationTokens")
      .withIndex("by_token", (q) => q.eq("tokenValue", args.tokenValue))
      .unique();

    if (token) {
      await ctx.db.patch(token._id, { expiresAt: Date.now() - 1 });

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

export const stopImpersonationForUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const token = await ctx.db
      .query("impersonationTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("usedAt"), undefined),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    if (token) {
      await ctx.db.patch(token._id, { expiresAt: Date.now() - 1 });

      await ctx.db.insert("adminLogs", {
        adminUserId: token.createdBy,
        action: "stop_impersonation",
        targetType: "user",
        targetId: args.userId,
        details: `Stopped impersonation of user ${args.userId}`,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});
