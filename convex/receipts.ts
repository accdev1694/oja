import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

    return await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
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

    const receiptId = await ctx.db.insert("receipts", {
      userId: user._id,
      listId: args.listId,
      imageStorageId: args.imageStorageId,
      storeName: "Unknown Store", // Will be filled by AI parsing
      subtotal: 0,
      total: 0,
      items: [],
      processingStatus: "pending",
      purchaseDate: now,
      createdAt: now,
    });

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
        })
      )
    ),
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

    if (args.storeName !== undefined) updates.storeName = args.storeName;
    if (args.storeAddress !== undefined) updates.storeAddress = args.storeAddress;
    if (args.purchaseDate !== undefined) updates.purchaseDate = args.purchaseDate;
    if (args.subtotal !== undefined) updates.subtotal = args.subtotal;
    if (args.tax !== undefined) updates.tax = args.tax;
    if (args.total !== undefined) updates.total = args.total;
    if (args.processingStatus !== undefined) updates.processingStatus = args.processingStatus;
    if (args.items !== undefined) updates.items = args.items;

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

/**
 * Delete a receipt
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

    await ctx.db.delete(args.id);
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
    return { success: true };
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
