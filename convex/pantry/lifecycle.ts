import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { 
  requireUser, 
  optionalUser, 
  enforceActiveCap 
} from "./helpers";
import { getIconForItem } from "../iconMapping";
import { isDuplicateItem } from "../lib/fuzzyMatch";
export const togglePin = mutation({
  args: { pantryItemId: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.pantryItemId);
    if (!item || item.userId !== user._id) throw new Error("Item not found");

    const updates = {
      pinned: !item.pinned,
      updatedAt: Date.now(),
    };

    if (item.status === "archived" && !item.pinned) {
      Object.assign(updates, {
        status: "active",
        archivedAt: undefined,
      });
    }

    await ctx.db.patch(args.pantryItemId, updates);
  },
});

export const archiveItem = mutation({
  args: { pantryItemId: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
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

export const unarchiveItem = mutation({
  args: { pantryItemId: v.id("pantryItems") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.pantryItemId);
    if (!item || item.userId !== user._id) throw new Error("Item not found");

    await enforceActiveCap(ctx, user._id);

    await ctx.db.patch(args.pantryItemId, {
      status: "active",
      archivedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

/** Cron job: archives out-of-stock items untouched for 90+ days (all users). */
export const archiveStaleItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const STALE_DAYS = 90;
    const BATCH_LIMIT = 500;
    const cutoff = Date.now() - (STALE_DAYS * 24 * 60 * 60 * 1000);
    const candidateItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_status_stock", (q) => q.eq("status", "active").eq("stockLevel", "out"))
      .take(BATCH_LIMIT);

    let archived = 0;
    for (const item of candidateItems) {
      if (item.pinned) continue;
      const lastActivity = item.lastPurchasedAt ?? item.updatedAt;
      if (lastActivity < cutoff) {
        await ctx.db.patch(item._id, {
          status: "archived",
          archivedAt: Date.now(),
          updatedAt: Date.now(),
        });
        archived++;
      }
    }
    return { archived };
  },
});

export const migrateIcons = mutation({
  args: { forceAll: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let updated = 0;
    for (const item of items) {
      if (!item.icon || args.forceAll) {
        await ctx.db.patch(item._id, {
          icon: getIconForItem(item.name, item.category),
          updatedAt: Date.now(),
        });
        updated++;
      }
    }
    return { updated, total: items.length };
  },
});

export const migrateStockLevels = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let migrated = 0;
    for (const item of items) {
      const level: string = String(item.stockLevel);
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

export const findDuplicates = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx);
    if (!user) return [];

    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const active = items.filter((item) => item.status !== "archived");
    const assigned = new Set<string>();
    const groups = [];

    for (let i = 0; i < active.length; i++) {
      if (assigned.has(active[i]._id)) continue;
      const group = [active[i]];
      for (let j = i + 1; j < active.length; j++) {
        if (assigned.has(active[j]._id)) continue;
        if (isDuplicateItem(active[i].name, active[i].defaultSize, active[j].name, active[j].defaultSize)) {
          group.push(active[j]);
          assigned.add(active[j]._id);
        }
      }
      if (group.length > 1) {
        assigned.add(active[i]._id);
        groups.push(group);
      }
    }
    return groups;
  },
});

export const mergeDuplicates = mutation({
  args: { keepId: v.id("pantryItems"), deleteIds: v.array(v.id("pantryItems")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const keepItem = await ctx.db.get(args.keepId);
    if (!keepItem || keepItem.userId !== user._id) throw new Error("Unauthorized");

    let totalPurchaseCount = keepItem.purchaseCount ?? 0;
    let shouldPin = keepItem.pinned ?? false;

    for (const deleteId of args.deleteIds) {
      const item = await ctx.db.get(deleteId);
      if (!item || item.userId !== user._id) continue;
      totalPurchaseCount += item.purchaseCount ?? 0;
      if (item.pinned) shouldPin = true;

      // Re-point list items from deleted duplicate to the kept item
      const linkedListItems = await ctx.db
        .query("listItems")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("pantryItemId"), deleteId))
        .collect();
      for (const li of linkedListItems) {
        await ctx.db.patch(li._id, { pantryItemId: args.keepId });
      }
      await ctx.db.delete(deleteId);
    }

    await ctx.db.patch(args.keepId, {
      purchaseCount: totalPurchaseCount,
      pinned: shouldPin,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
