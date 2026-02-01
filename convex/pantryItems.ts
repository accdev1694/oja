import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getIconForItem } from "./iconMapping";

/**
 * Bulk create pantry items for a user
 * Used during onboarding to seed the pantry
 */
export const bulkCreate = mutation({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        category: v.string(),
        stockLevel: v.union(
          v.literal("stocked"),
          v.literal("low"),
          v.literal("out")
        ),
        estimatedPrice: v.optional(v.number()),
        hasVariants: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    // Get existing items to avoid duplicates
    const existing = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const existingNames = new Set(
      existing.map((e) => e.name.toLowerCase().trim())
    );

    // Insert only items that don't already exist
    const newItems = args.items.filter(
      (item) => !existingNames.has(item.name.toLowerCase().trim())
    );

    const promises = newItems.map((item) =>
      ctx.db.insert("pantryItems", {
        userId: user._id,
        name: item.name,
        category: item.category,
        icon: getIconForItem(item.name, item.category),
        stockLevel: item.stockLevel,
        // Price seeding from AI estimates
        ...(item.estimatedPrice !== undefined && {
          lastPrice: item.estimatedPrice,
          priceSource: "ai_estimate" as const,
        }),
        autoAddToList: false,
        createdAt: now,
        updatedAt: now,
      })
    );

    await Promise.all(promises);

    return { count: promises.length, skipped: args.items.length - newItems.length };
  },
});

/**
 * Get all pantry items for the current user
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
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/**
 * Get a single pantry item by ID
 */
export const getById = query({
  args: { id: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      return null;
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || item.userId !== user._id) {
      return null;
    }

    return item;
  },
});

/**
 * Create a new pantry item
 */
export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    stockLevel: v.union(
      v.literal("stocked"),
      v.literal("low"),
      v.literal("out")
    ),
    autoAddToList: v.optional(v.boolean()),
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

    const itemId = await ctx.db.insert("pantryItems", {
      userId: user._id,
      name: args.name,
      category: args.category,
      icon: getIconForItem(args.name, args.category),
      stockLevel: args.stockLevel,
      autoAddToList: args.autoAddToList ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return itemId;
  },
});

/**
 * Update a pantry item
 */
