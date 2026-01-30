import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to get authenticated user
async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}

/**
 * Generate a unique invite code for a shopping list
 */
export const createInviteCode = mutation({
  args: {
    listId: v.id("shoppingLists"),
    role: v.union(v.literal("viewer"), v.literal("editor"), v.literal("approver")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) throw new Error("Unauthorized");

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("inviteCodes", {
      code,
      listId: args.listId,
      createdBy: user._id,
      role: args.role,
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

    // Create partner record
    await ctx.db.insert("listPartners", {
      listId: invite.listId,
      userId: user._id,
      role: invite.role,
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

    const partners = await ctx.db
      .query("listPartners")
      .withIndex("by_list", (q: any) => q.eq("listId", args.listId))
      .collect();

    // Enrich with user data
    const enriched = await Promise.all(
      partners.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return { ...p, userName: user?.name ?? "Unknown", avatarUrl: user?.avatarUrl };
      })
    );

    return enriched;
  },
});

/**
 * Update a partner's role
 */
export const updateRole = mutation({
  args: {
    partnerId: v.id("listPartners"),
    role: v.union(v.literal("viewer"), v.literal("editor"), v.literal("approver")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const partner = await ctx.db.get(args.partnerId);
    if (!partner) throw new Error("Partner not found");

    const list = await ctx.db.get(partner.listId);
    if (!list || list.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.partnerId, { role: args.role });
    return { success: true };
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
 * Request approval for a list item
 */
export const requestApproval = mutation({
  args: {
    listItemId: v.id("listItems"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.listItemId);
    if (!item) throw new Error("Item not found");

    await ctx.db.patch(args.listItemId, {
      approvalStatus: "pending",
      approvalNote: args.note,
      updatedAt: Date.now(),
    });

    // Notify list owner
    const list = await ctx.db.get(item.listId);
    if (list && list.userId !== user._id) {
      await ctx.db.insert("notifications", {
        userId: list.userId,
        type: "approval_requested",
        title: "Approval Needed",
        body: `${user.name} wants to add "${item.name}" to the list`,
        data: { listItemId: args.listItemId, listId: item.listId },
        read: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Approve or reject a list item
 */
export const handleApproval = mutation({
  args: {
    listItemId: v.id("listItems"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.listItemId);
    if (!item) throw new Error("Item not found");

    const list = await ctx.db.get(item.listId);
    if (!list || list.userId !== user._id) throw new Error("Only list owner can approve");

    await ctx.db.patch(args.listItemId, {
      approvalStatus: args.decision,
      approvalNote: args.note,
      updatedAt: Date.now(),
    });

    // Notify the item creator
    if (item.userId !== user._id) {
      await ctx.db.insert("notifications", {
        userId: item.userId,
        type: `item_${args.decision}`,
        title: args.decision === "approved" ? "Item Approved" : "Item Rejected",
        body: `"${item.name}" was ${args.decision}`,
        data: { listItemId: args.listItemId, listId: item.listId },
        read: false,
        createdAt: Date.now(),
      });
    }

    return { success: true };
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

    const commentId = await ctx.db.insert("itemComments", {
      listItemId: args.listItemId,
      userId: user._id,
      text: args.text,
      createdAt: Date.now(),
    });

    return commentId;
  },
});

/**
 * Get comments for a list item
 */
export const getComments = query({
  args: { listItemId: v.id("listItems") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("itemComments")
      .withIndex("by_item", (q: any) => q.eq("listItemId", args.listItemId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      comments.map(async (c) => {
        const user = await ctx.db.get(c.userId);
        return { ...c, userName: user?.name ?? "Unknown", avatarUrl: user?.avatarUrl };
      })
    );

    return enriched;
  },
});
