import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireFeature } from "./lib/featureGating";

// Helper to get authenticated user (auto-creates if missing, e.g. partner who skipped onboarding)
async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();
  if (user) return user;

  // Auto-create user record for partners who haven't completed onboarding
  const now = Date.now();
  const userId = await ctx.db.insert("users", {
    clerkId: identity.subject,
    name: identity.name ?? "User",
    email: identity.email,
    avatarUrl: identity.pictureUrl,
    currency: "GBP",
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  });
  return await ctx.db.get(userId);
}

/**
 * Get user's permissions for a specific list.
 * Returns role info and computed permissions.
 * Exported for use in other Convex modules (listItems, etc.)
 */
export async function getUserListPermissions(
  ctx: any,
  listId: any,
  userId: any
): Promise<{
  isOwner: boolean;
  isPartner: boolean;
  role: "member" | null;
  canView: boolean;
  canEdit: boolean;
}> {
  const list = await ctx.db.get(listId);
  if (!list) {
    return { isOwner: false, isPartner: false, role: null, canView: false, canEdit: false };
  }

  // Completed and archived lists are read-only — no edits from any angle
  const isLocked = list.status === "completed" || list.status === "archived";

  const isOwner = list.userId === userId;
  if (isOwner) {
    return { isOwner: true, isPartner: false, role: null, canView: true, canEdit: !isLocked };
  }

  // Check partner record
  const partner = await ctx.db
    .query("listPartners")
    .withIndex("by_list_user", (q: any) => q.eq("listId", listId).eq("userId", userId))
    .unique();

  if (!partner || (partner.status !== "accepted" && partner.status !== "pending")) {
    return { isOwner: false, isPartner: false, role: null, canView: false, canEdit: false };
  }

  return {
    isOwner: false,
    isPartner: true,
    role: "member",
    canView: true,
    canEdit: !isLocked, // Partners can now add/edit items
  };
}

/**
 * Query: get current user's permissions for a list (for frontend use)
 */
export const getMyPermissions = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isOwner: false, isPartner: false, role: null, canView: false, canEdit: false };
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) {
      return { isOwner: false, isPartner: false, role: null, canView: false, canEdit: false };
    }
    return getUserListPermissions(ctx, args.listId, user._id);
  },
});

/**
 * Generate a unique invite code for a shopping list
 */
export const createInviteCode = mutation({
  args: {
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Feature gating: partner mode is premium only
    const access = await requireFeature(ctx, user._id, "partnerMode");
    if (!access.allowed) {
      throw new Error(access.reason ?? "Partner mode requires Premium");
    }

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) throw new Error("Unauthorized");

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("inviteCodes", {
      code,
      listId: args.listId,
      createdBy: user._id,
      role: "member",
      expiresAt,
      isActive: true,
    });

    return { code, expiresAt };
  },
});

/**
 * Accept an invite code to join a list
 */
export const acceptInvite = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const invite = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q: any) => q.eq("code", args.code))
      .unique();

    if (!invite || !invite.isActive || invite.expiresAt < Date.now()) {
      throw new Error("Invalid or expired invite code");
    }

    // Check if already a partner
    const existing = await ctx.db
      .query("listPartners")
      .withIndex("by_list_user", (q: any) => q.eq("listId", invite.listId).eq("userId", user._id))
      .unique();
    if (existing) throw new Error("Already a partner on this list");

    const now = Date.now();

    // Create partner record (always "member" — legacy invites may have old roles)
    await ctx.db.insert("listPartners", {
      listId: invite.listId,
      userId: user._id,
      role: "member",
      invitedBy: invite.createdBy,
      invitedAt: now,
      acceptedAt: now,
      status: "accepted",
    });

    // Mark invite as used
    await ctx.db.patch(invite._id, {
      usedBy: user._id,
      usedAt: now,
      isActive: false,
    });

    // Create notification for list owner
    const list = await ctx.db.get(invite.listId);
    if (list) {
      await ctx.db.insert("notifications", {
        userId: list.userId,
        type: "partner_joined",
        title: "New Partner",
        body: `${user.name} joined your list "${list.name}"`,
        data: { listId: invite.listId, partnerId: user._id },
        read: false,
        createdAt: now,
      });
    }

    return { success: true, listId: invite.listId };
  },
});

/**
 * Get partners for a list
 */
export const getByList = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canView) return [];

    const partners = await ctx.db
      .query("listPartners")
      .withIndex("by_list", (q: any) => q.eq("listId", args.listId))
      .collect();

    // Enrich with user data
    const enriched = await Promise.all(
      partners.map(async (p) => {
        const u = await ctx.db.get(p.userId);
        return { ...p, userName: u?.name ?? "Unknown", avatarUrl: u?.avatarUrl };
      })
    );

    return enriched;
  },
});

/**
 * Remove a partner from a list
 */
export const removePartner = mutation({
  args: { partnerId: v.id("listPartners") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const partner = await ctx.db.get(args.partnerId);
    if (!partner) throw new Error("Partner not found");

    const list = await ctx.db.get(partner.listId);
    if (!list || list.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.delete(args.partnerId);
    return { success: true };
  },
});

/**
 * Leave a shared list (partner voluntarily leaves)
 */
export const leaveList = mutation({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const partner = await ctx.db
      .query("listPartners")
      .withIndex("by_list_user", (q: any) => q.eq("listId", args.listId).eq("userId", user._id))
      .unique();

    if (!partner) throw new Error("You are not a partner on this list");

    await ctx.db.delete(partner._id);

    // Notify list owner
    const list = await ctx.db.get(args.listId);
    if (list) {
      await ctx.db.insert("notifications", {
        userId: list.userId,
        type: "partner_left",
        title: "Partner Left",
        body: `${user.name} left your list "${list.name}"`,
        data: { listId: args.listId },
        read: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

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
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
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
        .withIndex("by_item", (q: any) => q.eq("listItemId", itemId))
        .collect();
      counts[itemId] = comments.length;
    }
    return counts;
  },
});

/**
 * Get lists shared with the current user
 */
export const getSharedLists = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const partnerships = await ctx.db
      .query("listPartners")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const lists = await Promise.all(
      partnerships
        .filter((p) => p.status === "accepted")
        .map(async (p) => {
          const list = await ctx.db.get(p.listId);
          const owner = list ? await ctx.db.get(list.userId) : null;
          return list ? { ...list, role: p.role, ownerName: owner?.name ?? "Unknown" } : null;
        })
    );

    return lists.filter(Boolean);
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
        .withIndex("by_list", (q: any) => q.eq("listId", item.listId))
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
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    // Verify access to the item's list
    const item = await ctx.db.get(args.listItemId);
    if (!item) return [];
    const perms = await getUserListPermissions(ctx, item.listId, user._id);
    if (!perms.canView) return [];

    const comments = await ctx.db
      .query("itemComments")
      .withIndex("by_item", (q: any) => q.eq("listItemId", args.listItemId))
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
      .withIndex("by_list", (q: any) => q.eq("listId", args.listId))
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
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canView) return [];

    const messages = await ctx.db
      .query("listMessages")
      .withIndex("by_list", (q: any) => q.eq("listId", args.listId))
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
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return 0;

    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canView) return 0;

    const messages = await ctx.db
      .query("listMessages")
      .withIndex("by_list", (q: any) => q.eq("listId", args.listId))
      .collect();
    return messages.length;
  },
});
