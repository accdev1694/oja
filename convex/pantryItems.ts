import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getIconForItem } from "./iconMapping";
import { canAddPantryItem } from "./lib/featureGating";
import { calculateSimilarity } from "./lib/fuzzyMatch";

/**
 * Find an existing pantry item by name (case-insensitive, trimmed).
 * Returns the matching item or null.
 */
async function findExistingPantryItem(
  ctx: MutationCtx,
  userId: Id<"users">,
  name: string,
) {
  const normalized = name.toLowerCase().trim();
  const items = await ctx.db
    .query("pantryItems")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return items.find((item) => item.name.toLowerCase().trim() === normalized) ?? null;
}

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
        defaultSize: v.optional(v.string()),
        defaultUnit: v.optional(v.string()),
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
        // Size context for non-variant items
        ...(item.defaultSize && { defaultSize: item.defaultSize }),
        ...(item.defaultUnit && { defaultUnit: item.defaultUnit }),
        autoAddToList: false,
        createdAt: now,
        updatedAt: now,
      })
    );

    await Promise.all(promises);

    // Gamification: progress "add_items" challenge if active
    if (newItems.length > 0) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const challenges = await ctx.db
          .query("weeklyChallenges")
          .withIndex("by_user", (q: any) => q.eq("userId", user._id))
          .collect();
        const active = challenges.find(
          (c: any) => c.type === "add_items" && c.endDate >= today && !c.completedAt
        );
        if (active) {
          const newProgress = Math.min(active.progress + newItems.length, active.target);
          await ctx.db.patch(active._id, {
            progress: newProgress,
            ...(newProgress >= active.target ? { completedAt: Date.now() } : {}),
          });
        }
      } catch {
        // Non-critical
      }
    }

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
    lastPrice: v.optional(v.number()),
    priceSource: v.optional(v.string()),
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

    // Dedup: return existing item if one matches by name
    const existing = await findExistingPantryItem(ctx, user._id, args.name);
    if (existing) {
      return existing._id;
    }

    // Feature gating: check pantry item limit for free tier
    const access = await canAddPantryItem(ctx, user._id);
    if (!access.allowed) {
      throw new Error(access.reason ?? "Pantry item limit reached");
    }

    const now = Date.now();

    const itemId = await ctx.db.insert("pantryItems", {
      userId: user._id,
      name: args.name,
      category: args.category,
      icon: getIconForItem(args.name, args.category),
      stockLevel: args.stockLevel,
      autoAddToList: args.autoAddToList ?? false,
      lastPrice: args.lastPrice,
      priceSource: args.priceSource,
      createdAt: now,
      updatedAt: now,
    });

    // Gamification: progress "add_items" challenge if active
    try {
      const today = new Date().toISOString().split("T")[0];
      const challenges = await ctx.db
        .query("weeklyChallenges")
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .collect();
      const active = challenges.find(
        (c: any) => c.type === "add_items" && c.endDate >= today && !c.completedAt
      );
      if (active) {
        const newProgress = Math.min(active.progress + 1, active.target);
        await ctx.db.patch(active._id, {
          progress: newProgress,
          ...(newProgress >= active.target ? { completedAt: Date.now() } : {}),
        });
      }
    } catch {
      // Non-critical
    }

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
 * Bulk-restock pantry items from a completed shopping trip.
 * Finds all checked items with a pantryItemId and sets them to "stocked".
 */
export const bulkRestockFromTrip = mutation({
  args: {
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    // Verify list ownership
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) throw new Error("Unauthorized");

    // Get checked items from the list
    const checkedItems = await ctx.db
      .query("listItems")
      .withIndex("by_list_checked", (q) =>
        q.eq("listId", args.listId).eq("isChecked", true)
      )
      .collect();

    const now = Date.now();
    let restockedCount = 0;

    for (const item of checkedItems) {
      if (!item.pantryItemId) continue;

      const pantryItem = await ctx.db.get(item.pantryItemId);
      if (!pantryItem || pantryItem.userId !== user._id) continue;
      if (pantryItem.stockLevel === "stocked") continue;

      await ctx.db.patch(item.pantryItemId, {
        stockLevel: "stocked",
        updatedAt: now,
      });
      restockedCount++;
    }

    return { restockedCount };
  },
});

