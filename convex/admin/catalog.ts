import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { 
  requirePermission, 
  requirePermissionQuery 
} from "./helpers";

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "manage_catalog");

    // P1 Fix: Avoid full table scan by taking most recent 5000 items
    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_created")
      .order("desc")
      .take(5000);

    // Count items by category
    const categoryMap = new Map<string, number>();
    for (const item of items) {
      const cat = item.category || "Uncategorized";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    }

    // Convert to array and sort
    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category));
  },
});

export const getDuplicateStores = query({
  args: { bustCache: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "manage_catalog");

    // P1 Fix: Avoid full table scan by taking most recent 5000 price records
    const prices = await ctx.db
      .query("currentPrices")
      .withIndex("by_updated")
      .order("desc")
      .take(5000);

    const storeMap = new Map<string, string[]>();

    for (const price of prices) {
      if (!price.storeName) continue;

      const normalized = price.storeName.toLowerCase().trim();
      if (!storeMap.has(normalized)) {
        storeMap.set(normalized, []);
      }
      if (!storeMap.get(normalized)!.includes(price.storeName)) {
        storeMap.get(normalized)!.push(price.storeName);
      }
    }

    // Find groups with duplicates (different casings)
    const duplicates = Array.from(storeMap.entries())
      .filter(([_, variants]) => variants.length > 1)
      .map(([normalized, variants]) => ({
        normalized,
        variants: variants.sort(),
        canonical: variants[0], // Use first alphabetically as canonical
        count: variants.length,
      }));

    return duplicates;
  },
});

export const mergeStoreNames = mutation({
  args: { fromNames: v.array(v.string()), toName: v.string() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_catalog");
    
    if (args.fromNames.length === 0) {
      throw new Error("No store names provided to merge");
    }

    if (!args.toName) {
      throw new Error("Target store name is required");
    }

    let updatedCount = 0;

    for (const fromName of args.fromNames) {
      const prices = await ctx.db
        .query("currentPrices")
        .withIndex("by_store", q => q.eq("storeName", fromName))
        .collect();
        
      for (const price of prices) {
        await ctx.db.patch(price._id, { storeName: args.toName });
        updatedCount++;
      }
    }

    for (const fromName of args.fromNames) {
      const history = await ctx.db
        .query("priceHistory")
        .withIndex("by_store", q => q.eq("storeName", fromName))
        .collect();
        
      for (const h of history) {
        await ctx.db.patch(h._id, { storeName: args.toName });
        updatedCount++;
      }
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "merge_stores",
      targetType: "stores",
      targetId: "multiple",
      details: `Merged ${args.fromNames.join(", ")} → ${args.toName} (${updatedCount} records)`,
      createdAt: Date.now(),
    });

    return { success: true, updatedCount };
  },
});
