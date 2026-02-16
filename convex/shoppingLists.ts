import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { canCreateList, canAddPantryItem } from "./lib/featureGating";
import { getAllStores, getStoreInfoSafe, isValidStoreId, normalizeStoreName, UKStoreId } from "./lib/storeNormalizer";
import { parseSize } from "./lib/sizeUtils";
import { getReceiptIds, pushReceiptId } from "./lib/receiptHelpers";
import { getIconForItem } from "./iconMapping";
import { isDuplicateItemName } from "./lib/fuzzyMatch";

/**
 * Get all shopping lists for the current user
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
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/**
 * Get active shopping lists only
 */
export const getActive = query({
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

    // Fetch both "active" and "shopping" status lists
    const active = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .order("desc")
      .collect();

    const shopping = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "shopping")
      )
      .order("desc")
      .collect();

    // Merge and sort by updatedAt descending (shopping lists first since they're in progress)
    const merged = [...shopping, ...active].sort(
      (a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)
    );

    // Enrich each list with item counts and estimated total
    const enriched = await Promise.all(
      merged.map(async (list) => {
        const items = await ctx.db
          .query("listItems")
          .withIndex("by_list", (q) => q.eq("listId", list._id))
          .collect();

        const checkedCount = items.filter((i) => i.isChecked).length;
        const totalEstimatedCost = items.reduce(
          (sum, i) => sum + (i.estimatedPrice ?? 0) * i.quantity,
          0
        );

        return {
          ...list,
          itemCount: items.length,
          checkedCount,
          totalEstimatedCost: totalEstimatedCost > 0 ? totalEstimatedCost : undefined,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get a single shopping list by ID
 */
export const getById = query({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      return null;
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // Allow access if owner OR partner
    if (list.userId !== user._id) {
      const partner = await ctx.db
        .query("listPartners")
        .withIndex("by_list_user", (q: any) =>
          q.eq("listId", args.id).eq("userId", user._id)
        )
        .unique();
      if (!partner || partner.status !== "accepted") {
        return null;
      }
    }

    return list;
  },
});

/**
 * Create a new shopping list
 */
export const create = mutation({
  args: {
    name: v.string(),
    budget: v.optional(v.number()),
    storeName: v.optional(v.string()),
    normalizedStoreId: v.optional(v.string()),
    plannedDate: v.optional(v.number()),
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

    // Feature gating: check list limit for free tier
    const access = await canCreateList(ctx, user._id);
    if (!access.allowed) {
      throw new Error(access.reason ?? "List limit reached");
    }

    const now = Date.now();

    const listId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: args.name,
      status: "active",
      budget: args.budget ?? 50,
      storeName: args.storeName,
      normalizedStoreId: args.normalizedStoreId,
      plannedDate: args.plannedDate,
      createdAt: now,
      updatedAt: now,
    });

    return listId;
  },
});

/**
 * Create a new shopping list pre-populated with items from an existing receipt.
 *
 * This captures exact item names, sizes, and verified prices from the receipt,
 * creates list items with receipt-verified pricing, upserts pantry items,
 * and feeds price intelligence (currentPrices + priceHistory) for all users.
 */
export const createFromReceipt = mutation({
  args: {
    receiptId: v.id("receipts"),
    name: v.optional(v.string()),
    budget: v.optional(v.number()),
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

    // Feature gating: check list limit for free tier
    const access = await canCreateList(ctx, user._id);
    if (!access.allowed) {
      throw new Error(access.reason ?? "List limit reached");
    }

    // Fetch receipt and verify ownership
    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt) {
      throw new Error("Receipt not found");
    }
    if (receipt.userId !== user._id) {
      throw new Error("Unauthorized");
    }
    if (receipt.processingStatus !== "completed") {
      throw new Error("Receipt is not fully processed yet");
    }
    if (!receipt.items || receipt.items.length === 0) {
      throw new Error("Receipt has no items");
    }

    const now = Date.now();
    const normalizedStoreId = normalizeStoreName(receipt.storeName);

    // Smart budget: receipt total rounded up to nearest £5
    const smartBudget = args.budget ?? Math.ceil(receipt.total / 5) * 5;

    // List name: user-provided or "{StoreName} Re-shop"
    const listName = args.name?.trim() || `${receipt.storeName} Re-shop`;

    // ── 1. Create the shopping list ──
    const listId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: listName,
      status: "active",
      budget: smartBudget,
      storeName: receipt.storeName,
      ...(normalizedStoreId && { normalizedStoreId }),
      sourceReceiptId: args.receiptId,
      createdAt: now,
      updatedAt: now,
    });

    // ── 2. Create list items from receipt items ──
    // Track names we've seen to avoid duplicate list items from receipt dupes
    const seenNames = new Set<string>();

    for (const item of receipt.items) {
      const normalizedName = item.name.toLowerCase().trim();
      if (seenNames.has(normalizedName)) continue;
      seenNames.add(normalizedName);

      // Parse size/unit from receipt item if available
      const size = (item as Record<string, unknown>).size as string | undefined;
      const unit = (item as Record<string, unknown>).unit as string | undefined;

      await ctx.db.insert("listItems", {
        listId,
        userId: user._id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        ...(size && { size }),
        ...(unit && { unit }),
        estimatedPrice: item.unitPrice,
        priceSource: "personal",
        priceConfidence: 1.0,
        priority: "should-have",
        isChecked: false,
        autoAdded: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    // ── 3. Upsert pantry items — enrich names, sizes, prices ──
    // Query all pantry items once (not inside the loop)
    const allPantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const pantrySeenNames: string[] = allPantryItems.map((p) => p.name);

    for (const item of receipt.items) {
      // Fuzzy dedup within the batch itself
      const seenDup = pantrySeenNames.some((n) => isDuplicateItemName(item.name, n));
      // We always add to seenNames (even if already there) since allPantryItems already seeded it
      if (seenDup) {
        // Might be an existing pantry item — update it if so
        const existingPantry = allPantryItems.find((p) => isDuplicateItemName(item.name, p.name));
        if (existingPantry) {
          const size = (item as Record<string, unknown>).size as string | undefined;
          const unit = (item as Record<string, unknown>).unit as string | undefined;
          await ctx.db.patch(existingPantry._id, {
            lastPrice: item.unitPrice,
            priceSource: "receipt" as const,
            lastStoreName: receipt.storeName,
            ...(size && { defaultSize: size }),
            ...(unit && { defaultUnit: unit }),
            updatedAt: now,
          });
        }
        continue;
      }
      pantrySeenNames.push(item.name);

      const size = (item as Record<string, unknown>).size as string | undefined;
      const unit = (item as Record<string, unknown>).unit as string | undefined;

      const existingPantry = allPantryItems.find((p) => isDuplicateItemName(item.name, p.name));

      if (existingPantry) {
        // Update existing pantry item with receipt-verified data
        await ctx.db.patch(existingPantry._id, {
          lastPrice: item.unitPrice,
          priceSource: "receipt" as const,
          lastStoreName: receipt.storeName,
          ...(size && { defaultSize: size }),
          ...(unit && { defaultUnit: unit }),
          updatedAt: now,
        });
      } else {
        // Check pantry item limit before creating
        const pantryAccess = await canAddPantryItem(ctx, user._id);
        if (pantryAccess.allowed) {
          await ctx.db.insert("pantryItems", {
            userId: user._id,
            name: item.name,
            category: item.category || "other",
            icon: getIconForItem(item.name, item.category || "other"),
            stockLevel: "stocked",
            lastPrice: item.unitPrice,
            priceSource: "receipt" as const,
            lastStoreName: receipt.storeName,
            ...(size && { defaultSize: size }),
            ...(unit && { defaultUnit: unit }),
            autoAddToList: false,
            createdAt: now,
            updatedAt: now,
          });
        }
        // Silently skip if pantry limit reached — list items still get created
      }
    }

    // ── 4. Feed price intelligence — currentPrices + priceHistory ──
    for (const item of receipt.items) {
      const normalizedName = item.name.toLowerCase().trim();
      const size = (item as Record<string, unknown>).size as string | undefined;
      const unit = (item as Record<string, unknown>).unit as string | undefined;

      // 4a. Upsert currentPrices (per item+store, across all users)
      const existingPrice = await ctx.db
        .query("currentPrices")
        .withIndex("by_item_store", (q) =>
          q.eq("normalizedName", normalizedName).eq("storeName", receipt.storeName)
        )
        .first();

      const daysSinceReceipt = Math.max(
        0,
        (now - receipt.purchaseDate) / (1000 * 60 * 60 * 24)
      );

      if (existingPrice) {
        // Only update if receipt is newer than what we have
        if (receipt.purchaseDate >= existingPrice.lastSeenDate) {
          const newReportCount = existingPrice.reportCount + 1;
          // Weighted average: favour newer prices
          const newWeight = Math.max(0, 1 - daysSinceReceipt / 30);
          const existingWeight = Math.max(0.3, 1 - (newReportCount > 1 ? 0.1 : 0));
          const totalWeight = newWeight + existingWeight;
          const weightedAvg =
            (item.unitPrice * newWeight +
              (existingPrice.averagePrice ?? existingPrice.unitPrice) * existingWeight) /
            totalWeight;

          // Confidence = count factor + recency factor
          const countFactor = Math.min(newReportCount / 10, 0.5);
          const recencyFactor = Math.max(0, 0.5 * (1 - daysSinceReceipt / 30));
          const confidence = Math.min(1, countFactor + recencyFactor);

          await ctx.db.patch(existingPrice._id, {
            unitPrice: item.unitPrice,
            averagePrice: Math.round(weightedAvg * 100) / 100,
            minPrice: Math.min(existingPrice.minPrice ?? item.unitPrice, item.unitPrice),
            maxPrice: Math.max(existingPrice.maxPrice ?? item.unitPrice, item.unitPrice),
            reportCount: newReportCount,
            confidence,
            lastSeenDate: receipt.purchaseDate,
            lastReportedBy: user._id,
            ...(size && { size }),
            ...(unit && { unit }),
            updatedAt: now,
          });
        }
      } else {
        // New price entry for this item+store combination
        const countFactor = Math.min(1 / 10, 0.5);
        const recencyFactor = Math.max(0, 0.5 * (1 - daysSinceReceipt / 30));
        const confidence = Math.min(1, countFactor + recencyFactor);

        await ctx.db.insert("currentPrices", {
          normalizedName,
          itemName: item.name,
          ...(size && { size }),
          ...(unit && { unit }),
          storeName: receipt.storeName,
          ...(normalizedStoreId && { normalizedStoreId }),
          unitPrice: item.unitPrice,
          averagePrice: item.unitPrice,
          minPrice: item.unitPrice,
          maxPrice: item.unitPrice,
          reportCount: 1,
          confidence,
          lastSeenDate: receipt.purchaseDate,
          lastReportedBy: user._id,
          updatedAt: now,
        });
      }

      // 4b. Insert priceHistory entry (per-user price record)
      await ctx.db.insert("priceHistory", {
        userId: user._id,
        receiptId: args.receiptId,
        itemName: item.name,
        normalizedName,
        ...(size && { size }),
        ...(unit && { unit }),
        price: item.totalPrice,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        storeName: receipt.storeName,
        storeAddress: receipt.storeAddress,
        ...(normalizedStoreId && { normalizedStoreId }),
        purchaseDate: receipt.purchaseDate,
        createdAt: now,
      });
    }

    // ── 5. Touch list updatedAt (triggers reactivity for list total) ──
    await ctx.db.patch(listId, { updatedAt: Date.now() });

    return listId;
  },
});

/**
 * Update a shopping list
 */
export const update = mutation({
  args: {
    id: v.id("shoppingLists"),
    name: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("shopping"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
    budget: v.optional(v.number()),
    storeName: v.optional(v.string()),
    plannedDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.status !== undefined) updates.status = args.status;
    if (args.budget !== undefined) updates.budget = args.budget;
    if (args.storeName !== undefined) updates.storeName = args.storeName;
    if (args.plannedDate !== undefined) updates.plannedDate = args.plannedDate;

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

/**
 * Delete a shopping list
 */
export const remove = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Delete all items in the list
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete the list
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Start shopping (change status to "shopping")
 */
export const startShopping = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      status: "shopping",
      shoppingStartedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Complete shopping (change status to "completed")
 */
export const completeShopping = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    // Calculate actualTotal from item-level actual prices
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    const actualTotal = items.reduce((sum, item) => {
      if (item.isChecked && item.actualPrice) {
        return sum + item.actualPrice * item.quantity;
      }
      if (item.isChecked && item.estimatedPrice) {
        return sum + item.estimatedPrice * item.quantity;
      }
      return sum;
    }, 0);

    // Calculate per-store subtotals for multi-store trips
    const storeMap = new Map<string, { storeName: string; itemCount: number; subtotal: number }>();
    for (const item of items) {
      if (!item.isChecked) continue;
      const storeId = item.purchasedAtStoreId ?? list.normalizedStoreId ?? "unknown";
      const storeName = item.purchasedAtStoreName ?? list.storeName ?? "Unknown";
      const price = item.actualPrice ?? item.estimatedPrice ?? 0;
      const existing = storeMap.get(storeId);
      if (existing) {
        existing.itemCount += 1;
        existing.subtotal += price * item.quantity;
      } else {
        storeMap.set(storeId, { storeName, itemCount: 1, subtotal: price * item.quantity });
      }
    }

    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
      actualTotal: actualTotal > 0 ? actualTotal : undefined,
    });

    const storeBreakdown = Array.from(storeMap.entries()).map(([storeId, data]) => ({
      storeId,
      storeName: data.storeName,
      itemCount: data.itemCount,
      subtotal: Math.round(data.subtotal * 100) / 100,
    }));

    const result = await ctx.db.get(args.id);
    return { ...result, storeBreakdown };
  },
});

