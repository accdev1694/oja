import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getIconForItem } from "./iconMapping";
import { canAddPantryItem } from "./lib/featureGating";
import { calculateSimilarity, isDuplicateItemName, isDuplicateItem, normalizeItemName } from "./lib/fuzzyMatch";
import { enrichGlobalFromProductScan } from "./lib/globalEnrichment";

const ACTIVE_PANTRY_CAP = 150;

/**
 * Determine the tier of a pantry item:
 *   1 = Essential (pinned or purchaseCount >= 3)
 *   2 = Regular (active, not essential)
 *   3 = Archived
 */
export function getItemTier(item: { pinned?: boolean; purchaseCount?: number; status?: string }): 1 | 2 | 3 {
  if (item.status === "archived") return 3;
  if (item.pinned) return 1;
  if ((item.purchaseCount ?? 0) >= 3) return 1;
  return 2;
}

/**
 * Enforce the 150-item active pantry cap.
 * If at/over the limit, archives the oldest non-pinned item
 * (by lastPurchasedAt, falling back to updatedAt).
 */
async function enforceActiveCap(ctx: MutationCtx, userId: Id<"users">) {
  const activeItems = await ctx.db
    .query("pantryItems")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.neq(q.field("status"), "archived"))
    .collect();

  if (activeItems.length >= ACTIVE_PANTRY_CAP) {
    // Find oldest non-pinned item by lastPurchasedAt (or updatedAt fallback)
    const archivable = activeItems
      .filter((item) => !item.pinned)
      .sort((a, b) => {
        const aTime = a.lastPurchasedAt ?? a.updatedAt;
        const bTime = b.lastPurchasedAt ?? b.updatedAt;
        return aTime - bTime; // oldest first
      });

    if (archivable.length > 0) {
      await ctx.db.patch(archivable[0]._id, {
        status: "archived",
        archivedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }
}

/**
 * Find an existing pantry item by name+size using fuzzy matching.
 * Catches plurals, common prefixes, typos, and case differences.
 * Size-aware: "Milk 1L" and "Milk 2L" are treated as distinct items.
 * Returns the matching item or null.
 */
async function findExistingPantryItem(
  ctx: MutationCtx,
  userId: Id<"users">,
  name: string,
  size?: string | null,
) {
  const items = await ctx.db
    .query("pantryItems")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return items.find((item) => isDuplicateItem(name, size, item.name, item.defaultSize)) ?? null;
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

    // Get existing items to avoid duplicates (fuzzy matching)
    const existing = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const knownItems: { name: string; size?: string }[] = existing.map((e) => ({ name: e.name, size: e.defaultSize }));

    // Insert only items that don't fuzzy-match any existing item (size-aware)
    const newItems = args.items.filter((item) => {
      const isDup = knownItems.some((known) => isDuplicateItem(item.name, item.defaultSize, known.name, known.size));
      if (!isDup) {
        knownItems.push({ name: item.name, size: item.defaultSize }); // prevent dupes within the batch too
        return true;
      }
      return false;
    });

    const promises = newItems.map((item) =>
      ctx.db.insert("pantryItems", {
        userId: user._id,
        name: item.name,
        category: item.category,
        icon: getIconForItem(item.name, item.category),
        stockLevel: item.stockLevel,
        status: "active" as const,
        nameSource: "system" as const,
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
 * Get all active pantry items for the current user.
 * Filters out archived items; treats missing status as "active" (backward compat).
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

    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filter out archived items; treat missing status as "active" for backward compat
    return items.filter((item) => item.status !== "archived");
  },
});

/**
 * Get archived pantry items for the current user.
 * Uses the by_user_status index for efficient lookup.
 */
export const getArchivedItems = query({
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
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "archived")
      )
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

    // Enforce active pantry cap before inserting
    await enforceActiveCap(ctx, user._id);

    const itemId = await ctx.db.insert("pantryItems", {
      userId: user._id,
      name: args.name,
      category: args.category,
      icon: getIconForItem(args.name, args.category),
      stockLevel: args.stockLevel,
      status: "active" as const,
      nameSource: "system" as const,
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

    if (args.name !== undefined) {
      updates.name = args.name;
      // User manually edited the name — protect it from auto-improvement
      if (args.name !== item.name) {
        updates.nameSource = "user";
      }
    }
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
 * Toggle pin on a pantry item.
 * Pinned items become Tier 1 (Essentials) and are never auto-archived.
 * If an archived item is pinned, it is automatically unarchived.
 */
export const togglePin = mutation({
  args: { pantryItemId: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const item = await ctx.db.get(args.pantryItemId);
    if (!item || item.userId !== user._id) throw new Error("Item not found");

    const updates: Record<string, unknown> = {
      pinned: !item.pinned,
      updatedAt: Date.now(),
    };

    // If archived and being pinned, unarchive
    if (item.status === "archived" && !item.pinned) {
      updates.status = "active";
      updates.archivedAt = undefined;
    }

    await ctx.db.patch(args.pantryItemId, updates);
  },
});

/**
 * Archive a pantry item.
 * Moves it to Tier 3 and clears pinned status.
 */
export const archiveItem = mutation({
  args: { pantryItemId: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const item = await ctx.db.get(args.pantryItemId);
    if (!item || item.userId !== user._id) throw new Error("Item not found");

    await ctx.db.patch(args.pantryItemId, {
      status: "archived",
      archivedAt: Date.now(),
      pinned: false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Unarchive a pantry item.
 * Moves it back to active status, enforcing the 150-item active cap.
 */
export const unarchiveItem = mutation({
  args: { pantryItemId: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const item = await ctx.db.get(args.pantryItemId);
    if (!item || item.userId !== user._id) throw new Error("Item not found");

    // Enforce 150-item active cap (may archive oldest non-pinned item)
    await enforceActiveCap(ctx, user._id);

    await ctx.db.patch(args.pantryItemId, {
      status: "active",
      archivedAt: undefined,
      updatedAt: Date.now(),
    });
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
        // Pantry lifecycle: track purchase activity + auto-resurface archived items
        purchaseCount: (pantryItem.purchaseCount ?? 0) + 1,
        lastPurchasedAt: now,
        ...(pantryItem.status === "archived" && {
          status: "active" as const,
          archivedAt: undefined,
        }),
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
          // Improve name from receipt if user hasn't customized it
          ...(exactMatch.nameSource !== "user" && receiptItem.name !== exactMatch.name && {
            name: receiptItem.name,
            icon: getIconForItem(receiptItem.name, exactMatch.category),
            nameSource: "system" as const,
          }),
          // Pantry lifecycle: track purchase activity + auto-resurface archived items
          purchaseCount: (exactMatch.purchaseCount ?? 0) + 1,
          lastPurchasedAt: now,
          ...(exactMatch.status === "archived" && {
            status: "active" as const,
            archivedAt: undefined,
          }),
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
        // Pantry lifecycle: track purchase activity + auto-resurface archived items
        purchaseCount: (pantryItem.purchaseCount ?? 0) + 1,
        lastPurchasedAt: now,
        ...(pantryItem.status === "archived" && {
          status: "active" as const,
          archivedAt: undefined,
        }),
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
      // Pantry lifecycle: track purchase activity + auto-resurface archived items
      purchaseCount: (pantryItem.purchaseCount ?? 0) + 1,
      lastPurchasedAt: Date.now(),
      ...(pantryItem.status === "archived" && {
        status: "active" as const,
        archivedAt: undefined,
      }),
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
    const existing = await findExistingPantryItem(ctx, user._id, args.name, args.size);
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
        // Pantry lifecycle: track purchase activity + auto-resurface archived items
        purchaseCount: (existing.purchaseCount ?? 0) + 1,
        lastPurchasedAt: now,
        ...(existing.status === "archived" && {
          status: "active" as const,
          archivedAt: undefined,
        }),
        updatedAt: now,
      });
      return existing._id;
    }

    // Enforce active pantry cap before inserting
    await enforceActiveCap(ctx, user._id);

    const pantryItemId = await ctx.db.insert("pantryItems", {
      userId: user._id,
      name: args.name,
      category: args.category || "other",
      icon: getIconForItem(args.name, args.category || "other"),
      stockLevel: "stocked",
      status: "active" as const,
      nameSource: "system" as const,
      purchaseCount: 1,
      lastPurchasedAt: now,
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

/**
 * Add multiple items to pantry from product scanning.
 * Deduplicates by name — if item exists, updates price/stock instead.
 */
export const addBatchFromScan = mutation({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        category: v.string(),
        size: v.optional(v.string()),
        unit: v.optional(v.string()),
        estimatedPrice: v.optional(v.number()),
        brand: v.optional(v.string()),
        confidence: v.optional(v.number()),
        imageStorageId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const now = Date.now();

    // Get existing items for fuzzy dedup
    const existing = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let added = 0;
    const skippedDuplicates: { scannedName: string; existingName: string; existingId: string }[] = [];

    for (const item of args.items) {
      const existingItem = existing.find((p) => isDuplicateItem(item.name, item.size, p.name, p.defaultSize));

      if (existingItem) {
        // Only prompt for replace if the scanned data is meaningfully different
        const namesDiffer = normalizeItemName(item.name) !== normalizeItemName(existingItem.name);
        const sizeIsNew = !!item.size && item.size !== existingItem.defaultSize;
        if (namesDiffer || sizeIsNew) {
          skippedDuplicates.push({
            scannedName: item.name,
            existingName: existingItem.name,
            existingId: existingItem._id,
          });
        }
        // Otherwise silently skip — nothing to improve
      } else {
        // Check pantry limit
        const access = await canAddPantryItem(ctx, user._id);
        if (!access.allowed) continue;

        // Enforce active pantry cap before inserting
        await enforceActiveCap(ctx, user._id);

        await ctx.db.insert("pantryItems", {
          userId: user._id,
          name: item.name,
          category: item.category,
          icon: getIconForItem(item.name, item.category),
          stockLevel: "low",
          status: "active" as const,
          nameSource: "system" as const,
          autoAddToList: false,
          ...(item.size ? { defaultSize: item.size } : {}),
          ...(item.unit ? { defaultUnit: item.unit } : {}),
          ...(item.estimatedPrice != null ? { lastPrice: item.estimatedPrice, priceSource: "ai_estimate" as const } : {}),
          createdAt: now,
          updatedAt: now,
        });
        added++;
      }

      // Global DB enrichment — update itemVariants + currentPrices
      await enrichGlobalFromProductScan(ctx, item, user._id);
    }

    return { added, skippedDuplicates };
  },
});

/**
 * Replace a pantry item's data with scanned product info.
 * Overwrites name, category, icon, size, unit, price — and tracks that a scan occurred.
 */
export const replaceWithScan = mutation({
  args: {
    pantryItemId: v.id("pantryItems"),
    scannedData: v.object({
      name: v.string(),
      category: v.string(),
      size: v.optional(v.string()),
      unit: v.optional(v.string()),
      estimatedPrice: v.optional(v.number()),
      confidence: v.optional(v.number()),
      imageStorageId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const item = await ctx.db.get(args.pantryItemId);
    if (!item) throw new Error("Item not found");
    if (item.userId !== user._id) throw new Error("Unauthorized");

    const now = Date.now();
    const { scannedData } = args;

    await ctx.db.patch(args.pantryItemId, {
      name: scannedData.name,
      category: scannedData.category,
      icon: getIconForItem(scannedData.name, scannedData.category),
      ...(scannedData.size ? { defaultSize: scannedData.size } : {}),
      ...(scannedData.unit ? { defaultUnit: scannedData.unit } : {}),
      ...(scannedData.estimatedPrice != null
        ? { lastPrice: scannedData.estimatedPrice, priceSource: "ai_estimate" as const }
        : {}),
      nameSource: "scan" as const,
      lastScannedAt: now,
      updatedAt: now,
    });

    await enrichGlobalFromProductScan(ctx, scannedData, user._id);

    return { success: true, pantryItemId: args.pantryItemId };
  },
});

/**
 * Auto-archive stale pantry items.
 * Runs as a daily cron job. Archives items that are:
 *   - Active (not already archived)
 *   - Not pinned
 *   - Stock level "out"
 *   - No purchase activity in the last 90 days
 */
export const archiveStaleItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

    // Find items that are: active, not pinned, stockLevel "out", and not purchased in 90 days
    const staleItems = await ctx.db
      .query("pantryItems")
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "archived"),
          q.neq(q.field("pinned"), true),
          q.eq(q.field("stockLevel"), "out"),
        )
      )
      .collect();

    const now = Date.now();
    let archived = 0;

    for (const item of staleItems) {
      const lastActivity = item.lastPurchasedAt ?? item.updatedAt;
      if (lastActivity < ninetyDaysAgo) {
        await ctx.db.patch(item._id, {
          status: "archived",
          archivedAt: now,
          updatedAt: now,
        });
        archived++;
      }
    }

    if (archived > 0) {
      console.log(`Archived ${archived} stale pantry items`);
    }
  },
});

// ---------------------------------------------------------------------------
// Duplicate Detection & Merging
// ---------------------------------------------------------------------------

/**
 * Find groups of duplicate active pantry items for the current user.
 * Uses the same isDuplicateItem logic (fuzzy name + size matching) that
 * prevents new duplicates at scan time, but applied retroactively.
 *
 * Returns an array of duplicate groups, each with 2+ items.
 */
export const findDuplicates = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const active = items.filter((item) => item.status !== "archived");

    // Group items that are duplicates of each other
    const assigned = new Set<string>();
    const groups: (typeof active)[] = [];

    for (let i = 0; i < active.length; i++) {
      if (assigned.has(active[i]._id)) continue;

      const group = [active[i]];
      for (let j = i + 1; j < active.length; j++) {
        if (assigned.has(active[j]._id)) continue;

        if (isDuplicateItem(
          active[i].name,
          active[i].defaultSize,
          active[j].name,
          active[j].defaultSize,
        )) {
          group.push(active[j]);
          assigned.add(active[j]._id);
        }
      }

      if (group.length > 1) {
        assigned.add(active[i]._id);
        groups.push(group);
      }
    }

    return groups.map((group) =>
      group.map((item) => ({
        _id: item._id,
        name: item.name,
        category: item.category,
        stockLevel: item.stockLevel,
        defaultSize: item.defaultSize,
        defaultUnit: item.defaultUnit,
        lastPrice: item.lastPrice,
        priceSource: item.priceSource,
        pinned: item.pinned,
        purchaseCount: item.purchaseCount,
        lastPurchasedAt: item.lastPurchasedAt,
      }))
    );
  },
});

/**
 * Merge a group of duplicate pantry items into one.
 * Keeps the "best" item (receipt price > AI price, most purchases, pinned)
 * and deletes the rest. Preserves the best available data from all items.
 */
export const mergeDuplicates = mutation({
  args: {
    keepId: v.id("pantryItems"),
    deleteIds: v.array(v.id("pantryItems")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const keepItem = await ctx.db.get(args.keepId);
    if (!keepItem || keepItem.userId !== user._id) {
      throw new Error("Item to keep not found or not owned by user");
    }

    // Collect best data from all items being deleted
    let bestPrice = keepItem.lastPrice;
    let bestPriceSource = keepItem.priceSource;
    let bestSize = keepItem.defaultSize;
    let bestUnit = keepItem.defaultUnit;
    let totalPurchaseCount = keepItem.purchaseCount ?? 0;
    let shouldPin = keepItem.pinned ?? false;

    // Receipt prices take priority over AI estimates
    const priceRank = (source?: string) =>
      source === "receipt" ? 3 : source === "user" ? 2 : source === "ai_estimate" ? 1 : 0;

    for (const deleteId of args.deleteIds) {
      const item = await ctx.db.get(deleteId);
      if (!item || item.userId !== user._id) continue;

      // Take the higher-ranked price
      if (item.lastPrice != null) {
        if (bestPrice == null || priceRank(item.priceSource) > priceRank(bestPriceSource)) {
          bestPrice = item.lastPrice;
          bestPriceSource = item.priceSource;
        }
      }

      // Take size if the kept item doesn't have one
      if (!bestSize && item.defaultSize) {
        bestSize = item.defaultSize;
        bestUnit = item.defaultUnit;
      }

      // Sum purchase counts
      totalPurchaseCount += item.purchaseCount ?? 0;

      // Keep pinned status if any item was pinned
      if (item.pinned) shouldPin = true;

      // Re-point any listItems referencing the deleted item to the kept item
      const userListItems = await ctx.db
        .query("listItems")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      const linkedListItems = userListItems.filter((li) => li.pantryItemId === deleteId);
      for (const li of linkedListItems) {
        await ctx.db.patch(li._id, { pantryItemId: args.keepId });
      }

      // Delete the duplicate
      await ctx.db.delete(deleteId);
    }

    // Update the kept item with the best merged data
    await ctx.db.patch(args.keepId, {
      ...(bestPrice != null ? { lastPrice: bestPrice, priceSource: bestPriceSource } : {}),
      ...(bestSize ? { defaultSize: bestSize, defaultUnit: bestUnit } : {}),
      purchaseCount: totalPurchaseCount,
      pinned: shouldPin,
      updatedAt: Date.now(),
    });

    return { kept: args.keepId, deleted: args.deleteIds.length };
  },
});