/**
 * Set the preferred variant for a pantry item.
 * Called when the user selects a variant chip in the list add form.
 */
export const setPreferredVariant = mutation({
  args: {
    itemName: v.string(),
    preferredVariant: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;

    // Find the pantry item by name (case-insensitive)
    const normalizedName = args.itemName.toLowerCase().trim();
    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const match = items.find(
      (item) => item.name.toLowerCase().trim() === normalizedName
    );

    if (match) {
      await ctx.db.patch(match._id, {
        preferredVariant: args.preferredVariant,
        updatedAt: Date.now(),
      });
    }
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
    const debugInfo: { name: string; category: string; oldIcon: string | undefined; newIcon: string }[] = [];

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

    const restockedItems: { pantryItemId: string; name: string }[] = [];
    const fuzzyMatches: {
      receiptItemName: string;
      pantryItemName: string;
      pantryItemId: string;
      similarity: number;
      price?: number;
      size?: string;
      unit?: string;
    }[] = [];
    const itemsToAdd: {
      name: string;
      category?: string;
      price?: number;
      size?: string;
      unit?: string;
    }[] = [];

    const now = Date.now();

    for (const receiptItem of receipt.items) {
      const receiptItemName = receiptItem.name.toLowerCase().trim();

      // Try exact match first
      const exactMatch = pantryItems.find(
        (p) => p.name.toLowerCase().trim() === receiptItemName
      );

      if (exactMatch) {
        // Exact match - auto-restock + update price and size from receipt
        const patchData: Record<string, unknown> = {
          stockLevel: "stocked",
          lastPrice: receiptItem.unitPrice,
          priceSource: "receipt",
          lastStoreName: receipt.storeName,
          // Update size/unit from receipt if available (improves over time)
          ...(receiptItem.size && { defaultSize: receiptItem.size }),
          ...(receiptItem.unit && { defaultUnit: receiptItem.unit }),
          updatedAt: now,
        };

        // Auto-infer preferredVariant from receipt size/unit
        if (receiptItem.size && !exactMatch.preferredVariant) {
          const baseItem = exactMatch.name.toLowerCase().trim();
          const variants = await ctx.db
            .query("itemVariants")
            .withIndex("by_base_item", (q) => q.eq("baseItem", baseItem))
            .collect();

          if (variants.length > 0) {
            // Match by size string (case-insensitive)
            const receiptSize = receiptItem.size.toLowerCase().trim();
            const matched = variants.find(
              (v) => v.size.toLowerCase().trim() === receiptSize
            );
            if (matched) {
              patchData.preferredVariant = matched.variantName;
            }
          }
        }

        await ctx.db.patch(exactMatch._id, patchData);
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
        // Fuzzy match - requires confirmation (include size/unit for later use)
        fuzzyMatches.push({
          receiptItemName: receiptItem.name,
          pantryItemName: bestMatch.item.name,
          pantryItemId: bestMatch.item._id,
          similarity: bestMatch.similarity,
          price: receiptItem.unitPrice,
          size: receiptItem.size ?? undefined,
          unit: receiptItem.unit ?? undefined,
        });
      } else {
        // No match - suggest adding to pantry (include all receipt data)
        itemsToAdd.push({
          name: receiptItem.name,
          category: receiptItem.category,
          price: receiptItem.unitPrice,
          size: receiptItem.size ?? undefined,
          unit: receiptItem.unit ?? undefined,
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
 * Restock pantry items from checked-off list items after shopping completes.
 *
 * For every checked item with a pantryItemId:
 *   - Set stockLevel → "stocked"
 *   - Update lastPrice from actualPrice (or estimatedPrice fallback)
 *   - Set priceSource → "shopping_list"
 *
 * Deduplicates by pantryItemId — if the same pantry item appears multiple
 * times in the list, the highest-priced entry wins (most recent purchase
 * likely reflects current pricing).
 */
export const restockFromCheckedItems = mutation({
  args: {
    listId: v.id("shoppingLists"),
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

    // Verify list ownership
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) {
      throw new Error("List not found or unauthorized");
    }

    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    // Build deduplicated map: pantryItemId → best price
    // If same pantry item appears multiple times, keep the highest price
    const pantryUpdates = new Map<
      Id<"pantryItems">,
      { price: number | undefined; name: string }
    >();

    for (const item of items) {
      if (!item.isChecked || !item.pantryItemId) continue;

      const price = item.actualPrice || item.estimatedPrice;
      const existing = pantryUpdates.get(item.pantryItemId);

      if (
        !existing ||
        (price !== undefined &&
          (existing.price === undefined || price > existing.price))
      ) {
        pantryUpdates.set(item.pantryItemId, { price, name: item.name });
      }
    }

    const now = Date.now();
    const restocked: Id<"pantryItems">[] = [];

    for (const [pantryItemId, { price }] of pantryUpdates) {
      const pantryItem = await ctx.db.get(pantryItemId);
      if (!pantryItem || pantryItem.userId !== user._id) continue;

      await ctx.db.patch(pantryItemId, {
        stockLevel: "stocked" as const,
        updatedAt: now,
        ...(price !== undefined && {
          lastPrice: price,
          priceSource: "shopping_list" as const,
        }),
      });
      restocked.push(pantryItemId);
    }

    return { restockedCount: restocked.length };
  },
});

/**
 * Confirm fuzzy match and restock pantry item
 */
export const confirmFuzzyRestock = mutation({
  args: {
    pantryItemId: v.id("pantryItems"),
    price: v.optional(v.number()),
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
    storeName: v.optional(v.string()),
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

    const patchData: Record<string, unknown> = {
      stockLevel: "stocked",
      ...(args.price !== undefined && {
        lastPrice: args.price,
        priceSource: "receipt",
      }),
      ...(args.storeName && { lastStoreName: args.storeName }),
      // Update size/unit from receipt if available
      ...(args.size && { defaultSize: args.size }),
      ...(args.unit && { defaultUnit: args.unit }),
      updatedAt: Date.now(),
    };

    // Auto-infer preferredVariant from receipt size if not already set
    if (args.size && !pantryItem.preferredVariant) {
      const baseItem = pantryItem.name.toLowerCase().trim();
      const variants = await ctx.db
        .query("itemVariants")
        .withIndex("by_base_item", (q) => q.eq("baseItem", baseItem))
        .collect();

      if (variants.length > 0) {
        const receiptSize = args.size.toLowerCase().trim();
        const matched = variants.find(
          (v) => v.size.toLowerCase().trim() === receiptSize
        );
        if (matched) {
          patchData.preferredVariant = matched.variantName;
        }
      }
    }

    await ctx.db.patch(args.pantryItemId, patchData);

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
    storeName: v.optional(v.string()),
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
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

    // Dedup: if item exists, update price/stock from receipt instead of creating duplicate
    const existing = await findExistingPantryItem(ctx, user._id, args.name);
    if (existing) {
      await ctx.db.patch(existing._id, {
        stockLevel: "stocked",
        ...(args.price !== undefined && {
          lastPrice: args.price,
          priceSource: "receipt" as const,
          ...(args.storeName && { lastStoreName: args.storeName }),
        }),
        ...(args.size && { defaultSize: args.size }),
        ...(args.unit && { defaultUnit: args.unit }),
        updatedAt: now,
      });
      return existing._id;
    }

    const pantryItemId = await ctx.db.insert("pantryItems", {
      userId: user._id,
      name: args.name,
      category: args.category || "other",
      icon: getIconForItem(args.name, args.category || "other"),
      stockLevel: "stocked",
      ...(args.price !== undefined && {
        lastPrice: args.price,
        priceSource: "receipt" as const,
        ...(args.storeName && { lastStoreName: args.storeName }),
      }),
      // Store size/unit from receipt for future price displays
      ...(args.size && { defaultSize: args.size }),
      ...(args.unit && { defaultUnit: args.unit }),
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