export const update = mutation({
  args: {
    id: v.id("pantryItems"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    stockLevel: v.optional(
      v.union(
        v.literal("stocked"),
        v.literal("low"),
        v.literal("out")
      )
    ),
    autoAddToList: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || item.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.category !== undefined) updates.category = args.category;
    if (args.stockLevel !== undefined) updates.stockLevel = args.stockLevel;
    if (args.autoAddToList !== undefined) updates.autoAddToList = args.autoAddToList;

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

/**
 * Delete a pantry item
 */
export const remove = mutation({
  args: { id: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || item.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Update just the stock level of an item (optimized for frequent updates)
 */
export const updateStockLevel = mutation({
  args: {
    id: v.id("pantryItems"),
    stockLevel: v.union(
      v.literal("stocked"),
      v.literal("low"),
      v.literal("out")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Item not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || item.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      stockLevel: args.stockLevel,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Migrate existing items to have icons
 * Re-assigns icons to ALL items using the mapping
 */
export const migrateIcons = mutation({
  args: {
    forceAll: v.optional(v.boolean()),
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

    // Get all items for this user
    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let updated = 0;
    const debugInfo: Array<{ name: string; category: string; oldIcon: string | undefined; newIcon: string }> = [];

    for (const item of items) {
      // Update if no icon OR if forceAll is true
      if (!item.icon || args.forceAll) {
        const icon = getIconForItem(item.name, item.category);
        debugInfo.push({
          name: item.name,
          category: item.category,
          oldIcon: item.icon,
          newIcon: icon,
        });
        await ctx.db.patch(item._id, {
          icon,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    // Log first 5 items for debugging
    console.log("Migration debug - first 5 items:", JSON.stringify(debugInfo.slice(0, 5)));

    return { updated, total: items.length };
  },
});

/**
 * Calculate Levenshtein distance between two strings (for fuzzy matching)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity percentage between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();

  if (normalized1 === normalized2) return 100;

  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(normalized1, normalized2);
  return ((maxLen - distance) / maxLen) * 100;
}

/**
 * Auto-restock pantry items from receipt
 * Returns items that were restocked, fuzzy matches, and items to add
 */
export const autoRestockFromReceipt = mutation({
  args: {
    receiptId: v.id("receipts"),
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

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) {
      throw new Error("Receipt not found or unauthorized");
    }

    // Get all pantry items
    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const restockedItems: Array<{ pantryItemId: string; name: string }> = [];
    const fuzzyMatches: Array<{
      receiptItemName: string;
      pantryItemName: string;
      pantryItemId: string;
      similarity: number;
    }> = [];
    const itemsToAdd: Array<{ name: string; category?: string }> = [];

    const now = Date.now();

    for (const receiptItem of receipt.items) {
      const receiptItemName = receiptItem.name.toLowerCase().trim();

      // Try exact match first
      const exactMatch = pantryItems.find(
        (p) => p.name.toLowerCase().trim() === receiptItemName
      );

      if (exactMatch) {
        // Exact match - auto-restock + update price from receipt
        await ctx.db.patch(exactMatch._id, {
          stockLevel: "stocked",
          lastPrice: receiptItem.unitPrice,
          priceSource: "receipt",
          updatedAt: now,
        });
        restockedItems.push({
          pantryItemId: exactMatch._id,
          name: exactMatch.name,
        });
        continue;
      }

      // Try fuzzy match (>80% similarity)
      let bestMatch: { item: (typeof pantryItems)[0]; similarity: number } | null =
        null;

      for (const pantryItem of pantryItems) {
        const similarity = calculateSimilarity(receiptItem.name, pantryItem.name);
        if (similarity > 80 && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = { item: pantryItem, similarity };
        }
      }

      if (bestMatch) {
        // Fuzzy match - requires confirmation
        fuzzyMatches.push({
          receiptItemName: receiptItem.name,
          pantryItemName: bestMatch.item.name,
          pantryItemId: bestMatch.item._id,
          similarity: bestMatch.similarity,
        });
      } else {
        // No match - suggest adding to pantry
        itemsToAdd.push({
          name: receiptItem.name,
          category: receiptItem.category,
        });
      }
    }

    return {
      restockedItems,
      fuzzyMatches,
      itemsToAdd,
    };
  },
});

/**
 * Confirm fuzzy match and restock pantry item
 */
export const confirmFuzzyRestock = mutation({
  args: {
    pantryItemId: v.id("pantryItems"),
    price: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const pantryItem = await ctx.db.get(args.pantryItemId);
    if (!pantryItem) {
      throw new Error("Pantry item not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || pantryItem.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.pantryItemId, {
      stockLevel: "stocked",
      ...(args.price !== undefined && {
        lastPrice: args.price,
        priceSource: "receipt",
      }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Add new item to pantry from receipt
 */
export const addFromReceipt = mutation({
  args: {
    name: v.string(),
    category: v.optional(v.string()),
    price: v.optional(v.number()),
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

    const pantryItemId = await ctx.db.insert("pantryItems", {
      userId: user._id,
      name: args.name,
      category: args.category || "other",
      icon: getIconForItem(args.name, args.category || "other"),
      stockLevel: "stocked",
      ...(args.price !== undefined && {
        lastPrice: args.price,
        priceSource: "receipt" as const,
      }),
      autoAddToList: false,
      createdAt: now,
      updatedAt: now,
    });

    return pantryItemId;
  },
});

/**
 * Migrate stock levels from 5-level to 3-level system.
 * Maps: "good" → "stocked", "half" → "low"
 */
export const migrateStockLevels = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let migrated = 0;
    for (const item of items) {
      const level = item.stockLevel as string;
      if (level === "good") {
        await ctx.db.patch(item._id, { stockLevel: "stocked", updatedAt: Date.now() });
        migrated++;
      } else if (level === "half") {
        await ctx.db.patch(item._id, { stockLevel: "low", updatedAt: Date.now() });
        migrated++;
      }
    }

    return { migrated, total: items.length };
  },
});

/**
 * Remove duplicate pantry items (keeps the most recently updated one).
 */
export const removeDuplicates = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Group by lowercase name
    const byName: Record<string, typeof items> = {};
    for (const item of items) {
      const key = item.name.toLowerCase().trim();
      if (!byName[key]) byName[key] = [];
      byName[key].push(item);
    }

    let removed = 0;
    for (const [, dupes] of Object.entries(byName)) {
      if (dupes.length <= 1) continue;
      // Keep the one with the latest updatedAt
      dupes.sort((a, b) => b.updatedAt - a.updatedAt);
      for (let i = 1; i < dupes.length; i++) {
        await ctx.db.delete(dupes[i]._id);
        removed++;
      }
    }

    return { removed, totalBefore: items.length, totalAfter: items.length - removed };
  },
});
