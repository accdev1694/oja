/**
 * Item Matching Queries
 *
 * Read operations for pending receipt-product matches.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import {
  matchReceiptItems,
  type ReceiptItem,
  type CandidateItem,
} from "../lib/itemMatcher";

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get pending matches for a user's receipt.
 */
export const getPendingMatches = query({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("pendingItemMatches")
      .withIndex("by_receipt", (q) => q.eq("receiptId", args.receiptId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

/**
 * Get all pending matches for current user.
 */
export const getMyPendingMatches = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("pendingItemMatches")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "pending")
      )
      .collect();
  },
});

/**
 * Get pending match count for a receipt.
 */
export const getPendingMatchCount = query({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pendingItemMatches")
      .withIndex("by_receipt", (q) => q.eq("receiptId", args.receiptId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return pending.length;
  },
});

/**
 * Identify truly unplanned items in a receipt using multi-signal matching.
 * Returns receipt items that don't match any list items (even with fuzzy matching).
 */
export const identifyUnplannedItems = query({
  args: {
    receiptId: v.id("receipts"),
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { unplannedItems: [], totalUnplanned: 0 };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return { unplannedItems: [], totalUnplanned: 0 };

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) {
      return { unplannedItems: [], totalUnplanned: 0 };
    }

    const listItems = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    if (listItems.length === 0 || receipt.items.length === 0) {
      return {
        unplannedItems: receipt.items.map((item) => ({
          name: item.name,
          totalPrice: item.totalPrice,
          quantity: item.quantity,
        })),
        totalUnplanned: receipt.items.reduce((sum, item) => sum + item.totalPrice, 0),
      };
    }

    const storeId = receipt.normalizedStoreId || "unknown";

    // Convert receipt items to matcher format
    const receiptItemsForMatching: ReceiptItem[] = receipt.items.map((item) => ({
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      category: item.category,
    }));

    // Convert list items to candidates
    const candidates: CandidateItem[] = listItems.map((item) => ({
      id: item._id,
      type: "list_item",
      name: item.name,
      category: item.category,
      estimatedPrice: item.estimatedPrice,
    }));

    // Use multi-signal matcher
    const { matched, unmatched } = await matchReceiptItems(
      ctx,
      receiptItemsForMatching,
      candidates,
      storeId
    );

    // Unmatched items (score < 70%) are truly unplanned
    const unplannedItems = unmatched.map((result) => ({
      name: result.receiptItem.name,
      totalPrice: result.receiptItem.unitPrice * result.receiptItem.quantity,
      quantity: result.receiptItem.quantity,
      bestCandidateScore: result.allCandidates[0]?.score || 0,
    }));

    const totalUnplanned = unplannedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      unplannedItems,
      totalUnplanned,
      matchedCount: matched.length,
    };
  },
});
