import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import { 
  requireUser, 
  optionalUser, 
  getNextListNumber, 
  requireEditableList 
} from "./helpers";
import { canCreateList, canAddPantryItem } from "../lib/featureGating";
import { 
  normalizeStoreName, 
  getStoreInfoSafe, 
  isValidStoreId 
} from "../lib/storeNormalizer";
import { getReceiptIds, pushReceiptId } from "../lib/receiptHelpers";
import { getIconForItem } from "../iconMapping";
import { isDuplicateItemName } from "../lib/fuzzyMatch";
import { toGroceryTitleCase } from "../lib/titleCase";
import { trackFunnelEvent, trackActivity } from "../lib/analytics";
import { resolveVariantWithPrice, PriceSource } from "../lib/priceResolver";
import { getUserListPermissions } from "../partners";
import { deduplicateItems, ListItemInput } from "../lib/itemDeduplicator";

export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];

    const active = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "active")
      )
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      active.map(async (list) => {
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
          isInProgress: list.shoppingStartedAt != null && list.completedAt == null,
        };
      })
    );

    return enriched;
  },
});

export const getById = query({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const list = await ctx.db.get(args.id);
    if (!list) return null;

    if (list.userId !== user._id) {
      const partner = await ctx.db
        .query("listPartners")
        .withIndex("by_list_user", (q: any) =>
          q.eq("listId", args.id).eq("userId", user._id)
        )
        .unique();
      if (!partner || (partner.status !== "accepted" && partner.status !== "pending")) {
        return null;
      }
    }

    return {
      ...list,
      isInProgress: list.shoppingStartedAt != null && list.completedAt == null,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    budget: v.optional(v.number()),
    storeName: v.optional(v.string()),
    normalizedStoreId: v.optional(v.string()),
    plannedDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const rateLimit = await ctx.runMutation(api.aiUsage.checkRateLimit, { feature: "shopping_lists" });
    if (!rateLimit.allowed) {
      throw new Error("Rate limit exceeded. Please wait before creating more lists.");
    }

    const access = await canCreateList(ctx, user._id);
    if (!access.allowed) {
      throw new Error(access.reason ?? "List limit reached");
    }

    const now = Date.now();
    const listNumber = await getNextListNumber(ctx, user._id);

    const listId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: toGroceryTitleCase(args.name),
      status: "active",
      budget: args.budget ?? 50,
      storeName: args.storeName,
      normalizedStoreId: args.normalizedStoreId,
      plannedDate: args.plannedDate,
      listNumber,
      createdAt: now,
      updatedAt: now,
    });

    await trackFunnelEvent(ctx, user._id, "first_list");
    await trackActivity(ctx, user._id, "create_list", { listId, name: args.name });

    return listId;
  },
});

export const update = mutation({
  args: {
    id: v.id("shoppingLists"),
    name: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
    budget: v.optional(v.number()),
    storeName: v.optional(v.string()),
    plannedDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.id);
    if (!list) throw new Error("List not found");
    requireEditableList(list);

    const perms = await getUserListPermissions(ctx, args.id, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = toGroceryTitleCase(args.name);
    if (args.status !== undefined) updates.status = args.status;
    if (args.budget !== undefined) updates.budget = args.budget;
    if (args.storeName !== undefined) updates.storeName = args.storeName;
    if (args.plannedDate !== undefined) updates.plannedDate = args.plannedDate;

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const list = await ctx.db.get(args.id);
    if (!list) throw new Error("List not found");

    const perms = await getUserListPermissions(ctx, args.id, user._id);
    if (!perms.canEdit) throw new Error("Unauthorized");

    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const createFromReceipt = mutation({
  args: {
    receiptId: v.id("receipts"),
    name: v.optional(v.string()),
    budget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const access = await canCreateList(ctx, user._id);
    if (!access.allowed) {
      throw new Error(access.reason ?? "List limit reached");
    }

    const receipt = await ctx.db.get(args.receiptId);
    if (!receipt || receipt.userId !== user._id) {
      throw new Error("Receipt not found or unauthorized");
    }
    if (receipt.processingStatus !== "completed") {
      throw new Error("Receipt is not fully processed yet");
    }
    if (!receipt.items || receipt.items.length === 0) {
      throw new Error("Receipt has no items");
    }

    const now = Date.now();
    const normalizedStoreId = normalizeStoreName(receipt.storeName);
    const listNumber = await getNextListNumber(ctx, user._id);

    const smartBudget = args.budget ?? Math.ceil(receipt.total / 5) * 5;
    const listName = toGroceryTitleCase(args.name?.trim() || `${receipt.storeName} Re-shop`);

    const listId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: listName,
      status: "active",
      budget: smartBudget,
      storeName: receipt.storeName,
      ...(normalizedStoreId && { normalizedStoreId }),
      sourceReceiptId: args.receiptId,
      listNumber,
      createdAt: now,
      updatedAt: now,
    });

    await trackFunnelEvent(ctx, user._id, "first_list");

    const seenNames = new Set<string>();
    for (const item of receipt.items) {
      const normalizedName = item.name.toLowerCase().trim();
      if (seenNames.has(normalizedName)) continue;
      seenNames.add(normalizedName);

      const size = (item as any).size as string | undefined;
      const unit = (item as any).unit as string | undefined;

      await ctx.db.insert("listItems", {
        listId,
        userId: user._id,
        name: toGroceryTitleCase(item.name),
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

    await ctx.db.patch(listId, { updatedAt: Date.now() });
    return listId;
  },
});

export const createFromTemplate = mutation({
  args: {
    sourceListId: v.id("shoppingLists"),
    newListName: v.string(),
    newBudget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const sourceList = await ctx.db.get(args.sourceListId);
    if (!sourceList || sourceList.userId !== user._id) {
      throw new Error("List not found or unauthorized");
    }

    const sourceItems = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.sourceListId))
      .collect();

    const now = Date.now();
    const listNumber = await getNextListNumber(ctx, user._id);
    const newListId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: args.newListName,
      budget: args.newBudget ?? sourceList.budget ?? 50,
      status: "active",
      normalizedStoreId: sourceList.normalizedStoreId,
      storeName: sourceList.storeName,
      listNumber,
      createdAt: now,
      updatedAt: now,
    });

    await trackFunnelEvent(ctx, user._id, "first_list");
    await trackActivity(ctx, user._id, "create_list", { listId: newListId, name: args.newListName });

    for (const item of sourceItems) {
      let price = item.estimatedPrice;
      let source = item.priceSource;
      let confidence = item.priceConfidence;

      try {
        const storeId = sourceList.normalizedStoreId || sourceList.storeName || "";
        const variantResult = await resolveVariantWithPrice(ctx, item.name, storeId, user._id);
        if (variantResult) {
          price = variantResult.price ?? undefined;
          source = variantResult.priceSource;
          confidence = variantResult.confidence;
        }
      } catch (err) {
        console.warn(`[createFromTemplate] Could not refresh price for ${item.name}:`, err);
      }

      await ctx.db.insert("listItems", {
        listId: newListId,
        userId: user._id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        size: item.size,
        unit: item.unit,
        estimatedPrice: price,
        priceSource: source,
        priceConfidence: confidence,
        isChecked: false,
        priority: item.priority,
        autoAdded: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { listId: newListId, itemCount: sourceItems.length };
  },
});

export const getTemplatePreview = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const user = await optionalUser(ctx);
    if (!user) return null;

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) return null;

    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    const totalEstimated = items.reduce((sum, item) =>
      sum + (item.estimatedPrice || 0) * item.quantity, 0
    );

    const grouped = new Map<string, number>();
    for (const item of items) {
      const cat = item.category || "Uncategorized";
      grouped.set(cat, (grouped.get(cat) || 0) + 1);
    }
    const itemsByCategory = Array.from(grouped.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    return {
      list: {
        _id: list._id,
        name: list.name,
        budget: list.budget,
        storeName: list.storeName,
        completedAt: list.completedAt,
        createdAt: list.createdAt,
      },
      itemCount: items.length,
      totalEstimated,
      itemsByCategory,
    };
  },
});

