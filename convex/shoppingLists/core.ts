import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import {
  requireUser,
  optionalUser,
  getNextListNumber,
  requireEditableList
} from "./helpers";
import { canCreateList } from "../lib/featureGating";
import { toGroceryTitleCase } from "../lib/titleCase";
import { trackFunnelEvent, trackActivity } from "../lib/analytics";
import { getUserListPermissions } from "../partners";

export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];

    const active = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      active.map(async (list) => {
        const items = await ctx.db
          .query("listItems")
          .withIndex("by_list", (q) => q.eq("listId", list._id))
          .collect();

        const checkedCount = items.filter((i) => i.isChecked).length;
        const totalEstimatedCost = items.reduce(
          (sum, i) => sum + (i.estimatedPrice ?? 0) * i.quantity,
          0
        );

        return {
          ...list,
          itemCount: items.length,
          checkedCount,
          totalEstimatedCost: totalEstimatedCost > 0 ? totalEstimatedCost : undefined,
          isInProgress: list.shoppingStartedAt != null && list.completedAt == null,
        };
      })
    );

    return enriched;
  },
});

export const getById = query({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const list = await ctx.db.get(args.id);
    if (!list) return null;

    if (list.userId !== user._id) {
      const partner = await ctx.db
        .query("listPartners")
        .withIndex("by_list_user", (q) =>
          q.eq("listId", args.id).eq("userId", user._id)
        )
        .unique();
      if (!partner || (partner.status !== "accepted" && partner.status !== "pending")) {
        return null;
      }
    }

    return {
      ...list,
      isInProgress: list.shoppingStartedAt != null && list.completedAt == null,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    budget: v.optional(v.number()),
    storeName: v.optional(v.string()),
    normalizedStoreId: v.optional(v.string()),
    plannedDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const rateLimit = await ctx.runMutation(api.aiUsage.checkRateLimit, { feature: "shopping_lists" });
    if (!rateLimit.allowed) {
      throw new Error("Rate limit exceeded. Please wait before creating more lists.");
    }

    const access = await canCreateList(ctx, user._id);
    if (!access.allowed) {
      throw new Error(access.reason ?? "List limit reached");
    }

    const now = Date.now();
    const listNumber = await getNextListNumber(ctx, user._id);

    const listId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: toGroceryTitleCase(args.name),
      status: "active",
      budget: args.budget ?? 50,
      storeName: args.storeName,
      normalizedStoreId: args.normalizedStoreId,
      plannedDate: args.plannedDate,
      listNumber,
      createdAt: now,
      updatedAt: now,
    });

    await trackFunnelEvent(ctx, user._id, "first_list");
    await trackActivity(ctx, user._id, "create_list", { listId, name: args.name });

    return listId;
  },
});

export const update = mutation({
  args: {
    id: v.id("shoppingLists"),
    name: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
    budget: v.optional(v.number()),
    storeName: v.optional(v.string()),
    plannedDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.id);
    if (!list) throw new Error("List not found");
    requireEditableList(list);

    const perms = await getUserListPermissions(ctx, args.id, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = toGroceryTitleCase(args.name);
    if (args.status !== undefined) updates.status = args.status;
    if (args.budget !== undefined) updates.budget = args.budget;
    if (args.storeName !== undefined) updates.storeName = args.storeName;
    if (args.plannedDate !== undefined) updates.plannedDate = args.plannedDate;

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.id);
    if (!list) throw new Error("List not found");

    const perms = await getUserListPermissions(ctx, args.id, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    // Delete list items and their comments
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    for (const item of items) {
      const comments = await ctx.db
        .query("itemComments")
        .withIndex("by_item", (q) => q.eq("listItemId", item._id))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }
      await ctx.db.delete(item._id);
    }

    // Delete list partners
    const partners = await ctx.db
      .query("listPartners")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();
    for (const partner of partners) {
      await ctx.db.delete(partner._id);
    }

    // Delete invite codes
    const inviteCodes = await ctx.db
      .query("inviteCodes")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();
    for (const code of inviteCodes) {
      await ctx.db.delete(code._id);
    }

    // Delete list messages
    const messages = await ctx.db
      .query("listMessages")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