/**
 * Pause shopping (set status back to "active" but preserve shoppingStartedAt)
 */
export const pauseShopping = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      status: "active",
      pausedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Resume a paused shopping trip (set status back to "shopping")
 */
export const resumeShopping = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    if (!list.shoppingStartedAt) {
      throw new Error("No shopping trip to resume");
    }

    await ctx.db.patch(args.id, {
      status: "shopping",
      pausedAt: undefined,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Switch store mid-shopping trip (lightweight — no re-pricing).
 *
 * Only works when list status is "shopping". Updates the list's current store
 * and appends to storeSegments for trip tracking. Does NOT re-price items
 * (unlike switchStore which is for planning mode).
 */
export const switchStoreMidShop = mutation({
  args: {
    listId: v.id("shoppingLists"),
    newStoreId: v.string(),
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
    if (!user) throw new Error("User not found");

    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");
    if (list.userId !== user._id) throw new Error("Unauthorized");
    if (list.status !== "shopping") {
      throw new Error("Can only switch stores while actively shopping");
    }

    // Validate store
    const storeInfo = getStoreInfoSafe(args.newStoreId);
    if (!storeInfo) {
      throw new Error(`Invalid store: ${args.newStoreId}`);
    }

    // Build new storeSegments entry
    const newSegment = {
      storeId: args.newStoreId,
      storeName: storeInfo.displayName,
      switchedAt: Date.now(),
    };

    const existingSegments = list.storeSegments ?? [];

    await ctx.db.patch(args.listId, {
      normalizedStoreId: args.newStoreId,
      storeName: storeInfo.displayName,
      storeSegments: [...existingSegments, newSegment],
      updatedAt: Date.now(),
    });

    return {
      success: true,
      storeName: storeInfo.displayName,
      storeId: args.newStoreId,
      segmentCount: existingSegments.length + 1,
    };
  },
});

/**
 * Get real-time trip stats for a shopping list (checked/unchecked, budget, duration)
 */
export const getTripStats = query({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      return null;
    }

    // Verify ownership or partnership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // Allow access if owner OR accepted partner
    if (list.userId !== user._id) {
      const partner = await ctx.db
        .query("listPartners")
        .withIndex("by_list_user", (q: any) =>
          q.eq("listId", args.id).eq("userId", user._id)
        )
        .unique();
      if (!partner || partner.status !== "accepted") {
        return null;
      }
    }

    // Fetch all items for this list
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    const checkedItems = items.filter((item) => item.isChecked);
    const uncheckedItems = items.filter((item) => !item.isChecked);

    const estimatedTotal = items.reduce((sum, item) => {
      return sum + (item.estimatedPrice ?? 0) * item.quantity;
    }, 0);

    const actualSpent = checkedItems.reduce((sum, item) => {
      const price = item.actualPrice ?? item.estimatedPrice ?? 0;
      return sum + price * item.quantity;
    }, 0);

    const estimatedTotalForChecked = checkedItems.reduce((sum, item) => {
      return sum + (item.estimatedPrice ?? 0) * item.quantity;
    }, 0);

    const budget = list.budget ?? 0;

    return {
      checkedCount: checkedItems.length,
      uncheckedCount: uncheckedItems.length,
      uncheckedItems: uncheckedItems.map((item) => ({
        _id: item._id,
        name: item.name,
        quantity: item.quantity,
        estimatedPrice: item.estimatedPrice,
        priority: item.priority,
        category: item.category,
      })),
      totalItems: items.length,
      estimatedTotal,
      actualSpent,
      budget,
      budgetRemaining: budget - actualSpent,
      savings: estimatedTotalForChecked - actualSpent,
      tripDuration: list.shoppingStartedAt
        ? Date.now() - list.shoppingStartedAt
        : null,
      storeName: list.storeName,
      storeId: list.normalizedStoreId,
      storeBreakdown: (() => {
        const map = new Map<string, { storeName: string; itemCount: number; subtotal: number }>();
        for (const item of checkedItems) {
          const sId = item.purchasedAtStoreId ?? list.normalizedStoreId ?? "unknown";
          const sName = item.purchasedAtStoreName ?? list.storeName ?? "Unknown";
          const price = item.actualPrice ?? item.estimatedPrice ?? 0;
          const existing = map.get(sId);
          if (existing) {
            existing.itemCount += 1;
            existing.subtotal += price * item.quantity;
          } else {
            map.set(sId, { storeName: sName, itemCount: 1, subtotal: price * item.quantity });
          }
        }
        return Array.from(map.entries()).map(([storeId, data]) => ({
          storeId,
          storeName: data.storeName,
          itemCount: data.itemCount,
          subtotal: Math.round(data.subtotal * 100) / 100,
        }));
      })(),
    };
  },
});

