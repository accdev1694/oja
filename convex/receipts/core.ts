import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { normalizeStoreName } from "../lib/storeNormalizer";
import { toGroceryTitleCase } from "../lib/titleCase";
import { cleanItemForStorage } from "../lib/itemNameParser";
import { trackFunnelEvent, trackActivity } from "../lib/analytics";
import { enrichGlobalFromReceipt } from "../lib/globalEnrichment";
import { validateReceiptData } from "../lib/receiptValidation";
import { processEarnPoints } from "../points";
import { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// Input validation constants
const MAX_ITEMS = 500;
const MAX_STRING_LENGTH = 500;
const MAX_PRICE = 100000; // £100,000 max
const MIN_PRICE = 0;

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

/** Clean receipt items using cleanItemForStorage (Rule #13 compliance) */
function cleanReceiptItems(items: Array<{
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  size?: string;
  unit?: string;
  confidence?: number;
}>) {
  return items.map(item => {
    const cleaned = cleanItemForStorage(item.name, item.size, item.unit);
    return {
      ...item,
      name: cleaned.name,
      size: cleaned.size,
      unit: cleaned.unit,
      // Clamp prices to valid bounds
      unitPrice: Math.max(MIN_PRICE, Math.min(MAX_PRICE, item.unitPrice)),
      totalPrice: Math.max(MIN_PRICE, Math.min(MAX_PRICE, item.totalPrice)),
      quantity: Math.max(0, Math.min(9999, item.quantity)),
    };
  });
}

/** Validate receipt input bounds (H2 fix) */
function validateReceiptInput(args: {
  storeName?: string;
  storeAddress?: string;
  items?: unknown[];
  total?: number;
  subtotal?: number;
  tax?: number;
}) {
  if (args.storeName && args.storeName.length > MAX_STRING_LENGTH) {
    throw new Error(`Store name exceeds ${MAX_STRING_LENGTH} characters`);
  }
  if (args.storeAddress && args.storeAddress.length > MAX_STRING_LENGTH) {
    throw new Error(`Store address exceeds ${MAX_STRING_LENGTH} characters`);
  }
  if (args.items && args.items.length > MAX_ITEMS) {
    throw new Error(`Too many items (max ${MAX_ITEMS})`);
  }
  if (args.total !== undefined && (args.total < MIN_PRICE || args.total > MAX_PRICE)) {
    throw new Error(`Total must be between ${MIN_PRICE} and ${MAX_PRICE}`);
  }
  if (args.subtotal !== undefined && (args.subtotal < MIN_PRICE || args.subtotal > MAX_PRICE)) {
    throw new Error(`Subtotal must be between ${MIN_PRICE} and ${MAX_PRICE}`);
  }
  if (args.tax !== undefined && (args.tax < MIN_PRICE || args.tax > MAX_PRICE)) {
    throw new Error(`Tax must be between ${MIN_PRICE} and ${MAX_PRICE}`);
  }
}

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
          await ctx.storage.delete(receipt.imageStorageId as Id<"_storage">);
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

    // Input validation (H2 fix)
    validateReceiptInput(args);

    const now = Date.now();
    const finalStoreName = args.storeName || "Unknown Store";

    const isCompleted = !!args.items;
    // Clean items using cleanItemForStorage (C1 fix - Rule #13 compliance)
    const cleanedItems = args.items ? cleanReceiptItems(args.items) : [];

    const receiptId = await ctx.db.insert("receipts", {
      userId: user._id,
      listId: args.listId,
      imageStorageId: args.imageStorageId,
      storeName: finalStoreName,
      normalizedStoreId: args.storeName ? (normalizeStoreName(args.storeName) ?? undefined) : undefined,
      subtotal: args.subtotal || 0,
      tax: args.tax,
      total: args.total || 0,
      items: cleanedItems,
      processingStatus: isCompleted ? "completed" : "pending",
      purchaseDate: args.purchaseDate || now,
      imageQuality: args.imageQuality,
      imageHash: args.imageHash,
      createdAt: now,
      ...(args.isAdminSeed && { isAdminSeed: true }),
    });

    // Award points when receipt is created directly as completed with imageHash
    if (isCompleted && args.imageHash) {
      // Check for duplicate hash FIRST to prevent race condition
      const existingHash = await ctx.db
        .query("receiptHashes")
        .withIndex("by_hash", (q) => q.eq("imageHash", args.imageHash!))
        .first();

      if (existingHash) {
        // Duplicate receipt - mark as such and skip points
        await ctx.db.patch(receiptId, { fraudFlags: ["duplicate_hash"] });
        return receiptId;
      }

      // Record hash BEFORE validation to win the race
      await ctx.db.insert("receiptHashes", {
        userId: user._id,
        imageHash: args.imageHash,
        receiptId,
        storeName: args.storeName,
        receiptDate: args.purchaseDate,
        totalAmount: args.total,
        ocrConfidence: args.imageQuality,
        firstSeenAt: now,
        createdAt: now,
      });

      // Now validate (hash is already recorded, no race)
      const validation = await validateReceiptData(ctx, user._id, args.imageHash, {
        storeName: args.storeName,
        total: args.total ?? 0,
        purchaseDate: args.purchaseDate,
        items: args.items,
        imageQuality: args.imageQuality,
      });

      if (validation.isValid) {
        const pointsResult = await processEarnPoints(ctx, user._id, receiptId);
        if (pointsResult && pointsResult.earned) {
          // REMAINING-1 fix: Include eventBonus in pointsEarned calculation
          await ctx.db.patch(receiptId, {
            earnedPoints: true,
            pointsEarned: (pointsResult.pointsAmount ?? 0) + (pointsResult.bonusPoints || 0) + (pointsResult.eventBonus || 0),
            fraudFlags: validation.flags,
          });
        } else {
          await ctx.db.patch(receiptId, { fraudFlags: validation.flags });
        }
      } else {
        await ctx.db.patch(receiptId, { fraudFlags: validation.flags });
      }

      await enrichGlobalFromReceipt(ctx as MutationCtx, {
        userId: user._id,
        storeName: finalStoreName,
        normalizedStoreId: args.storeName ? (normalizeStoreName(args.storeName) ?? undefined) : undefined,
        purchaseDate: args.purchaseDate || now,
        items: cleanedItems,
      });
      await trackFunnelEvent(ctx, user._id, "first_scan");
      await trackActivity(ctx, user._id, "receipt_processed", { receiptId, storeName: finalStoreName });
    }

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

    // Input validation (H2 fix)
    validateReceiptInput(args);

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
    // Clean items using cleanItemForStorage (C1 fix - Rule #13 compliance)
    if (args.items !== undefined) updates.items = cleanReceiptItems(args.items);
    if (args.imageQuality !== undefined) updates.imageQuality = args.imageQuality;
    if (args.imageHash !== undefined) updates.imageHash = args.imageHash;

    if (args.processingStatus === "completed" && args.imageHash && !receipt.earnedPoints) {
      // H1 fix: Check for duplicate hash FIRST to prevent race condition (same as create path)
      const existingHash = await ctx.db
        .query("receiptHashes")
        .withIndex("by_hash", (q) => q.eq("imageHash", args.imageHash!))
        .first();

      if (existingHash) {
        // Duplicate receipt - mark as such and skip points
        updates.fraudFlags = ["duplicate_hash"];
        await ctx.db.patch(args.id, updates);
        return await ctx.db.get(args.id);
      }

      // Record hash BEFORE validation to win the race
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

      // Now validate (hash is already recorded, no race)
      const validation = await validateReceiptData(ctx, user._id, args.imageHash, {
        storeName: args.storeName,
        total: args.total ?? receipt.total ?? 0,
        purchaseDate: args.purchaseDate,
        items: args.items,
        imageQuality: args.imageQuality
      });

      updates.fraudFlags = validation.flags;
      if (validation.isValid) {
        const pointsResult = await processEarnPoints(ctx, user._id, args.id);
        if (pointsResult && pointsResult.earned) {
          updates.earnedPoints = true;
          // REMAINING-1 fix: Include eventBonus in pointsEarned calculation
          updates.pointsEarned = (pointsResult.pointsAmount ?? 0) + (pointsResult.bonusPoints || 0) + (pointsResult.eventBonus || 0);
        }
      }
    }

    await ctx.db.patch(args.id, updates);

    if (args.processingStatus === "completed") {
      // Use merged data from updates + original receipt (avoid redundant db.get)
      const finalStoreName = (updates.storeName as string) || receipt.storeName;
      const finalNormalizedStoreId = (updates.normalizedStoreId as string | undefined) || receipt.normalizedStoreId;
      const finalPurchaseDate = (updates.purchaseDate as number) || receipt.purchaseDate;
      const finalItems = (updates.items as typeof receipt.items) || receipt.items;

      if (finalItems && finalItems.length > 0) {
        await enrichGlobalFromReceipt(ctx as MutationCtx, {
          userId: user._id,
          storeName: finalStoreName,
          normalizedStoreId: finalNormalizedStoreId,
          purchaseDate: finalPurchaseDate,
          items: finalItems,
        });
      }
      await trackFunnelEvent(ctx, user._id, "first_scan");
      await trackActivity(ctx, user._id, "receipt_processed", { receiptId: args.id, storeName: finalStoreName });
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
