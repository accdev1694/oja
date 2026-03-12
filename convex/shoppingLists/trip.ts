import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { 
  requireUser, 
  optionalUser, 
  requireEditableList 
} from "./helpers";
import { 
  getStoreInfoSafe, 
} from "../lib/storeNormalizer";
import { getReceiptIds } from "../lib/receiptHelpers";
import { getUserListPermissions } from "../partners";
import { Id } from "../_generated/dataModel";

export const markTripStart = mutation({
  args: { 
    id: v.id("shoppingLists"),
    storeId: v.optional(v.string()),
    storeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.id);
    if (!list) throw new Error("List not found");
    requireEditableList(list);

    const perms = await getUserListPermissions(ctx, args.id, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    if (!list.shoppingStartedAt) {
      await ctx.db.patch(args.id, {
        shoppingStartedAt: Date.now(),
        activeShopperId: user._id,
        normalizedStoreId: args.storeId,
        storeName: args.storeName,
        updatedAt: Date.now(),
      });
    }

    return await ctx.db.get(args.id);
  },
});

export const finishTrip = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.id);
    if (!list) throw new Error("List not found");

    const perms = await getUserListPermissions(ctx, args.id, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const now = Date.now();
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    const actualTotal = items.reduce((sum, item) => {
      if (item.isChecked) {
        return sum + (item.actualPrice || item.estimatedPrice || 0) * item.quantity;
      }
      return sum;
    }, 0);

    const storeMap = new Map<string, { storeName: string; itemCount: number; subtotal: number }>();
    for (const item of items) {
      if (!item.isChecked) continue;
      const storeId = item.purchasedAtStoreId ?? list.normalizedStoreId ?? "unknown";
      const storeName = item.purchasedAtStoreName ?? list.storeName ?? "Unknown";
      const price = item.actualPrice ?? item.estimatedPrice ?? 0;
      const existing = storeMap.get(storeId);
      if (existing) {
        existing.itemCount += 1;
        existing.subtotal += price * item.quantity;
      } else {
        storeMap.set(storeId, { storeName, itemCount: 1, subtotal: price * item.quantity });
      }
    }

    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
      actualTotal: actualTotal > 0 ? actualTotal : undefined,
      activeShopperId: undefined as any,
    });

    const storeBreakdown = Array.from(storeMap.entries()).map(([storeId, data]) => ({
      storeId,
      storeName: data.storeName,
      itemCount: data.itemCount,
      subtotal: Math.round(data.subtotal * 100) / 100,
    }));

    const result = await ctx.db.get(args.id);
    return { ...result, storeBreakdown };
  },
});

export const switchStoreMidShop = mutation({
  args: {
    listId: v.id("shoppingLists"),
    newStoreId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");
    requireEditableList(list);
    
    const perms = await getUserListPermissions(ctx, args.listId, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const storeInfo = getStoreInfoSafe(args.newStoreId);
    if (!storeInfo) throw new Error(`Invalid store: ${args.newStoreId}`);

    const newSegment = {
      storeId: args.newStoreId,
      storeName: storeInfo.displayName,
      switchedAt: Date.now(),
    };

    const existingSegments = list.storeSegments ?? [];

    await ctx.db.patch(args.listId, {
      normalizedStoreId: args.newStoreId,
      storeName: storeInfo.displayName,
      storeSegments: [...existingSegments, newSegment],
      updatedAt: Date.now(),
    });

    return {
      success: true,
      storeName: storeInfo.displayName,
      storeId: args.newStoreId,
      segmentCount: existingSegments.length + 1,
    };
  },
});

export const getTripStats = query({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const list = await ctx.db.get(args.id);
    if (!list) return null;

    if (list.userId !== user._id) {
      const partner = await ctx.db
        .query("listPartners")
        .withIndex("by_list_user", (q: any) =>
          q.eq("listId", args.id).eq("userId", user._id)
        )
        .unique();
      if (!partner || (partner.status !== "accepted" && partner.status !== "pending")) {
        return null;
      }
    }

    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    const checkedItems = items.filter((item) => item.isChecked);
    const uncheckedItems = items.filter((item) => !item.isChecked);

    const estimatedTotal = items.reduce((sum, item) => sum + (item.estimatedPrice ?? 0) * item.quantity, 0);
    const actualSpent = checkedItems.reduce((sum, item) => sum + (item.actualPrice ?? item.estimatedPrice ?? 0) * item.quantity, 0);
    const estimatedTotalForChecked = checkedItems.reduce((sum, item) => sum + (item.estimatedPrice ?? 0) * item.quantity, 0);

    const budget = list.budget ?? 0;

    return {
      checkedCount: checkedItems.length,
      uncheckedCount: uncheckedItems.length,
      uncheckedItems: uncheckedItems.map((item) => ({
        _id: item._id,
        name: item.name,
        quantity: item.quantity,
        estimatedPrice: item.estimatedPrice,
        priority: item.priority,
        category: item.category,
      })),
      totalItems: items.length,
      estimatedTotal,
      actualSpent,
      budget,
      budgetRemaining: budget - actualSpent,
      savings: estimatedTotalForChecked - actualSpent,
      tripDuration: list.shoppingStartedAt ? Date.now() - list.shoppingStartedAt : null,
      storeName: list.storeName,
      storeId: list.normalizedStoreId,
    };
  },
});

export const getTripSummary = query({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const list = await ctx.db.get(args.id);
    if (!list) return null;

    if (list.userId !== user._id) {
      const partner = await ctx.db
        .query("listPartners")
        .withIndex("by_list_user", (q: any) =>
          q.eq("listId", args.id).eq("userId", user._id)
        )
        .unique();
      if (!partner || (partner.status !== "accepted" && partner.status !== "pending")) {
        return null;
      }
    }

    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    const allReceiptIds = getReceiptIds(list);
    const receipts = [];
    for (const rid of allReceiptIds) {
      const r = await ctx.db.get(rid);
      if (r) receipts.push(r);
    }

    if (receipts.length === 0) {
      const linkedReceipts = await ctx.db
        .query("receipts")
        .withIndex("by_list", (q) => q.eq("listId", args.id))
        .collect();
      receipts.push(...linkedReceipts);
    }

    const receipt = receipts.length > 0 ? receipts[0] : null;
    const budget = list.budget ?? 0;
    const actualTotal = list.actualTotal ?? receipt?.total ?? 0;
    const difference = budget - actualTotal;

    const perStoreFromReceipts = new Map<string, { storeName: string; total: number; receiptCount: number }>();
    for (const r of receipts) {
      const sId = r.normalizedStoreId ?? "unknown";
      const existing = perStoreFromReceipts.get(sId);
      if (existing) {
        existing.total += r.total;
        existing.receiptCount += 1;
      } else {
        perStoreFromReceipts.set(sId, { storeName: r.storeName, total: r.total, receiptCount: 1 });
      }
    }

    return {
      list,
      items,
      receipt,
      receipts,
      budget,
      actualTotal,
      difference,
      savedMoney: difference > 0,
      percentSaved: budget > 0 ? (difference / budget) * 100 : 0,
      pointsEarned: list.pointsEarned ?? 0,
      itemCount: items.length,
      checkedCount: items.filter((i) => i.isChecked).length,
      receiptStoreBreakdown: Array.from(perStoreFromReceipts.entries()).map(([storeId, data]) => ({
        storeId,
        storeName: data.storeName,
        total: Math.round(data.total * 100) / 100,
        receiptCount: data.receiptCount,
      })),
    };
  },
});
