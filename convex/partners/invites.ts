import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireFeature } from "../lib/featureGating";
import { requireUser } from "./helpers";

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
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!invite || !invite.isActive || invite.expiresAt < Date.now()) {
      throw new Error("Invalid or expired invite code");
    }

    // Check if already a partner
    const existing = await ctx.db
      .query("listPartners")
      .withIndex("by_list_user", (q) => q.eq("listId", invite.listId).eq("userId", user._id))
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