export const createFromMultipleLists = mutation({
  args: {
    sourceListIds: v.array(v.id("shoppingLists")),
    newListName: v.string(),
    newBudget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (args.sourceListIds.length === 0) throw new Error("Must provide at least one list");

    const access = await canCreateList(ctx, user._id);
    if (!access.allowed) throw new Error(access.reason ?? "List limit reached");

    const itemsByList = new Map<string, { listName: string; items: ListItemInput[] }>();
    let primaryStoreId: string | undefined;
    let primaryStoreName: string | undefined;

    for (const listId of args.sourceListIds) {
      const list = await ctx.db.get(listId);
      if (!list || list.userId !== user._id) throw new Error(`List ${listId} not found or unauthorized`);

      if (!primaryStoreId && list.normalizedStoreId) {
        primaryStoreId = list.normalizedStoreId;
        primaryStoreName = list.storeName;
      }

      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q) => q.eq("listId", listId))
        .collect();

      itemsByList.set(listId, {
        listName: list.name,
        items: items.map(i => ({
          name: i.name,
          category: i.category,
          quantity: i.quantity,
          size: i.size,
          unit: i.unit,
          estimatedPrice: i.estimatedPrice,
        })),
      });
    }

    const result = deduplicateItems(itemsByList);

    const now = Date.now();
    const listNumber = await getNextListNumber(ctx, user._id);
    const newListId = await ctx.db.insert("shoppingLists", {
      userId: user._id,
      name: args.newListName,
      budget: args.newBudget ?? 50,
      status: "active",
      normalizedStoreId: primaryStoreId,
      storeName: primaryStoreName,
      listNumber,
      createdAt: now,
      updatedAt: now,
    });

    await trackActivity(ctx, user._id, "create_list", { listId: newListId, name: args.newListName });

    for (const item of result.items) {
      let price = item.estimatedPrice;
      let source: PriceSource | "manual" | undefined = "personal";
      let confidence = 1.0;

      try {
        const variantResult = await resolveVariantWithPrice(ctx, item.name, primaryStoreId || "", user._id);
        if (variantResult) {
          price = variantResult.price ?? undefined;
          source = variantResult.priceSource;
          confidence = variantResult.confidence;
        }
      } catch (err) {
        console.warn(`[createFromMultipleLists] Could not refresh price for ${item.name}:`, err);
      }

      await ctx.db.insert("listItems", {
        listId: newListId,
        userId: user._id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        size: item.size,
        unit: item.unit,
        estimatedPrice: price,
        priceSource: source,
        priceConfidence: confidence,
        isChecked: false,
        priority: "should-have",
        autoAdded: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      listId: newListId,
      itemCount: result.items.length,
      duplicatesMerged: result.duplicates.length,
    };
  },
});