/**
 * Archive a completed list (and record trip summary data)
 */
export const archiveList = mutation({
  args: {
    id: v.id("shoppingLists"),
    receiptId: v.optional(v.id("receipts")),
    actualTotal: v.optional(v.number()),
    pointsEarned: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error("List not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    // Push to receiptIds array (multi-receipt support) + keep legacy receiptId
    const receiptIds = args.receiptId ? pushReceiptId(list, args.receiptId) : getReceiptIds(list);
    await ctx.db.patch(args.id, {
      status: "archived",
      archivedAt: now,
      completedAt: list.completedAt ?? now,
      receiptId: args.receiptId,
      receiptIds,
      actualTotal: args.actualTotal,
      pointsEarned: args.pointsEarned,
      updatedAt: now,
    });

    return await ctx.db.get(args.id);
  },
});

/**
 * Get archived/completed lists (history)
 */
export const getHistory = query({
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

    // Get both completed and archived lists
    const archived = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "archived")
      )
      .order("desc")
      .collect();

    const completed = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "completed")
      )
      .order("desc")
      .collect();

    // Merge and sort by completedAt descending
    return [...archived, ...completed].sort(
      (a, b) => (b.completedAt ?? b.updatedAt) - (a.completedAt ?? a.updatedAt)
    );
  },
});

