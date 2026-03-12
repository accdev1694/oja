import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { pushReceiptId } from "../lib/receiptHelpers";

export const linkToList = mutation({
  args: {
    receiptId: v.id("receipts"),
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) throw new Error("Receipt not found");

    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("Shopping list not found");

    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user || receipt.userId !== user._id || list.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.receiptId, { listId: args.listId });

    const updatedReceiptIds = pushReceiptId(list, args.receiptId);
    await ctx.db.patch(args.listId, {
      actualTotal: receipt.total,
      receiptId: args.receiptId,
      receiptIds: updatedReceiptIds,
      updatedAt: Date.now(),
    });

    if (receipt.items && receipt.items.length > 0) {
      const listItems = await ctx.db.query("listItems").withIndex("by_list", (q: any) => q.eq("listId", args.listId)).collect();
      for (const listItem of listItems) {
        const listItemLower = listItem.name.toLowerCase().trim();
        const match = receipt.items.find((ri) => {
          const riLower = ri.name.toLowerCase().trim();
          return riLower === listItemLower || riLower.includes(listItemLower) || listItemLower.includes(riLower);
        });
        if (match) {
          await ctx.db.patch(listItem._id, {
            actualPrice: match.unitPrice,
            isChecked: true,
            purchasedAtStoreId: receipt.normalizedStoreId ?? undefined,
            purchasedAtStoreName: receipt.storeName ?? undefined,
            updatedAt: Date.now(),
          });
        }
      }
    }
    return { success: true };
  },
});

export const detectStoreMismatch = query({
  args: { receiptId: v.id("receipts"), listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) return null;

    const list = await ctx.db.get(args.listId);
    if (!list) return null;

    const receiptStore = receipt.normalizedStoreId ?? receipt.storeName?.toLowerCase() ?? "unknown";
    const listStore = list.normalizedStoreId ?? list.storeName?.toLowerCase() ?? "unknown";

    if (receiptStore === listStore) {
      return { isMismatch: false, receiptStore: receipt.storeName, listStore: list.storeName ?? "Unknown", isKnownSegment: false };
    }

    const segments = list.storeSegments ?? [];
    const isKnownSegment = segments.some((seg) => seg.storeId === receiptStore);
    return { isMismatch: !isKnownSegment, receiptStore: receipt.storeName, listStore: list.storeName ?? "Unknown", isKnownSegment };
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return await ctx.storage.generateUploadUrl();
});

export const getStorageUrls = query({
  args: { storageIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const result: Record<string, string | null> = {};
    await Promise.all(
      args.storageIds.map(async (id) => {
        try {
          result[id] = await ctx.storage.getUrl(id as never);
        } catch {
          result[id] = null;
        }
      })
    );
    return result;
  },
});
