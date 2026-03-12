import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { normalizeStoreName } from "../lib/storeNormalizer";
import { toGroceryTitleCase } from "../lib/titleCase";
import { trackFunnelEvent, trackActivity } from "../lib/analytics";
import { enrichGlobalFromReceipt } from "../lib/globalEnrichment";
import { validateReceiptData } from "../lib/receiptValidation";
import { processEarnPoints } from "../points";
import { MutationCtx } from "../_generated/server";

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

export const cleanupOldImages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sixMonthsAgo = Date.now() - SIX_MONTHS_MS;
    const oldReceipts = await ctx.db
      .query("receipts")
      .withIndex("by_created", (q) => q.lt("createdAt", sixMonthsAgo))
      .filter((q) => q.neq(q.field("imageStorageId"), undefined))
      .collect();

    let deletedCount = 0;
    for (const receipt of oldReceipts) {
      if (receipt.imageStorageId) {
        try {
          await ctx.storage.delete(receipt.imageStorageId as any);
          await ctx.db.patch(receipt._id, { imageStorageId: undefined });
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete storage image ${receipt.imageStorageId}:`, error);
        }
      }
    }
    return { deleted: deletedCount };
  },
});

export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) return [];
    const all = await ctx.db.query("receipts").withIndex("by_user", (q) => q.eq("userId", user._id)).order("desc").collect();
    return all.filter((r) => !r.isHidden);
  },
});

export const getById = query({
  args: { id: v.id("receipts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const receipt = await ctx.db.get(args.id);
    if (!receipt) return null;
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user || receipt.userId !== user._id) return null;
    return receipt;
  },
});

export const create = mutation({
  args: {
    imageStorageId: v.string(),
    listId: v.optional(v.id("shoppingLists")),
    isAdminSeed: v.optional(v.boolean()),
    storeName: v.optional(v.string()),
    storeAddress: v.optional(v.string()),
    purchaseDate: v.optional(v.number()),
    subtotal: v.optional(v.number()),
    tax: v.optional(v.number()),
    total: v.optional(v.number()),
    items: v.optional(v.array(v.object({
      name: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      totalPrice: v.number(),
      category: v.optional(v.string()),
      size: v.optional(v.string()),
      unit: v.optional(v.string()),
      confidence: v.optional(v.number()),
    }))),
    imageQuality: v.optional(v.number()),
    imageHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user) throw new Error("User not found");

    const now = Date.now();
    const finalStoreName = args.storeName || "Unknown Store";

    const receiptId = await ctx.db.insert("receipts", {
      userId: user._id,
      listId: args.listId,
      imageStorageId: args.imageStorageId,
      storeName: finalStoreName,
      normalizedStoreId: args.storeName ? (normalizeStoreName(args.storeName) ?? undefined) : undefined,
      subtotal: args.subtotal || 0,
      tax: args.tax,
      total: args.total || 0,
      items: (args.items || []).map(item => ({ ...item, name: toGroceryTitleCase(item.name) })),
      processingStatus: args.items ? "completed" : "pending",
      purchaseDate: args.purchaseDate || now,
      imageQuality: args.imageQuality,
      imageHash: args.imageHash,
      createdAt: now,
      ...(args.isAdminSeed && { isAdminSeed: true }),
    });

    await trackFunnelEvent(ctx, user._id, "first_receipt");
    await trackActivity(ctx, user._id, "upload_receipt", { receiptId });
    return receiptId;
  },
});

export const update = mutation({
  args: {
    id: v.id("receipts"),
    storeName: v.optional(v.string()),
    storeAddress: v.optional(v.string()),
    purchaseDate: v.optional(v.number()),
    subtotal: v.optional(v.number()),
    tax: v.optional(v.number()),
    total: v.optional(v.number()),
    processingStatus: v.optional(v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed"))),
    items: v.optional(v.array(v.object({
      name: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      totalPrice: v.number(),
      category: v.optional(v.string()),
      size: v.optional(v.string()),
      unit: v.optional(v.string()),
      confidence: v.optional(v.number()),
    }))),
    imageQuality: v.optional(v.number()),
    imageHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const receipt = await ctx.db.get(args.id);
    if (!receipt) throw new Error("Receipt not found");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user || receipt.userId !== user._id) throw new Error("Unauthorized");

    const updates: Record<string, unknown> = {};
    if (args.storeName !== undefined) {
      updates.storeName = args.storeName;
      const normalizedStoreId = normalizeStoreName(args.storeName);
      if (normalizedStoreId) updates.normalizedStoreId = normalizedStoreId;
    }
    if (args.storeAddress !== undefined) updates.storeAddress = args.storeAddress;
    if (args.purchaseDate !== undefined) updates.purchaseDate = args.purchaseDate;
    if (args.subtotal !== undefined) updates.subtotal = args.subtotal;
    if (args.tax !== undefined) updates.tax = args.tax;
    if (args.total !== undefined) updates.total = args.total;
    if (args.processingStatus !== undefined) updates.processingStatus = args.processingStatus;
    if (args.items !== undefined) updates.items = args.items.map((item) => ({ ...item, name: toGroceryTitleCase(item.name) }));
    if (args.imageQuality !== undefined) updates.imageQuality = args.imageQuality;
    if (args.imageHash !== undefined) updates.imageHash = args.imageHash;

    if (args.processingStatus === "completed" && args.imageHash) {
      await ctx.db.insert("receiptHashes", {
        userId: user._id,
        imageHash: args.imageHash,
        receiptId: args.id,
        storeName: args.storeName,
        receiptDate: args.purchaseDate,
        totalAmount: args.total,
        ocrConfidence: args.imageQuality,
        firstSeenAt: Date.now(),
        createdAt: Date.now(),
      });

      const validation = await validateReceiptData(ctx, user._id, args.imageHash, {
        storeName: args.storeName,
        total: args.total,
        purchaseDate: args.purchaseDate,
        items: args.items,
        imageQuality: args.imageQuality
      });

      updates.fraudFlags = validation.flags;
      if (validation.isValid && !receipt.earnedPoints) {
        const pointsResult = await processEarnPoints(ctx, user._id, args.id);
        if (pointsResult && pointsResult.earned) {
          updates.earnedPoints = true;
          updates.pointsEarned = (pointsResult.pointsAmount ?? 0) + (pointsResult.bonusPoints || 0);
        }
      }
    }

    await ctx.db.patch(args.id, updates);

    if (args.processingStatus === "completed") {
      const finalReceipt = await ctx.db.get(args.id);
      if (finalReceipt && finalReceipt.items) {
        await enrichGlobalFromReceipt(ctx as MutationCtx, {
          userId: user._id,
          storeName: finalReceipt.storeName,
          normalizedStoreId: finalReceipt.normalizedStoreId,
          purchaseDate: finalReceipt.purchaseDate,
          items: finalReceipt.items,
        });
      }
      await trackFunnelEvent(ctx, user._id, "first_scan");
      await trackActivity(ctx, user._id, "receipt_processed", { receiptId: args.id, storeName: (updates.storeName as string) || receipt.storeName });
    }

    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("receipts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const receipt = await ctx.db.get(args.id);
    if (!receipt) throw new Error("Receipt not found");
    const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!user || receipt.userId !== user._id) throw new Error("Unauthorized");

    if (receipt.earnedPoints && receipt.pointsEarned && receipt.pointsEarned > 0) {
      await ctx.runMutation(internal.points.refundPoints, {
        userId: user._id,
        receiptId: args.id,
        points: receipt.pointsEarned,
      });
    }

    await ctx.db.patch(args.id, { isHidden: true });
    return { success: true };
  },
});
