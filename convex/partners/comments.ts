import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUser, getUserListPermissions, MutationCtx } from "./helpers";
import { Id, Doc } from "../_generated/dataModel";

/**
 * Batch fetch users by IDs to avoid N+1 queries
 */
async function batchGetUsers(
  ctx: { db: { get: (id: Id<"users">) => Promise<Doc<"users"> | null> } },
  userIds: Id<"users">[]
): Promise<Map<string, Doc<"users">>> {
  const uniqueIds = [...new Set(userIds)];
  const users = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
  const userMap = new Map<string, Doc<"users">>();
  for (let i = 0; i < uniqueIds.length; i++) {
    const user = users[i];
    if (user) userMap.set(uniqueIds[i], user);
  }
  return userMap;
}

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

    // M2 fix: Validate ALL items belong to a list user can access
    const items = await Promise.all(args.listItemIds.map((id) => ctx.db.get(id)));
    const validItems = items.filter((item): item is NonNullable<typeof item> => item !== null);
    if (validItems.length === 0) return {};

    // Check all items belong to the same list
    const listIds = new Set(validItems.map((item) => item.listId));
    if (listIds.size > 1) {
      // Security: Don't allow cross-list queries
      return {};
    }

    const listId = validItems[0].listId;
    const perms = await getUserListPermissions(ctx, listId, user._id);
    if (!perms.canView) return {};

    // H1 fix: Single batch query for all comments, then count in memory
    const allComments = await ctx.db
      .query("itemComments")
      .withIndex("by_item")
      .collect();

    // Filter to only our items and count
    const itemIdSet = new Set(args.listItemIds.map(String));
    const counts: Record<string, number> = {};
    for (const itemId of args.listItemIds) {
      counts[itemId] = 0;
    }
    for (const comment of allComments) {
      if (itemIdSet.has(String(comment.listItemId))) {
        counts[comment.listItemId] = (counts[comment.listItemId] || 0) + 1;
      }
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
    if (!user) throw new Error("User creation failed");

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
      const notifyUserIds = [];

      // Add owner
      if (list.userId !== user._id) {
        notifyUserIds.push(list.userId);
      }

      // Add all accepted partners
      const partners = await ctx.db
        .query("listPartners")
        .withIndex("by_list", q => q.eq("listId", item.listId))
        .collect();
      for (const p of partners) {
        if (p.status === "accepted" && p.userId !== user._id) {
          const found = notifyUserIds.some(uid => uid === p.userId);
          if (!found) {
            notifyUserIds.push(p.userId);
          }
        }
      }

      // Create notifications
      for (const uid of notifyUserIds) {
        await ctx.db.insert("notifications", {
          userId: uid,
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

    // M1 fix: Add pagination limit
    const comments = await ctx.db
      .query("itemComments")
      .withIndex("by_item", q => q.eq("listItemId", args.listItemId))
      .order("desc")
      .take(100);

    // H4 fix: Batch fetch users to avoid N+1
    const userIds = comments.map((c) => c.userId);
    const userMap = await batchGetUsers(ctx, userIds);

    const enriched = comments.map((c) => {
      const u = userMap.get(c.userId);
      return { ...c, userName: u?.name ?? "Unknown", avatarUrl: u?.avatarUrl };
    });

    return enriched;
  },
});
