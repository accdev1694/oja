import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import {
  requireUser,
  optionalUser,
  enforceActiveCap,
  findExistingPantryItem,
  MutationCtx,
} from "./helpers";
import { getIconForItem } from "../iconMapping";
import { canAddPantryItem } from "../lib/featureGating";
import { isDuplicateItem } from "../lib/fuzzyMatch";
import { toGroceryTitleCase } from "../lib/titleCase";
import { cleanItemForStorage } from "../lib/itemNameParser";
import { normalizeCategory } from "../lib/categoryNormalizer";
import { enrichGlobalFromProductScan } from "../lib/globalEnrichment";

/** Update the "add_items" weekly challenge progress if one is active */
async function updateAddItemsChallenge(ctx: MutationCtx, userId: Id<"users">, count: number) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const challenges = await ctx.db
      .query("weeklyChallenges")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const active = challenges.find(
      (c) => c.type === "add_items" && c.endDate >= today && !c.completedAt
    );
    if (active) {
      await ctx.runMutation(api.insights.updateChallengeProgress, {
        challengeId: active._id,
        increment: count,
      });
    }
  } catch {
    // non-critical — don't block pantry operations
  }
}

export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("pantryItems")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "active"))
      .collect();
  },
});

export const getArchivedItems = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("pantryItems")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "archived")
      )
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const user = await optionalUser(ctx);
    if (!user) return null;
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== user._id) return null;
    return item;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    stockLevel: v.union(v.literal("stocked"), v.literal("low"), v.literal("out")),
    autoAddToList: v.optional(v.boolean()),
    lastPrice: v.optional(v.number()),
    priceSource: v.optional(v.string()),
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const rateLimit = await ctx.runMutation(api.aiUsage.checkRateLimit, { feature: "pantry_items" });
    if (!rateLimit.allowed) throw new Error("Rate limit exceeded");

    const existing = await findExistingPantryItem(ctx, user._id, args.name, args.size);
    if (existing) return existing._id;

    const access = await canAddPantryItem(ctx, user._id);
    if (!access.allowed) throw new Error(access.reason ?? "Limit reached");

    await enforceActiveCap(ctx, user._id);

    const cleaned = cleanItemForStorage(toGroceryTitleCase(args.name), args.size, args.unit);
    const normalizedCat = normalizeCategory(args.category);
    const itemId = await ctx.db.insert("pantryItems", {
      userId: user._id,
      name: cleaned.name,
      category: normalizedCat,
      icon: getIconForItem(cleaned.name, normalizedCat),
      stockLevel: args.stockLevel,
      status: "active",
      nameSource: "system",
      autoAddToList: args.autoAddToList ?? false,
      lastPrice: args.lastPrice,
      priceSource: args.priceSource,
      ...(cleaned.size ? { defaultSize: cleaned.size } : {}),
      ...(cleaned.unit ? { defaultUnit: cleaned.unit } : {}),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.insights.checkPantryAchievements, { userId: user._id });
    await updateAddItemsChallenge(ctx, user._id, 1);
    return itemId;
  },
});

export const update = mutation({
  args: {
    id: v.id("pantryItems"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    stockLevel: v.optional(v.union(v.literal("stocked"), v.literal("low"), v.literal("out"))),
    autoAddToList: v.optional(v.boolean()),
    size: v.optional(v.string()),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== user._id) throw new Error("Unauthorized");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) {
      const cleaned = cleanItemForStorage(toGroceryTitleCase(args.name), args.size ?? item.defaultSize, args.unit ?? item.defaultUnit);
      updates.name = cleaned.name;
      if (args.name !== item.name) updates.nameSource = "user";
      if (cleaned.size) { updates.defaultSize = cleaned.size; updates.defaultUnit = cleaned.unit; }
      else if (args.size !== undefined) { updates.defaultSize = undefined; updates.defaultUnit = undefined; }
    } else if (args.size !== undefined || args.unit !== undefined) {
      const cleaned = cleanItemForStorage(item.name, args.size ?? item.defaultSize, args.unit ?? item.defaultUnit);
      if (cleaned.size) { updates.defaultSize = cleaned.size; updates.defaultUnit = cleaned.unit; }
      else { updates.defaultSize = undefined; updates.defaultUnit = undefined; }
    }

    if (args.category !== undefined) updates.category = normalizeCategory(args.category);
    if (args.stockLevel !== undefined) updates.stockLevel = args.stockLevel;
    if (args.autoAddToList !== undefined) updates.autoAddToList = args.autoAddToList;

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== user._id) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const bulkCreate = mutation({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        category: v.string(),
        stockLevel: v.union(v.literal("stocked"), v.literal("low"), v.literal("out")),
        estimatedPrice: v.optional(v.number()),
        hasVariants: v.optional(v.boolean()),
        defaultSize: v.optional(v.string()),
        defaultUnit: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    const knownItems = existing.map((e) => ({ name: e.name, size: e.defaultSize }));

    const newItems = args.items.filter((item) => {
      const isDup = knownItems.some((known) => isDuplicateItem(item.name, item.defaultSize, known.name, known.size));
      if (!isDup) {
        knownItems.push({ name: item.name, size: item.defaultSize });
        return true;
      }
      return false;
    });

    // Onboarding seed: allow up to 100 items regardless of tier so free users
    // get a useful starting pantry. Uses onboardingComplete flag (not empty-pantry
    // heuristic) to avoid TOCTOU races with concurrent requests.
    const isOnboardingSeed = user.onboardingComplete === false;
    const ONBOARDING_CAP = 100;

    let remainingSlots: number;
    if (isOnboardingSeed) {
      remainingSlots = Math.min(newItems.length, ONBOARDING_CAP);
    } else {
      const access = await canAddPantryItem(ctx, user._id);
      remainingSlots = access.allowed
        ? (access.maxCount != null && access.currentCount != null
            ? access.maxCount - access.currentCount
            : newItems.length)
        : 0;
    }
    const cappedItems = newItems.slice(0, remainingSlots);

    const promises = cappedItems.map((item) => {
      const cleaned = cleanItemForStorage(toGroceryTitleCase(item.name), item.defaultSize, item.defaultUnit);
      const normCat = normalizeCategory(item.category);
      return ctx.db.insert("pantryItems", {
        userId: user._id,
        name: cleaned.name,
        category: normCat,
        icon: getIconForItem(cleaned.name, normCat),
        stockLevel: item.stockLevel,
        status: "active",
        nameSource: "system",
        ...(item.estimatedPrice !== undefined && {
          lastPrice: item.estimatedPrice,
          priceSource: "ai_estimate",
        }),
        ...(cleaned.size ? { defaultSize: cleaned.size } : {}),
        ...(cleaned.unit ? { defaultUnit: cleaned.unit } : {}),
        autoAddToList: false,
        createdAt: now,
        updatedAt: now,
      });
    });

    await Promise.all(promises);
    if (cappedItems.length > 0) {
      await ctx.runMutation(internal.insights.checkPantryAchievements, { userId: user._id });
      await updateAddItemsChallenge(ctx, user._id, cappedItems.length);
    }

    const skipped = args.items.length - newItems.length;
    const capped = newItems.length - cappedItems.length;
    return { count: promises.length, skipped, capped };
  },
});