/**
 * Get trip summary for an archived/completed list
 */
export const getTripSummary = query({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const list = await ctx.db.get(args.id);
    if (!list) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || list.userId !== user._id) {
      return null;
    }

    // Get list items
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    // Get all linked receipts (multi-receipt support)
    const allReceiptIds = getReceiptIds(list);
    const receipts = [];
    for (const rid of allReceiptIds) {
      const r = await ctx.db.get(rid);
      if (r) receipts.push(r);
    }

    // Fallback: try to find receipts linked via receipt.listId field
    if (receipts.length === 0) {
      const linkedReceipts = await ctx.db
        .query("receipts")
        .withIndex("by_list", (q) => q.eq("listId", args.id))
        .collect();
      receipts.push(...linkedReceipts);
    }

    // Primary receipt (for backward compat, use the first one)
    const receipt = receipts.length > 0 ? receipts[0] : null;

    // Aggregate per-store totals from all receipts
    const perStoreFromReceipts = new Map<string, { storeName: string; total: number; receiptCount: number }>();
    for (const r of receipts) {
      const sId = r.normalizedStoreId ?? "unknown";
      const existing = perStoreFromReceipts.get(sId);
      if (existing) {
        existing.total += r.total;
        existing.receiptCount += 1;
      } else {
        perStoreFromReceipts.set(sId, { storeName: r.storeName, total: r.total, receiptCount: 1 });
      }
    }

    const budget = list.budget ?? 0;
    const actualTotal = list.actualTotal ?? receipt?.total ?? 0;
    const difference = budget - actualTotal;

    return {
      list,
      items,
      receipt,
      receipts,
      budget,
      actualTotal,
      difference,
      savedMoney: difference > 0,
      percentSaved: budget > 0 ? (difference / budget) * 100 : 0,
      pointsEarned: list.pointsEarned ?? 0,
      itemCount: items.length,
      checkedCount: items.filter((i) => i.isChecked).length,
      receiptStoreBreakdown: Array.from(perStoreFromReceipts.entries()).map(([storeId, data]) => ({
        storeId,
        storeName: data.storeName,
        total: Math.round(data.total * 100) / 100,
        receiptCount: data.receiptCount,
      })),
    };
  },
});

