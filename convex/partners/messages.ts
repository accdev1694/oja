import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUser, getUserListPermissions } from "./helpers";

// ============================================================
// List-Level Chat
// ============================================================

/**
 * Send a message in the list chat.
 * Any list member (owner or accepted partner) can send messages.
 */
export const addListMessage = mutation({
  args: {
    listId: v.id("shoppingLists"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canView) throw new Error("You don't have access to this list");

    const now = Date.now();
    const messageId = await ctx.db.insert("listMessages", {
      listId: args.listId,
      userId: user._id,
      text: args.text,
      createdAt: now,
    });

    // Notify owner + all accepted partners (except sender)
    const notifyUserIds: Set<string> = new Set();

    if (list.userId.toString() !== user._id.toString()) {
      notifyUserIds.add(list.userId.toString());
    }

    const partners = await ctx.db
      .query("listPartners")
      .withIndex("by_list", q => q.eq("listId", args.listId))
      .collect();
    for (const p of partners) {
      if (p.status === "accepted" && p.userId.toString() !== user._id.toString()) {
        notifyUserIds.add(p.userId.toString());
      }
    }

    for (const uid of notifyUserIds) {
      await ctx.db.insert("notifications", {
        userId: uid as any,
        type: "list_message",
        title: "New Message",
        body: `${user.name} in "${list.name}": ${args.text.substring(0, 80)}`,
        data: { listId: args.listId },
        read: false,
        createdAt: now,
      });
    }

    return messageId;
  },
});

/**
 * Get all messages for a list chat (enriched with user info).
 */
export const getListMessages = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canView) return [];

    const messages = await ctx.db
      .query("listMessages")
      .withIndex("by_list", q => q.eq("listId", args.listId))
      .order("asc")
      .collect();

    const enriched = await Promise.all(
      messages.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return { ...m, userName: u?.name ?? "Unknown", avatarUrl: u?.avatarUrl };
      })
    );

    return enriched;
  },
});

/**
 * Get message count for a list (for badge display).
 */
export const getListMessageCount = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return 0;

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canView) return 0;

    const messages = await ctx.db
      .query("listMessages")
      .withIndex("by_list", q => q.eq("listId", args.listId))
      .collect();
    return messages.length;
  },
});
