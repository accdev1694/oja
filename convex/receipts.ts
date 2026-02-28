import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { normalizeStoreName } from "./lib/storeNormalizer";
import { pushReceiptId } from "./lib/receiptHelpers";
import { toGroceryTitleCase } from "./lib/titleCase";
import { trackFunnelEvent, trackActivity } from "./lib/analytics";
import { enrichGlobalFromReceipt } from "./lib/globalEnrichment";

/**
 * Generate a fingerprint for duplicate detection.
 * Based on storeName + total + purchaseDate (day-level granularity).
 */
function generateFingerprint(storeName: string, total: number, purchaseDate: number): string {
  const day = new Date(purchaseDate).toISOString().split("T")[0]; // YYYY-MM-DD
  const normStore = storeName.toLowerCase().trim();
  const normTotal = total.toFixed(2);
  return `${normStore}|${normTotal}|${day}`;
}

/**
 * Get all receipts for the current user
 */
export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const all = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return all.filter((r) => !r.isHidden);
  },
});

/**
 * Get a single receipt by ID
 */
export const getById = query({
  args: { id: v.id("receipts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const receipt = await ctx.db.get(args.id);
    if (!receipt) {
      return null;
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || receipt.userId !== user._id) {
      return null;
    }

    return receipt;
  },
});

/**
 * Create a new receipt (after photo upload)
 */
export const create = mutation({
  args: {
    imageStorageId: v.string(), // Convex file storage ID
    listId: v.optional(v.id("shoppingLists")),
    isAdminSeed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    const initialStoreName = "Unknown Store"; // Will be filled by AI parsing

    const receiptId = await ctx.db.insert("receipts", {
      userId: user._id,
      listId: args.listId,
      imageStorageId: args.imageStorageId,
      storeName: initialStoreName,
      // normalizedStoreId will be set when storeName is updated via AI parsing
      subtotal: 0,
      total: 0,
      items: [],
      processingStatus: "pending",
      purchaseDate: now,
      createdAt: now,
      ...(args.isAdminSeed && { isAdminSeed: true }),
    });

    // Track funnel event: first_receipt
    await trackFunnelEvent(ctx, user._id, "first_receipt");
    
    // Track activity
    await trackActivity(ctx, user._id, "upload_receipt", { receiptId });

    return receiptId;
  },
});

/**
 * Update receipt with parsed data
 */
export const update = mutation({
  args: {
    id: v.id("receipts"),
    storeName: v.optional(v.string()),
    storeAddress: v.optional(v.string()),
    purchaseDate: v.optional(v.number()),
    subtotal: v.optional(v.number()),
    tax: v.optional(v.number()),
    total: v.optional(v.number()),
    processingStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    items: v.optional(
      v.array(
        v.object({
          name: v.string(),
          quantity: v.number(),
          unitPrice: v.number(),
          totalPrice: v.number(),
          category: v.optional(v.string()),
          confidence: v.optional(v.number()),
        })
      )
    ),
    imageQuality: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const receipt = await ctx.db.get(args.id);
    if (!receipt) {
      throw new Error("Receipt not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || receipt.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const updates: Record<string, unknown> = {};

    if (args.storeName !== undefined) {
      updates.storeName = args.storeName;
      // Normalize store name when it changes
      const normalizedStoreId = normalizeStoreName(args.storeName);
      if (normalizedStoreId) {
        updates.normalizedStoreId = normalizedStoreId;
      }
    }
    if (args.storeAddress !== undefined) updates.storeAddress = args.storeAddress;
    if (args.purchaseDate !== undefined) updates.purchaseDate = args.purchaseDate;
    if (args.subtotal !== undefined) updates.subtotal = args.subtotal;
    if (args.tax !== undefined) updates.tax = args.tax;
    if (args.total !== undefined) updates.total = args.total;
    if (args.processingStatus !== undefined) updates.processingStatus = args.processingStatus;
    if (args.items !== undefined) updates.items = args.items.map((item) => ({
      ...item,
      name: toGroceryTitleCase(item.name),
    }));
    if (args.imageQuality !== undefined) updates.imageQuality = args.imageQuality;

    await ctx.db.patch(args.id, updates);

    // Track successful scan and enrich global price DB
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
      await trackActivity(ctx, user._id, "receipt_processed", { 
        receiptId: args.id, 
        storeName: (updates.storeName as string) || receipt.storeName 
      });
    }

    return await ctx.db.get(args.id);
  },
});

/**
 * Soft-delete a receipt — hides from user's profile but preserves
 * crowdsourced price data (priceHistory, currentPrices).
 */
export const remove = mutation({
  args: { id: v.id("receipts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const receipt = await ctx.db.get(args.id);
    if (!receipt) {
      throw new Error("Receipt not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || receipt.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, { isHidden: true });
    return { success: true };
  },
});

/**
 * Link receipt to a shopping list (for reconciliation)
 */
export const linkToList = mutation({
  args: {
    receiptId: v.id("receipts"),
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) {
      throw new Error("Receipt not found");
    }

    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("Shopping list not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || receipt.userId !== user._id || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Link receipt to list
    await ctx.db.patch(args.receiptId, { listId: args.listId });

    // Push to receiptIds array (multi-receipt support) + keep legacy receiptId
    const updatedReceiptIds = pushReceiptId(list, args.receiptId);
    await ctx.db.patch(args.listId, {
      actualTotal: receipt.total,
      receiptId: args.receiptId,
      receiptIds: updatedReceiptIds,
      updatedAt: Date.now(),
    });

    // Match receipt items to list items and correct actual prices
    if (receipt.items && receipt.items.length > 0) {
      const listItems = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q: any) => q.eq("listId", args.listId))
        .collect();

      for (const listItem of listItems) {
        const listItemLower = listItem.name.toLowerCase().trim();

        // Find best matching receipt item (exact or substring match)
        const match = receipt.items.find((ri) => {
          const riLower = ri.name.toLowerCase().trim();
          return (
            riLower === listItemLower ||
            riLower.includes(listItemLower) ||
            listItemLower.includes(riLower)
          );
        });

        if (match) {
          await ctx.db.patch(listItem._id, {
            actualPrice: match.unitPrice,
            isChecked: true,
            // Tag item with the receipt's store (multi-store price intelligence)
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

/**
 * Detect if a receipt's store mismatches the shopping list's store.
 * Also checks against storeSegments (multi-store trips).
 */
export const detectStoreMismatch = query({
  args: {
    receiptId: v.id("receipts"),
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) return null;

    const list = await ctx.db.get(args.listId);
    if (!list) return null;

    const receiptStore = receipt.normalizedStoreId ?? receipt.storeName?.toLowerCase() ?? "unknown";
    const listStore = list.normalizedStoreId ?? list.storeName?.toLowerCase() ?? "unknown";

    // Check primary store match
    if (receiptStore === listStore) {
      return {
        isMismatch: false,
        receiptStore: receipt.storeName,
        listStore: list.storeName ?? "Unknown",
        isKnownSegment: false,
      };
    }

    // Check against storeSegments (visited stores during multi-store trip)
    const segments = list.storeSegments ?? [];
    const isKnownSegment = segments.some((seg) => seg.storeId === receiptStore);

    return {
      isMismatch: !isKnownSegment,
      receiptStore: receipt.storeName,
      listStore: list.storeName ?? "Unknown",
      isKnownSegment,
    };
  },
});

/**
 * Check for duplicate receipt before saving.
 * Returns the existing receipt if a match is found.
 */
export const checkDuplicate = mutation({
  args: {
    receiptId: v.id("receipts"),
    storeName: v.string(),
    total: v.number(),
    purchaseDate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const fingerprint = generateFingerprint(args.storeName, args.total, args.purchaseDate);

    // Check for existing receipt with same fingerprint
    const existing = await ctx.db
      .query("receipts")
      .withIndex("by_user_fingerprint", (q: any) =>
        q.eq("userId", user._id).eq("fingerprint", fingerprint)
      )
      .first();

    if (existing && existing._id !== args.receiptId) {
      return {
        isDuplicate: true,
        existingReceipt: {
          id: existing._id,
          storeName: existing.storeName,
          total: existing.total,
          date: existing.purchaseDate,
        },
      };
    }

    // Set fingerprint on current receipt
    await ctx.db.patch(args.receiptId, { fingerprint });

    return { isDuplicate: false };
  },
});

/**
 * Generate upload URL for receipt image
 */
export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  return await ctx.storage.generateUploadUrl();
});

/**
 * Resolve a list of storage IDs to their public URLs.
 * Returns a record of { storageId → url | null }.
 */
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