/**
 * Set the store for a shopping list (without re-pricing items).
 *
 * Used during list creation flow when the user selects a store.
 * Does NOT trigger item re-pricing -- that's what switchStore does.
 * This is a lightweight store assignment for initial setup or simple changes.
 */
export const setStore = mutation({
  args: {
    id: v.id("shoppingLists"),
    normalizedStoreId: v.string(),
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

    const list = await ctx.db.get(args.id);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify ownership
    if (list.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // Validate store ID
    if (!isValidStoreId(args.normalizedStoreId)) {
      throw new Error(`Invalid store ID: ${args.normalizedStoreId}`);
    }

    // Get store display name
    const storeInfo = getStoreInfoSafe(args.normalizedStoreId);
    if (!storeInfo) {
      throw new Error(`Store not found: ${args.normalizedStoreId}`);
    }

    await ctx.db.patch(args.id, {
      normalizedStoreId: args.normalizedStoreId,
      storeName: storeInfo.displayName,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// -----------------------------------------------------------------------------
// Size Matching Helpers (for store comparison)
// -----------------------------------------------------------------------------

/** Default tolerance for auto-matching sizes (20%) */
const SIZE_MATCH_TOLERANCE = 0.2;

/**
 * Finds the closest matching size from available sizes.
 * Returns the match info or null if no suitable match found.
 */
function findClosestSizeMatch(
  targetSize: string,
  availableSizes: { size: string; price: number }[]
): { size: string; price: number; isExact: boolean; percentDiff: number } | null {
  const targetParsed = parseSize(targetSize);
  if (!targetParsed) return null;

  let bestMatch: { size: string; price: number; isExact: boolean; percentDiff: number } | null = null;

  for (const available of availableSizes) {
    const availableParsed = parseSize(available.size);
    if (!availableParsed) continue;

    // Only compare sizes in the same category (volume, weight, count)
    if (availableParsed.category !== targetParsed.category) continue;

    // Calculate percentage difference
    const diff = Math.abs(availableParsed.normalizedValue - targetParsed.normalizedValue);
    const percentDiff = diff / targetParsed.normalizedValue;

    // Check if within tolerance or if this is a better match
    if (percentDiff <= SIZE_MATCH_TOLERANCE) {
      const isExact = percentDiff <= 0.01; // 1% tolerance for "exact"

      if (!bestMatch || percentDiff < bestMatch.percentDiff) {
        bestMatch = {
          size: available.size,
          price: available.price,
          isExact,
          percentDiff,
        };
      }
    }
  }

  return bestMatch;
}

// -----------------------------------------------------------------------------
// Store Comparison Query
// -----------------------------------------------------------------------------

/**
 * Compare a shopping list's prices across multiple stores.
 *
 * For each alternative store:
 * - Finds prices for each item in the list
 * - Uses size matching to handle size differences (within 20% tolerance)
 * - Calculates total cost
 * - Tracks items with issues (size mismatches, missing data)
 *
 * Returns comparison data sorted by savings (most savings first).
 */
export const compareListAcrossStores = query({
  args: {
    listId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // Get the shopping list
    const list = await ctx.db.get(args.listId);
    if (!list) {
      return null;
    }

    // Verify ownership or partnership
    if (list.userId !== user._id) {
      const partner = await ctx.db
        .query("listPartners")
        .withIndex("by_list_user", (q: any) =>
          q.eq("listId", args.listId).eq("userId", user._id)
        )
        .unique();
      if (!partner || partner.status !== "accepted") {
        return null;
      }
    }

    // Get the current store
    const currentStoreId = list.normalizedStoreId ?? null;
    const currentStoreInfo = currentStoreId ? getStoreInfoSafe(currentStoreId) : null;

    // Get all items in the list
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    if (items.length === 0) {
      return {
        currentStore: currentStoreId ?? "unknown",
        currentStoreDisplayName: currentStoreInfo?.displayName ?? list.storeName ?? "Unknown Store",
        currentTotal: 0,
        alternatives: [],
      };
    }

    // Calculate current total (from estimated prices on items)
    const currentTotal = items.reduce((sum, item) => {
      const price = item.estimatedPrice ?? 0;
      return sum + price * item.quantity;
    }, 0);

    // Determine which stores to compare against
    // Priority: user's favorite stores, then top UK stores by market share
    const allStores = getAllStores();
    const userFavorites = user.storePreferences?.favorites ?? [];

    // Get stores to compare (exclude current store)
    const storesToCompare: UKStoreId[] = [];

    // Add user favorites first (excluding current store)
    for (const storeId of userFavorites) {
      if (storeId !== currentStoreId && !storesToCompare.includes(storeId as UKStoreId)) {
        storesToCompare.push(storeId as UKStoreId);
      }
    }

    // Add top stores by market share (up to 5 total comparison stores)
    for (const store of allStores) {
      if (storesToCompare.length >= 5) break;
      if (store.id !== currentStoreId && !storesToCompare.includes(store.id)) {
        storesToCompare.push(store.id);
      }
    }

    // For each alternative store, calculate total and track issues
    const alternatives = await Promise.all(
      storesToCompare.map(async (storeId) => {
        const storeInfo = getStoreInfoSafe(storeId);
        if (!storeInfo) {
          return null;
        }

        let storeTotal = 0;
        let itemsCompared = 0;
        let itemsWithIssues = 0;

        // Process each item
        for (const item of items) {
          const normalizedItemName = item.name.toLowerCase().trim();

          // If item has a manual price override, keep the same price
          if (item.priceOverride && item.estimatedPrice) {
            storeTotal += item.estimatedPrice * item.quantity;
            itemsCompared++;
            continue;
          }

          // Look up prices at this store from currentPrices table
          const prices = await ctx.db
            .query("currentPrices")
            .withIndex("by_item", (q) => q.eq("normalizedName", normalizedItemName))
            .collect();

          // Filter prices for this specific store
          const storePrices = prices.filter(
            (p) => p.normalizedStoreId === storeId || p.storeName?.toLowerCase() === storeId
          );

          if (storePrices.length === 0) {
            // No price data at this store - mark as issue and use current price
            itemsWithIssues++;
            if (item.estimatedPrice) {
              storeTotal += item.estimatedPrice * item.quantity;
              itemsCompared++;
            }
            continue;
          }

          // Convert to format for size matching
          const availableSizes = storePrices.map((p) => ({
            size: p.size ?? "",
            price: p.averagePrice ?? p.unitPrice,
          }));

          // Try to find matching size
          const itemSize = item.size ?? "";
          let matchedPrice: number | null = null;
          let hasIssue = false;

          if (itemSize) {
            const sizeMatch = findClosestSizeMatch(itemSize, availableSizes);

            if (sizeMatch) {
              matchedPrice = sizeMatch.price;
              // Track size mismatch (but not exact matches)
              if (!sizeMatch.isExact) {
                hasIssue = true;
              }
            }
          }

          // If no size match found, try matching by variant name or use cheapest
          if (matchedPrice === null) {
            // Try exact size match first
            const exactMatch = storePrices.find((p) => p.size === itemSize);
            if (exactMatch) {
              matchedPrice = exactMatch.averagePrice ?? exactMatch.unitPrice;
            } else {
              // Use cheapest available option (with size mismatch flag)
              const cheapest = storePrices.sort(
                (a, b) => (a.averagePrice ?? a.unitPrice) - (b.averagePrice ?? b.unitPrice)
              )[0];
              matchedPrice = cheapest.averagePrice ?? cheapest.unitPrice;
              hasIssue = true; // Mark as issue since we couldn't match size
            }
          }

          if (matchedPrice !== null) {
            storeTotal += matchedPrice * item.quantity;
            itemsCompared++;
            if (hasIssue) {
              itemsWithIssues++;
            }
          } else if (item.estimatedPrice) {
            // Fallback to current price if no match found
            storeTotal += item.estimatedPrice * item.quantity;
            itemsCompared++;
            itemsWithIssues++;
          }
        }

        const savings = currentTotal - storeTotal;

        return {
          store: storeId,
          storeDisplayName: storeInfo.displayName,
          storeColor: storeInfo.color,
          total: Math.round(storeTotal * 100) / 100,
          savings: Math.round(savings * 100) / 100,
          itemsCompared,
          itemsWithIssues,
        };
      })
    );

    // Filter out null results and sort by savings (highest first)
    const validAlternatives = alternatives
      .filter((alt): alt is NonNullable<typeof alt> => alt !== null)
      .sort((a, b) => b.savings - a.savings);

    return {
      currentStore: currentStoreId ?? "unknown",
      currentStoreDisplayName: currentStoreInfo?.displayName ?? list.storeName ?? "Unknown Store",
      currentTotal: Math.round(currentTotal * 100) / 100,
      alternatives: validAlternatives,
    };
  },
});

// -----------------------------------------------------------------------------
// Store Switch Mutation
// -----------------------------------------------------------------------------

/**
 * Switch a shopping list to a different store.
 *
 * This mutation:
 * 1. Updates item prices based on the new store's pricing
 * 2. Uses closest-size matching (within 20% tolerance) when exact size unavailable
 * 3. Preserves user overrides (manual price/size edits)
 * 4. Handles switch back to original store by restoring original sizes
 * 5. Recalculates list totals
 *
 * Returns detailed tracking of all changes made.
 */
export const switchStore = mutation({
  args: {
    listId: v.id("shoppingLists"),
    newStore: v.string(),  // UKStoreId
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    previousStore: string;
    newStore: string;
    itemsUpdated: number;
    sizeChanges: {
      itemId: Id<"listItems">;
      itemName: string;
      oldSize: string;
      newSize: string;
    }[];
    priceChanges: {
      itemId: Id<"listItems">;
      itemName: string;
      oldPrice: number;
      newPrice: number;
    }[];
    manualOverridesPreserved: number;
    newTotal: number;
    savings: number;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Get the shopping list
    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    // Verify ownership or partnership with editor/approver role
    if (list.userId !== user._id) {
      const partner = await ctx.db
        .query("listPartners")
        .withIndex("by_list_user", (q: any) =>
          q.eq("listId", args.listId).eq("userId", user._id)
        )
        .unique();
      if (!partner || partner.status !== "accepted" || partner.role === "viewer") {
        throw new Error("Unauthorized: You don't have permission to switch stores for this list");
      }
    }

    // Validate the new store ID
    const newStoreInfo = getStoreInfoSafe(args.newStore);
    if (!newStoreInfo) {
      throw new Error(`Invalid store ID: ${args.newStore}`);
    }

    const previousStore = list.normalizedStoreId ?? "unknown";
    const previousTotal = await calculateListTotal(ctx, args.listId);

    // Get all items in the list
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    // Track changes
    const sizeChanges: {
      itemId: Id<"listItems">;
      itemName: string;
      oldSize: string;
      newSize: string;
    }[] = [];
    const priceChanges: {
      itemId: Id<"listItems">;
      itemName: string;
      oldPrice: number;
      newPrice: number;
    }[] = [];
    let manualOverridesPreserved = 0;
    let itemsUpdated = 0;

    // Process each item
    for (const item of items) {
      const oldPrice = item.estimatedPrice ?? 0;
      const oldSize = item.size ?? "";
      const normalizedItemName = item.name.toLowerCase().trim();

      // Check if user has manual price override - preserve it
      if (item.priceOverride === true) {
        manualOverridesPreserved++;
        continue; // Skip this item entirely, keep user's price
      }

      // Check if user has manual size override - only update price, keep size
      if (item.sizeOverride === true) {
        // Get price for user's chosen size at new store
        const priceForSize = await findPriceForExactSize(
          ctx,
          normalizedItemName,
          item.size ?? "",
          args.newStore
        );

        if (priceForSize !== null && priceForSize !== oldPrice) {
          await ctx.db.patch(item._id, {
            estimatedPrice: priceForSize,
            updatedAt: Date.now(),
          });
          itemsUpdated++;
          priceChanges.push({
            itemId: item._id,
            itemName: item.name,
            oldPrice,
            newPrice: priceForSize,
          });
        }
        continue;
      }

      // Check if switching back to original store and we have an original size stored
      const isSwitchingBackToOriginal = item.originalSize && previousStore !== args.newStore;
      let targetSize = oldSize;

      if (isSwitchingBackToOriginal && item.originalSize) {
        // We're switching stores and have an original size - check if we should restore it
        // This happens when switching back to the original store
        targetSize = item.originalSize;
      }

      // Look up prices at new store from currentPrices table
      const prices = await ctx.db
        .query("currentPrices")
        .withIndex("by_item", (q) => q.eq("normalizedName", normalizedItemName))
        .collect();

      // Filter prices for the new store
      const storePrices = prices.filter(
        (p) => p.normalizedStoreId === args.newStore || p.storeName?.toLowerCase() === args.newStore
      );

      if (storePrices.length === 0) {
        // No price data at new store - keep current price
        continue;
      }

      // Convert to format for size matching
      const availableSizes = storePrices.map((p) => ({
        size: p.size ?? "",
        price: p.averagePrice ?? p.unitPrice,
      }));

      // Try to find matching size
      let matchedSize: string | null = null;
      let matchedPrice: number | null = null;
      let sizeChanged = false;

      if (targetSize) {
        // First try exact match
        const exactMatch = availableSizes.find((s) => s.size === targetSize);
        if (exactMatch) {
          matchedSize = exactMatch.size;
          matchedPrice = exactMatch.price;
        } else {
          // Try closest size match within tolerance
          const sizeMatch = findClosestSizeMatch(targetSize, availableSizes);

          if (sizeMatch) {
            matchedSize = sizeMatch.size;
            matchedPrice = sizeMatch.price;
            sizeChanged = !sizeMatch.isExact && matchedSize !== targetSize;
          }
        }
      }

      // If still no match, use cheapest available option
      if (matchedPrice === null && availableSizes.length > 0) {
        const cheapest = [...availableSizes].sort((a, b) => a.price - b.price)[0];
        matchedSize = cheapest.size;
        matchedPrice = cheapest.price;
        sizeChanged = matchedSize !== targetSize;
      }

      // Prepare update object
      const updates: Record<string, unknown> = {
        updatedAt: Date.now(),
      };

      // Track price changes
      if (matchedPrice !== null && matchedPrice !== oldPrice) {
        updates.estimatedPrice = matchedPrice;
        priceChanges.push({
          itemId: item._id,
          itemName: item.name,
          oldPrice,
          newPrice: matchedPrice,
        });
      }

      // Track size changes
      if (sizeChanged && matchedSize !== null && matchedSize !== oldSize) {
        // Store original size before changing (only if not already stored)
        if (!item.originalSize) {
          updates.originalSize = oldSize;
        }
        updates.size = matchedSize;
        sizeChanges.push({
          itemId: item._id,
          itemName: item.name,
          oldSize,
          newSize: matchedSize,
        });
      } else if (isSwitchingBackToOriginal && item.originalSize) {
        // Switching back - restore original size and clear the originalSize field
        updates.size = item.originalSize;
        updates.originalSize = undefined; // Clear the stored original size
        if (item.originalSize !== oldSize) {
          sizeChanges.push({
            itemId: item._id,
            itemName: item.name,
            oldSize,
            newSize: item.originalSize,
          });
        }
      }

      // Apply updates if any changes
      if (Object.keys(updates).length > 1) { // More than just updatedAt
        await ctx.db.patch(item._id, updates);
        itemsUpdated++;
      }
    }

    // Update the shopping list's store
    await ctx.db.patch(args.listId, {
      normalizedStoreId: args.newStore,
      storeName: newStoreInfo.displayName,
      updatedAt: Date.now(),
    });

    // Calculate new total
    const newTotal = await calculateListTotal(ctx, args.listId);
    const savings = previousTotal - newTotal;

    return {
      success: true,
      previousStore,
      newStore: args.newStore,
      itemsUpdated,
      sizeChanges,
      priceChanges,
      manualOverridesPreserved,
      newTotal: Math.round(newTotal * 100) / 100,
      savings: Math.round(savings * 100) / 100,
    };
  },
});

// -----------------------------------------------------------------------------
// Helper Functions for Store Switch
// -----------------------------------------------------------------------------

/**
 * Calculates the total price for a shopping list.
 */
async function calculateListTotal(
  ctx: { db: any },
  listId: Id<"shoppingLists">
): Promise<number> {
  const items = await ctx.db
    .query("listItems")
    .withIndex("by_list", (q: any) => q.eq("listId", listId))
    .collect();

  return items.reduce((sum: number, item: any) => {
    const price = item.estimatedPrice ?? 0;
    return sum + price * item.quantity;
  }, 0);
}

/**
 * Finds the exact price for a specific size at a store.
 * Returns null if not found.
 */
async function findPriceForExactSize(
  ctx: { db: any },
  normalizedItemName: string,
  size: string,
  storeId: string
): Promise<number | null> {
  const prices = await ctx.db
    .query("currentPrices")
    .withIndex("by_item", (q: any) => q.eq("normalizedName", normalizedItemName))
    .collect();

  const storePrice = prices.find(
    (p: any) =>
      (p.normalizedStoreId === storeId || p.storeName?.toLowerCase() === storeId) &&
      p.size === size
  );

  if (storePrice) {
    return storePrice.averagePrice ?? storePrice.unitPrice;
  }

  return null;
}
