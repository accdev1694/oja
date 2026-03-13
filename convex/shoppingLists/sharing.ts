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
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const sharedLists = await Promise.all(
      partners.map(async p => {
        const list = await ctx.db.get(p.listId);
        if (!list) return null;
        
        const items = await ctx.db
          .query("listItems")
          .withIndex("by_list", (q) => q.eq("listId", list._id as Id<"shoppingLists">))
          .collect();

        return {
          ...list,
          itemCount: items.length,
          checkedCount: items.filter((i) => i.isChecked).length,
          role: p.role,
          partnerStatus: p.status,
        };
      })
    );

    return sharedLists.filter((l) => l !== null);
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
      .collect();

    const completed = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "completed")
      )
      .order("desc")
      .collect();

    return [...archived, ...completed].sort(
      (a, b) => (b.completedAt ?? b.updatedAt) - (a.completedAt ?? a.updatedAt)
    );
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

    await ctx.db.patch(args.id, {
      normalizedStoreId: args.normalizedStoreId,
      storeName: storeInfo.displayName,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});
