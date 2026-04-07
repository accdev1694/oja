import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUser, getUserListPermissions } from "./helpers";
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
 * Get partners for a list
 */
export const getByList = query({
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

    const partners = await ctx.db
      .query("listPartners")
      .withIndex("by_list", q => q.eq("listId", args.listId))
      .collect();

    // H2 fix: Batch fetch users to avoid N+1
    const userIds = partners.map((p) => p.userId);
    const userMap = await batchGetUsers(ctx, userIds);

    const enriched = partners.map((p) => {
      const u = userMap.get(p.userId);
      return { ...p, userName: u?.name ?? "Unknown", avatarUrl: u?.avatarUrl };
    });

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

    // Get partner user info before deletion for notification
    const partnerUser = await ctx.db.get(partner.userId);

    await ctx.db.delete(args.partnerId);

    // D6 fix: Notify the removed partner
    if (partnerUser) {
      await ctx.db.insert("notifications", {
        userId: partner.userId,
        type: "partner_removed",
        title: "Removed from List",
        body: `You were removed from "${list.name}"`,
        data: { listId: partner.listId },
        read: false,
        createdAt: Date.now(),
      });
    }

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
      .withIndex("by_list_user", q => q.eq("listId", args.listId).eq("userId", user._id))
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
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const partnerships = await ctx.db
      .query("listPartners")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    const acceptedPartnerships = partnerships.filter((p) => p.status === "accepted");
    if (acceptedPartnerships.length === 0) return [];

    // H3 fix: Batch fetch all lists first
    const listIds = acceptedPartnerships.map((p) => p.listId);
    const lists = await Promise.all(listIds.map((id) => ctx.db.get(id)));

    // Collect unique owner IDs and batch fetch
    const ownerIds = lists
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .map((l) => l.userId);
    const ownerMap = await batchGetUsers(ctx, ownerIds);

    // Build result
    const result = acceptedPartnerships
      .map((p, i) => {
        const list = lists[i];
        if (!list) return null;
        const owner = ownerMap.get(list.userId);
        return { ...list, role: p.role, ownerName: owner?.name ?? "Unknown" };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    return result;
  },
});
