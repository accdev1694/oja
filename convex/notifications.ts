import { v } from "convex/values";
import { mutation, query, internalQuery, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q: any) => q.eq("userId", user._id).eq("read", false))
      .collect();

    return unread.length;
  },
});

export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const notification = await ctx.db.get(args.id);
    if (!notification) throw new Error("Notification not found");
    if (notification.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.id, { read: true });
    return { success: true };
  },
});

export const markItemNotificationsRead = mutation({
  args: { listItemId: v.id("listItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q: any) => q.eq("userId", user._id).eq("read", false))
      .collect();

    let count = 0;
    for (const n of unread) {
      if (n.type === "comment_added" && n.data?.listItemId === args.listItemId) {
        await ctx.db.patch(n._id, { read: true });
        count++;
      }
    }

    return { count };
  },
});

export const markListNotificationsRead = mutation({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q: any) => q.eq("userId", user._id).eq("read", false))
      .collect();

    const listTypes = ["list_message", "comment_added"];
    let count = 0;
    for (const n of unread) {
      if (listTypes.includes(n.type) && n.data?.listId === args.listId) {
        await ctx.db.patch(n._id, { read: true });
        count++;
      }
    }

    return { count };
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q: any) => q.eq("userId", user._id).eq("read", false))
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }

    return { count: unread.length };
  },
});

// ─── Dismiss & Prune ────────────────────────────────────────────────────────

/**
 * Dismiss (delete) a single notification
 */
export const dismiss = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const notification = await ctx.db.get(args.id);
    if (!notification) return { success: true };
    if (notification.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Internal: prune notifications older than 30 days (all users)
 */
export const pruneOld = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    // Scan in batches to avoid timeouts
    let deleted = 0;
    let batch = await ctx.db.query("notifications").take(500);
    while (batch.length > 0) {
      const toDelete = batch.filter((n) => n.createdAt < cutoff);
      for (const n of toDelete) {
        await ctx.db.delete(n._id);
        deleted++;
      }
      // If entire batch was old, there may be more
      if (toDelete.length === batch.length) {
        batch = await ctx.db.query("notifications").take(500);
      } else {
        break;
      }
    }
    console.log(`[pruneOld] Deleted ${deleted} notifications older than 30 days`);
    return { deleted };
  },
});

// ─── Push Notifications ─────────────────────────────────────────────────────

/**
 * Register/update user's Expo push token
 */
export const registerPushToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    // Only update if token changed
    if (user.expoPushToken !== args.token) {
      await ctx.db.patch(user._id, {
        expoPushToken: args.token,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Remove user's push token (on logout or permission revoke)
 */
export const removePushToken = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    if (user.expoPushToken) {
      await ctx.db.patch(user._id, {
        expoPushToken: undefined,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Internal action: Send push notification via Expo Push API
 */
export const sendPush = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{ sent: boolean; reason?: string; ticketId?: string }> => {
    // Get user's push token
    const user = await ctx.runQuery(internal.notifications.getUserPushToken, {
      userId: args.userId,
    }) as { expoPushToken?: string } | null;

    if (!user?.expoPushToken) {
      console.log(`[sendPush] No push token for user ${args.userId}`);
      return { sent: false, reason: "no_token" };
    }

    // Validate Expo push token format
    if (!user.expoPushToken.startsWith("ExponentPushToken[")) {
      console.warn(`[sendPush] Invalid token format for user ${args.userId}`);
      return { sent: false, reason: "invalid_token" };
    }

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: user.expoPushToken,
          title: args.title,
          body: args.body,
          data: args.data ?? {},
          sound: "default",
          priority: "high",
        }),
      });

      const result = await response.json() as { data?: { status?: string; message?: string; id?: string } };

      if (result.data?.status === "error") {
        console.error(`[sendPush] Expo error:`, result.data.message);
        return { sent: false, reason: result.data.message };
      }

      console.log(`[sendPush] Sent to user ${args.userId}:`, args.title);
      return { sent: true, ticketId: result.data?.id };
    } catch (error) {
      console.error(`[sendPush] Failed:`, error);
      return { sent: false, reason: "fetch_error" };
    }
  },
});

/**
 * Internal query: Get user's push token (for use by sendPush action)
 */
export const getUserPushToken = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      expoPushToken: user.expoPushToken,
      preferences: user.preferences,
      aiSettings: user.aiSettings,
    };
  },
});
