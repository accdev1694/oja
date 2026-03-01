/**
 * Item Matching Mutations & Queries
 *
 * Handles the user confirmation flow for receipt ↔ product matching.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  matchReceiptItems,
  learnMapping,
  type ReceiptItem,
  type CandidateItem,
} from "./lib/itemMatcher";

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

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process a receipt and create pending matches for unmatched items.
 * Called after receipt confirmation to identify items needing user input.
 */
export const processReceiptMatching = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) {
      throw new Error("Receipt not found or unauthorized");
    }

    const storeId = receipt.normalizedStoreId || "unknown";

    // Build candidate list from user's active lists and recent pantry items
    const candidates: CandidateItem[] = [];

    // Get items from active/shopping lists at same store
    const activeLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .collect();

    const shoppingLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "shopping")
      )
      .collect();

    const relevantLists = [...activeLists, ...shoppingLists].filter(
      (l) => !l.normalizedStoreId || l.normalizedStoreId === storeId
    );

    for (const list of relevantLists) {
      const listItems = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q) => q.eq("listId", list._id))
        .collect();

      for (const item of listItems) {
        if (!item.isChecked) {
          candidates.push({
            id: item._id,
            type: "list_item",
            name: item.name,
            category: item.category,
            estimatedPrice: item.estimatedPrice,
          });
        }
      }
    }

    // Get recent pantry items
    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(100);

    for (const item of pantryItems) {
      candidates.push({
        id: item._id,
        type: "pantry_item",
        name: item.name,
        category: item.category,
        estimatedPrice: item.lastPrice,
      });
    }

    // Convert receipt items
    const receiptItems: ReceiptItem[] = receipt.items.map((item) => ({
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      category: item.category,
    }));

    // Run matching
    const { matched, unmatched } = await matchReceiptItems(
      ctx,
      receiptItems,
      candidates,
      storeId
    );

    // Create pending matches for unmatched items
    const now = Date.now();
    let pendingCount = 0;

    for (const result of unmatched) {
      // Check if we already have a pending match for this receipt item
      const existing = await ctx.db
        .query("pendingItemMatches")
        .withIndex("by_receipt", (q) => q.eq("receiptId", args.receiptId))
        .filter((q) =>
          q.eq(q.field("receiptItemName"), result.receiptItem.name)
        )
        .first();

      if (existing) continue;

      await ctx.db.insert("pendingItemMatches", {
        userId: user._id,
        receiptId: args.receiptId,
        receiptItemName: result.receiptItem.name,
        receiptItemPrice: result.receiptItem.unitPrice,
        receiptItemQuantity: result.receiptItem.quantity,
        candidateMatches: result.allCandidates.slice(0, 5).map((c) => ({
          listItemId: c.candidate.type === "list_item"
            ? (c.candidate.id as Id<"listItems">)
            : undefined,
          pantryItemId: c.candidate.type === "pantry_item"
            ? (c.candidate.id as Id<"pantryItems">)
            : undefined,
          scannedProductName: c.candidate.name,
          matchScore: c.score,
          matchReason: c.reasons.join(", "),
        })),
        status: "pending",
        createdAt: now,
      });

      pendingCount++;
    }

    // Auto-apply high-confidence matches
    let autoMatched = 0;
    for (const result of matched) {
      if (result.bestMatch) {
        // Learn this mapping for future use
        await learnMapping(
          ctx,
          storeId,
          result.receiptItem.name,
          result.bestMatch.name,
          result.bestMatch.category,
          result.receiptItem.unitPrice,
          user._id
        );

        // Update the matched item's price if it's a list item
        if (result.bestMatch.type === "list_item") {
          await ctx.db.patch(result.bestMatch.id as Id<"listItems">, {
            estimatedPrice: result.receiptItem.unitPrice,
            priceSource: "personal",
            priceConfidence: 0.95,
            updatedAt: now,
          });
          autoMatched++;
        }
      }
    }

    return {
      autoMatched,
      pendingCount,
      totalReceiptItems: receiptItems.length,
    };
  },
});

/**
 * Confirm a pending match.
 * User confirms that a receipt item matches a specific candidate.
 */
export const confirmMatch = mutation({
  args: {
    pendingMatchId: v.id("pendingItemMatches"),
    matchType: v.union(
      v.literal("list_item"),
      v.literal("pantry_item"),
      v.literal("new_item")
    ),
    itemId: v.optional(v.string()),
    canonicalName: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const pendingMatch = await ctx.db.get(args.pendingMatchId);
    if (!pendingMatch || pendingMatch.userId !== user._id) {
      throw new Error("Pending match not found or unauthorized");
    }

    const receipt = await ctx.db.get(pendingMatch.receiptId);
    if (!receipt) throw new Error("Receipt not found");

    const storeId = receipt.normalizedStoreId || "unknown";
    const now = Date.now();

    // Learn this mapping
    await learnMapping(
      ctx,
      storeId,
      pendingMatch.receiptItemName,
      args.canonicalName,
      args.category,
      pendingMatch.receiptItemPrice,
      user._id
    );

    // Update the matched item's price
    if (args.matchType === "list_item" && args.itemId) {
      const listItem = await ctx.db.get(args.itemId as Id<"listItems">);
      if (listItem) {
        await ctx.db.patch(args.itemId as Id<"listItems">, {
          estimatedPrice: pendingMatch.receiptItemPrice,
          priceSource: "personal",
          priceConfidence: 0.95,
          updatedAt: now,
        });
      }
    } else if (args.matchType === "pantry_item" && args.itemId) {
      const pantryItem = await ctx.db.get(args.itemId as Id<"pantryItems">);
      if (pantryItem) {
        await ctx.db.patch(args.itemId as Id<"pantryItems">, {
          lastPrice: pendingMatch.receiptItemPrice,
          updatedAt: now,
        });
      }
    }

    // Mark as confirmed
    await ctx.db.patch(args.pendingMatchId, {
      status: "confirmed",
      confirmedMatch: {
        type: args.matchType,
        itemId: args.itemId,
        canonicalName: args.canonicalName,
      },
      resolvedAt: now,
    });

    return { success: true };
  },
});

/**
 * Skip a pending match (user doesn't want to match it).
 */
export const skipMatch = mutation({
  args: {
    pendingMatchId: v.id("pendingItemMatches"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const pendingMatch = await ctx.db.get(args.pendingMatchId);
    if (!pendingMatch || pendingMatch.userId !== user._id) {
      throw new Error("Pending match not found or unauthorized");
    }

    await ctx.db.patch(args.pendingMatchId, {
      status: "skipped",
      resolvedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark a pending match as "no match" (receipt item has no corresponding product).
 */
export const markNoMatch = mutation({
  args: {
    pendingMatchId: v.id("pendingItemMatches"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const pendingMatch = await ctx.db.get(args.pendingMatchId);
    if (!pendingMatch || pendingMatch.userId !== user._id) {
      throw new Error("Pending match not found or unauthorized");
    }

    await ctx.db.patch(args.pendingMatchId, {
      status: "no_match",
      resolvedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Bulk resolve all pending matches for a receipt (skip all).
 */
export const skipAllPendingMatches = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const pending = await ctx.db
      .query("pendingItemMatches")
      .withIndex("by_receipt", (q) => q.eq("receiptId", args.receiptId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const now = Date.now();
    for (const match of pending) {
      if (match.userId === user._id) {
        await ctx.db.patch(match._id, {
          status: "skipped",
          resolvedAt: now,
        });
      }
    }

    return { skipped: pending.length };
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
