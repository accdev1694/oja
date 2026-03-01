/**
 * Image Optimization Migration
 *
 * Fetches all receipt images that need optimization and provides mutations
 * to update records after client-side optimization.
 */

import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get all receipt images that need optimization.
 * Returns records from receipts that have imageStorageId.
 */
export const getImagesToOptimize = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { receipts: [], listItems: [], pantryItems: [], total: 0 };

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return { receipts: [], listItems: [], pantryItems: [], total: 0 };

    // Get all receipts with images
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const receiptsWithImages = receipts
      .filter((r) => r.imageStorageId)
      .map((r) => ({
        _id: r._id,
        type: "receipt" as const,
        imageStorageId: r.imageStorageId!,
      }));

    // Note: listItems and pantryItems don't have imageStorageId in schema
    // They store images in itemVariants (community product photos)
    // For now, we only optimize receipt images

    return {
      receipts: receiptsWithImages,
      listItems: [], // Not supported - no imageStorageId field
      pantryItems: [], // Not supported - no imageStorageId field
      total: receiptsWithImages.length,
    };
  },
});

/**
 * Update a receipt's imageStorageId after optimization.
 */
export const updateReceiptImage = mutation({
  args: {
    receiptId: v.id("receipts"),
    oldStorageId: v.string(),
    newStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) throw new Error("Receipt not found");

    // Verify old storage ID matches
    if (receipt.imageStorageId !== args.oldStorageId) {
      throw new Error("Storage ID mismatch - image may have already been optimized");
    }

    // Update to new optimized image
    await ctx.db.patch(args.receiptId, {
      imageStorageId: args.newStorageId,
    });

    // Delete old image from storage
    try {
      await ctx.storage.delete(args.oldStorageId as Id<"_storage">);
    } catch (e) {
      console.warn("Failed to delete old image:", e);
    }

    return { success: true };
  },
});

/**
 * Update a list item's imageStorageId after optimization.
 * Note: Currently not supported as listItems don't have imageStorageId.
 */
export const updateListItemImage = mutation({
  args: {
    listItemId: v.id("listItems"),
    oldStorageId: v.string(),
    newStorageId: v.id("_storage"),
  },
  handler: async (_ctx, _args) => {
    // listItems don't have imageStorageId in schema
    throw new Error("listItems don't support imageStorageId - use itemVariants instead");
  },
});

/**
 * Update a pantry item's imageStorageId after optimization.
 * Note: Currently not supported as pantryItems don't have imageStorageId.
 */
export const updatePantryItemImage = mutation({
  args: {
    pantryItemId: v.id("pantryItems"),
    oldStorageId: v.string(),
    newStorageId: v.id("_storage"),
  },
  handler: async (_ctx, _args) => {
    // pantryItems don't have imageStorageId in schema
    throw new Error("pantryItems don't support imageStorageId - use itemVariants instead");
  },
});

/**
 * Mark migration as complete for tracking.
 */
export const markMigrationComplete = mutation({
  args: {
    imagesOptimized: v.number(),
    bytesFreed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return;

    // Log the migration completion
    console.log(`[Image Migration] User ${user._id} optimized ${args.imagesOptimized} images`);
    if (args.bytesFreed) {
      console.log(`[Image Migration] Freed approximately ${(args.bytesFreed / 1024 / 1024).toFixed(2)} MB`);
    }

    return { success: true };
  },
});
