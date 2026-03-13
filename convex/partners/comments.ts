import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUser, getUserListPermissions } from "./helpers";

/**
 * Get comment counts for multiple items (batch query to avoid N+1)
 */
export const getCommentCounts = query({
  args: { listItemIds: v.array(v.id("listItems")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return {};
    if (args.listItemIds.length === 0) return {};

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return {};

    // Check access via first item's list
    const firstItem = await ctx.db.get(args.listItemIds[0]);
    if (!firstItem) return {};
    const perms = await getUserListPermissions(ctx, firstItem.listId, user._id);
    if (!perms.canView) return {};

    const counts: Record<string, number> = {};
    for (const itemId of args.listItemIds) {
      const comments = await ctx.db
        .query("itemComments")
        .withIndex("by_item", q => q.eq("listItemId", itemId))
        .collect();
      counts[itemId] = comments.length;
    }
    return counts;
  },
});

/**
 * Add a comment to a list item
 */
export const addComment = mutation({
  args: {
    listItemId: v.id("listItems"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Verify the user has access to this list
    const item = await ctx.db.get(args.listItemId);
    if (!item) throw new Error("Item not found");
    const perms = await getUserListPermissions(ctx, item.listId, user._id);
    if (!perms.canView) throw new Error("You don't have access to this list");

    const now = Date.now();

    const commentId = await ctx.db.insert("itemComments", {
      listItemId: args.listItemId,
      userId: user._id,
      text: args.text,
      createdAt: now,
    });

    // Notify other participants (owner + partners) about the new comment
    const list = await ctx.db.get(item.listId);
    if (list) {
      const notifyUserIds: Set<string> = new Set();

      // Add owner
      if (list.userId.toString() !== user._id.toString()) {
        notifyUserIds.add(list.userId.toString());
      }

      // Add all accepted partners
      const partners = await ctx.db
        .query("listPartners")
        .withIndex("by_list", q => q.eq("listId", item.listId))
        .collect();
      for (const p of partners) {
        if (p.status === "accepted" && p.userId.toString() !== user._id.toString()) {
          notifyUserIds.add(p.userId.toString());
        }
      }

      // Create notifications
      for (const uid of notifyUserIds) {
        await ctx.db.insert("notifications", {
          userId: uid as any,
          type: "comment_added",
          title: "New Comment",
          body: `${user.name} commented on "${item.name}"`,
          data: { listId: item.listId, listItemId: args.listItemId },
          read: false,
          createdAt: now,
        });
      }
    }

    return commentId;
  },
});

/**
 * Get comments for a list item
 */
export const getComments = query({
  args: { listItemId: v.id("listItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    // Verify access to the item's list
    const item = await ctx.db.get(args.listItemId);
    if (!item) return [];
    const perms = await getUserListPermissions(ctx, item.listId, user._id);
    if (!perms.canView) return [];

    const comments = await ctx.db
      .query("itemComments")
      .withIndex("by_item", q => q.eq("listItemId", args.listItemId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      comments.map(async (c) => {
        const u = await ctx.db.get(c.userId);
        return { ...c, userName: u?.name ?? "Unknown", avatarUrl: u?.avatarUrl };
      })
    );

    return enriched;
  },
});
