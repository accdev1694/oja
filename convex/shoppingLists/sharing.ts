import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { 
  requireUser, 
  optionalUser, 
  requireEditableList 
} from "./helpers";
import { 
  getStoreInfoSafe, 
  isValidStoreId 
} from "../lib/storeNormalizer";
import { getReceiptIds, pushReceiptId } from "../lib/receiptHelpers";
import { getUserListPermissions } from "../partners";
import { Id } from "../_generated/dataModel";

export const getShared = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];

    const partners = await ctx.db
      .query("listPartners")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    if (partners.length === 0) return [];

    // H6 fix: Batch fetch all lists first
    const listIds = partners.map((p) => p.listId);
    const lists = await Promise.all(listIds.map((id) => ctx.db.get(id)));

    // Batch fetch all items for all lists
    const allItems = await ctx.db
      .query("listItems")
      .withIndex("by_list")
      .collect();

    // Filter items to only those belonging to our lists
    const listIdSet = new Set(listIds.map(String));
    const itemsByList = new Map<string, { total: number; checked: number }>();
    for (const item of allItems) {
      if (listIdSet.has(String(item.listId))) {
        const key = String(item.listId);
        const current = itemsByList.get(key) || { total: 0, checked: 0 };
        current.total++;
        if (item.isChecked) current.checked++;
        itemsByList.set(key, current);
      }
    }

    const sharedLists = partners
      .map((p, i) => {
        const list = lists[i];
        if (!list) return null;
        const counts = itemsByList.get(String(list._id)) || { total: 0, checked: 0 };
        return {
          ...list,
          itemCount: counts.total,
          checkedCount: counts.checked,
          role: p.role,
          partnerStatus: p.status,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    return sharedLists;
  },
});

export const archiveList = mutation({
  args: {
    id: v.id("shoppingLists"),
    receiptId: v.optional(v.id("receipts")),
    actualTotal: v.optional(v.number()),
    pointsEarned: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.id);
    if (!list) throw new Error("List not found");

    const perms = await getUserListPermissions(ctx, args.id, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const now = Date.now();
    const receiptIds = args.receiptId ? pushReceiptId(list, args.receiptId) : getReceiptIds(list);
    await ctx.db.patch(args.id, {
      status: "archived",
      archivedAt: now,
      completedAt: list.completedAt ?? now,
      receiptId: args.receiptId,
      receiptIds,
      actualTotal: args.actualTotal,
      pointsEarned: args.pointsEarned,
      updatedAt: now,
    });

    // Deactivate partner access — archived lists are read-only
    const partners = await ctx.db
      .query("listPartners")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();
    for (const partner of partners) {
      await ctx.db.delete(partner._id);
    }

    return await ctx.db.get(args.id);
  },
});

export const getHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];

    const archived = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "archived")
      )
      .order("desc")
      .take(100);

    const completed = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "completed")
      )
      .order("desc")
      .take(100);

    const sorted = [...archived, ...completed].sort(
      (a, b) => (b.createdAt ?? b._creationTime) - (a.createdAt ?? a._creationTime)
    );

    if (sorted.length === 0) return [];

    // H7 fix: Batch fetch all items for all lists
    const listIds = sorted.map((l) => l._id);
    const allItems = await ctx.db
      .query("listItems")
      .withIndex("by_list")
      .collect();

    // Filter and count by list
    const listIdSet = new Set(listIds.map(String));
    const itemsByList = new Map<string, { total: number; checked: number }>();
    for (const item of allItems) {
      if (listIdSet.has(String(item.listId))) {
        const key = String(item.listId);
        const current = itemsByList.get(key) || { total: 0, checked: 0 };
        current.total++;
        if (item.isChecked) current.checked++;
        itemsByList.set(key, current);
      }
    }

    const enriched = sorted.map((list) => {
      const counts = itemsByList.get(String(list._id)) || { total: 0, checked: 0 };
      return {
        ...list,
        itemCount: counts.total,
        checkedCount: counts.checked,
      };
    });

    return enriched;
  },
});

export const getCompletedWithStores = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];

    const completed = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "completed")
      )
      .order("desc")
      .collect();

    return completed.map((list) => {
      const storeNames: string[] = [];
      if (list.storeSegments && list.storeSegments.length > 0) {
        for (const seg of list.storeSegments) {
          if (!storeNames.includes(seg.storeName)) {
            storeNames.push(seg.storeName);
          }
        }
      } else if (list.storeName) {
        storeNames.push(list.storeName);
      }
      return { ...list, storeNames };
    });
  },
});

export const setStore = mutation({
  args: {
    id: v.id("shoppingLists"),
    normalizedStoreId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.id);
    if (!list) throw new Error("List not found");
    requireEditableList(list);

    const perms = await getUserListPermissions(ctx, args.id, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    if (!isValidStoreId(args.normalizedStoreId)) {
      throw new Error(`Invalid store ID: ${args.normalizedStoreId}`);
    }

    const storeInfo = getStoreInfoSafe(args.normalizedStoreId);
    if (!storeInfo) throw new Error(`Store not found: ${args.normalizedStoreId}`);

    // Track store history in storeSegments
    const existingSegments = list.storeSegments ?? [];
    const lastSegment = existingSegments[existingSegments.length - 1];
    const newSegments =
      lastSegment?.storeId === args.normalizedStoreId
        ? existingSegments
        : [
            ...existingSegments,
            {
              storeId: args.normalizedStoreId,
              storeName: storeInfo.displayName,
              switchedAt: Date.now(),
            },
          ];

    await ctx.db.patch(args.id, {
      normalizedStoreId: args.normalizedStoreId,
      storeName: storeInfo.displayName,
      storeSegments: newSegments,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});