export const updateStockLevel = mutation({
  args: {
    id: v.id("pantryItems"),
    stockLevel: v.union(v.literal("stocked"), v.literal("low"), v.literal("out")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, {
      stockLevel: args.stockLevel,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

export const toggleAutoAdd = mutation({
  args: { pantryItemId: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.pantryItemId);
    if (!item || item.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.pantryItemId, {
      autoAddToList: !item.autoAddToList,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.pantryItemId);
  },
});

export const addBatchFromScan = mutation({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        category: v.string(),
        size: v.optional(v.string()),
        unit: v.optional(v.string()),
        quantity: v.optional(v.number()),
        estimatedPrice: v.optional(v.number()),
        brand: v.optional(v.string()),
        confidence: v.optional(v.number()),
        imageStorageId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let added = 0;
    let restocked = 0;

    for (const item of args.items) {
      const existingItem = existing.find((p) => isDuplicateItem(item.name, item.size, p.name, p.defaultSize));

      if (existingItem) {
        const cleaned = cleanItemForStorage(existingItem.name, item.size ?? existingItem.defaultSize, item.unit ?? existingItem.defaultUnit);
        await ctx.db.patch(existingItem._id, {
          stockLevel: "stocked",
          ...(item.estimatedPrice != null ? { lastPrice: item.estimatedPrice, priceSource: "receipt" } : {}),
          ...(cleaned.size ? { defaultSize: cleaned.size, defaultUnit: cleaned.unit } : {}),
          ...(item.quantity ? { quantity: (existingItem.quantity ?? 0) + item.quantity } : {}),
          purchaseCount: (existingItem.purchaseCount ?? 0) + 1,
          lastPurchasedAt: now,
          ...(existingItem.status === "archived" ? { status: "active", archivedAt: undefined } : {}),
          updatedAt: now,
        });
        restocked++;
      } else {
        const access = await canAddPantryItem(ctx, user._id);
        if (!access.allowed) continue;

        await enforceActiveCap(ctx, user._id);

        const cleaned = cleanItemForStorage(toGroceryTitleCase(item.name), item.size, item.unit);
        const normCat = normalizeCategory(item.category);
        await ctx.db.insert("pantryItems", {
          userId: user._id,
          name: cleaned.name,
          category: normCat,
          icon: getIconForItem(cleaned.name, normCat),
          stockLevel: "stocked",
          status: "active",
          nameSource: "system",
          autoAddToList: false,
          purchaseCount: 1,
          lastPurchasedAt: now,
          ...(cleaned.size ? { defaultSize: cleaned.size } : {}),
          ...(cleaned.unit ? { defaultUnit: cleaned.unit } : {}),
          ...(item.quantity ? { quantity: item.quantity } : {}),
          ...(item.estimatedPrice != null ? { lastPrice: item.estimatedPrice, priceSource: "ai_estimate" } : {}),
          createdAt: now,
          updatedAt: now,
        });
        added++;
      }

      await enrichGlobalFromProductScan(ctx, item, user._id);
    }

    if (added > 0 || restocked > 0) {
      await ctx.runMutation(internal.insights.checkPantryAchievements, { userId: user._id });
    }
    if (added > 0) {
      await updateAddItemsChallenge(ctx, user._id, added);
    }

    return { added, restocked };
  },
});
