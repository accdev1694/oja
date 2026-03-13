import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { 
  requirePermission, 
  requirePermissionQuery 
} from "./helpers";

export const getRecentReceipts = query({
  args: { 
    limit: v.optional(v.number()), 
    dateFrom: v.optional(v.number()), 
    dateTo: v.optional(v.number()), 
    searchTerm: v.optional(v.string()), 
    status: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_receipts");

    let receipts = [];
    const limit = args.limit || 100;

    if (args.status && !args.dateFrom && !args.dateTo) {
      const validStatus = args.status as "completed" | "pending" | "processing" | "failed";
      receipts = await ctx.db.query("receipts")
        .withIndex("by_processing_status", q => q.eq("processingStatus", validStatus))
        .order("desc")
        .take(limit);
    } else if (args.dateFrom || args.dateTo) {
      let q = ctx.db.query("receipts").withIndex("by_created");
      if (args.dateFrom) q = q.filter(q => q.gte(q.field("createdAt"), args.dateFrom!));
      if (args.dateTo) q = q.filter(q => q.lte(q.field("createdAt"), args.dateTo!));
      receipts = await q.order("desc").take(limit);
    } else {
      receipts = await ctx.db.query("receipts").order("desc").take(limit);
    }

    const userIds = [...new Set(receipts.map(r => r.userId))];
    const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
    const userMap = new Map(users.filter(u => u).map(u => [u!._id, u!]));

    const enriched = receipts.map(receipt => {
      const u = userMap.get(receipt.userId);
      const fallbackName = u?.email ? u.email.split("@")[0] : "Shopper";
      return {
        ...receipt,
        userName: u?.name || fallbackName,
        userEmail: u?.email || ""
      };
    });

    let filtered = enriched;
    if (args.searchTerm && args.searchTerm.length >= 2) {
      const term = args.searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.storeName?.toLowerCase().includes(term) ||
        r.userName?.toLowerCase().includes(term) ||
        r.userEmail?.toLowerCase().includes(term)
      );
    }

    if (args.status && (args.dateFrom || args.dateTo)) {
      filtered = filtered.filter(r => r.processingStatus === args.status);
    }

    return filtered.slice(0, limit);
  },
});

export const getFlaggedReceipts = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_receipts");
    
    const failed = await ctx.db
      .query("receipts")
      .withIndex("by_processing_status", q => q.eq("processingStatus", "failed"))
      .order("desc")
      .take(100);
      
    const userIds = [...new Set(failed.map(r => r.userId))];
    const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
    const userMap = new Map(users.filter(u => u).map(u => [u!._id, u!]));
    
    return failed.map(r => ({
      ...r,
      userName: userMap.get(r.userId)?.name || "Unknown"
    }));
  },
});

export const getPriceAnomalies = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_receipts");

    const recentPrices = await ctx.db
      .query("currentPrices")
      .withIndex("by_updated")
      .order("desc")
      .take(5000);

    const priceGroups = new Map<string, number[]>();

    for (const price of recentPrices) {
      const key = `${price.itemName || "unknown"}|${price.storeName || "unknown"}`;
      if (!priceGroups.has(key)) {
        priceGroups.set(key, []);
      }
      priceGroups.get(key)!.push(price.unitPrice);
    }

    const anomalies = [];

    for (const [key, prices] of priceGroups.entries()) {
      if (prices.length < 2) continue;

      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;

      for (let i = 0; i < prices.length; i++) {
        const price = prices[i];
        const deviation = Math.abs((price - avg) / avg);

        if (deviation > 0.5) {
          const [itemName, storeName] = key.split("|");
          const priceRecord = recentPrices.find(
            p => p.itemName === itemName && p.storeName === storeName && p.unitPrice === price
          );

          if (priceRecord) {
            anomalies.push({
              ...priceRecord,
              average: Math.round(avg * 100) / 100,
              deviationPercent: Math.round(deviation * 100),
            });
          }
        }
      }
    }

    const sorted = anomalies
      .sort((a, b) => b.deviationPercent - a.deviationPercent)
      .slice(0, args.limit || 50);

    return {
      anomalies: sorted,
      hasMore: anomalies.length > (args.limit || 50),
    };
  },
});

export const deleteReceipt = mutation({
  args: { receiptId: v.id("receipts") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "delete_receipts");
    
    const history = await ctx.db
      .query("priceHistory")
      .withIndex("by_receipt", q => q.eq("receiptId", args.receiptId))
      .collect();
      
    for (const h of history) {
      await ctx.db.delete(h._id);
    }

    await ctx.db.delete(args.receiptId);
    await ctx.db.insert("adminLogs", { 
      adminUserId: admin._id, 
      action: "delete_receipt", 
      targetType: "receipt", 
      targetId: args.receiptId, 
      details: `Deleted receipt and ${history.length} price history entries`,
      createdAt: Date.now() 
    });
    return { success: true };
  },
});

export const bulkReceiptAction = mutation({
  args: { receiptIds: v.array(v.id("receipts")), action: v.union(v.literal("approve"), v.literal("delete")) },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "bulk_operation");
    let deletedCount = 0;
    let approvedCount = 0;

    for (const id of args.receiptIds) {
      if (args.action === "delete") {
        const history = await ctx.db
          .query("priceHistory")
          .withIndex("by_receipt", q => q.eq("receiptId", id))
          .collect();
        for (const h of history) await ctx.db.delete(h._id);
        
        await ctx.db.delete(id);
        deletedCount++;
      } else {
        await ctx.db.patch(id, {
          processingStatus: "completed",
        });
        approvedCount++;
      }
    }
    
    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: `bulk_${args.action}`,
      targetType: "receipt",
      details: `Bulk ${args.action} on ${args.receiptIds.length} receipts`,
      createdAt: Date.now(),
    });
    return { success: true, count: args.receiptIds.length };
  },
});

export const overridePrice = mutation({
  args: { priceId: v.id("currentPrices"), newPrice: v.optional(v.number()), deleteEntry: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_catalog");
    const existing = await ctx.db.get(args.priceId);
    if (!existing) throw new Error("Price record not found");

    if (args.deleteEntry) {
      await ctx.db.delete(args.priceId);
      await ctx.db.insert("adminLogs", {
        adminUserId: admin._id,
        action: "delete_price",
        targetType: "currentPrice",
        targetId: args.priceId,
        details: `Deleted price record for ${existing.itemName} at ${existing.storeName}`,
        createdAt: Date.now()
      });
    } else if (args.newPrice !== undefined) {
      await ctx.db.patch(args.priceId, { unitPrice: args.newPrice });
      await ctx.db.insert("adminLogs", {
        adminUserId: admin._id,
        action: "override_price",
        targetType: "currentPrice",
        targetId: args.priceId,
        details: `Overrode price for ${existing.itemName} from £${existing.unitPrice} to £${args.newPrice}`,
        createdAt: Date.now()
      });
    }
    return { success: true };
  },
});
