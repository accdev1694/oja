import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUser, getUserListPermissions } from "./helpers";

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
