import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { 
  requireUser, 
  optionalUser, 
  enforceActiveCap, 
  findExistingPantryItem 
} from "./helpers";
import { getIconForItem } from "../iconMapping";
import { canAddPantryItem } from "../lib/featureGating";
import { isDuplicateItem } from "../lib/fuzzyMatch";
import { toGroceryTitleCase } from "../lib/titleCase";
import { cleanItemForStorage } from "../lib/itemNameParser";
import { enrichGlobalFromProductScan } from "../lib/globalEnrichment";

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
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const rateLimit = await ctx.runMutation(api.aiUsage.checkRateLimit, { feature: "pantry_items" });
    if (!rateLimit.allowed) throw new Error("Rate limit exceeded");

    const existing = await findExistingPantryItem(ctx, user._id, args.name);
    if (existing) return existing._id;

    const access = await canAddPantryItem(ctx, user._id);
    if (!access.allowed) throw new Error(access.reason ?? "Limit reached");

    await enforceActiveCap(ctx, user._id);

    const itemId = await ctx.db.insert("pantryItems", {
      userId: user._id,
      name: toGroceryTitleCase(args.name),
      category: args.category,
      icon: getIconForItem(toGroceryTitleCase(args.name), args.category),
      stockLevel: args.stockLevel,
      status: "active",
      nameSource: "system",
      autoAddToList: args.autoAddToList ?? false,
      lastPrice: args.lastPrice,
      priceSource: args.priceSource,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.insights.checkPantryAchievements, { userId: user._id });
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
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== user._id) throw new Error("Unauthorized");

    const updates = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      updates.name = toGroceryTitleCase(args.name);
      if (args.name !== item.name) updates.nameSource = "user";
    }
    if (args.category !== undefined) updates.category = args.category;
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

    const promises = newItems.map((item) =>
      ctx.db.insert("pantryItems", {
        userId: user._id,
        name: toGroceryTitleCase(item.name),
        category: item.category,
        icon: getIconForItem(toGroceryTitleCase(item.name), item.category),
        stockLevel: item.stockLevel,
        status: "active",
        nameSource: "system",
        ...(item.estimatedPrice !== undefined && {
          lastPrice: item.estimatedPrice,
          priceSource: "ai_estimate",
        }),
        ...(item.defaultSize && { defaultSize: item.defaultSize }),
        ...(item.defaultUnit && { defaultUnit: item.defaultUnit }),
        autoAddToList: false,
        createdAt: now,
        updatedAt: now,
      })
    );

    await Promise.all(promises);
    if (newItems.length > 0) {
      await ctx.runMutation(internal.insights.checkPantryAchievements, { userId: user._id });
    }

    return { count: promises.length, skipped: args.items.length - newItems.length };
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
        await ctx.db.patch(existingItem._id, {
          stockLevel: "stocked",
          ...(item.estimatedPrice != null ? { lastPrice: item.estimatedPrice, priceSource: "receipt" } : {}),
          ...(item.size ? { defaultSize: item.size } : {}),
          ...(item.unit ? { defaultUnit: item.unit } : {}),
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
        await ctx.db.insert("pantryItems", {
          userId: user._id,
          name: cleaned.name,
          category: item.category,
          icon: getIconForItem(cleaned.name, item.category),
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

    return { added, restocked };
  },
});
