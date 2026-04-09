import { v } from "convex/values";
import { mutation, action, internalMutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import {
  requirePermission,
  requirePermissionQuery
} from "./helpers";

export const createExperiment = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    goalEvent: v.string(),
    variants: v.array(v.object({
      name: v.string(),
      allocationPercent: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");

    const totalAllocation = args.variants.reduce((sum, v) => sum + v.allocationPercent, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error("Variant allocations must sum to 100%");
    }

    const now = Date.now();
    const experimentId = await ctx.db.insert("experiments", {
      name: args.name,
      description: args.description,
      goalEvent: args.goalEvent,
      status: "draft",
      startDate: now,
      createdBy: admin._id,
      createdAt: now,
    });

    for (const variant of args.variants) {
      await ctx.db.insert("experimentVariants", {
        experimentId,
        variantName: variant.name,
        allocationPercent: variant.allocationPercent,
      });
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "create_experiment",
      targetType: "experiment",
      targetId: experimentId,
      details: `Created experiment: ${args.name}`,
      createdAt: now,
    });

    return { success: true, experimentId };
  },
});

export const getExperiments = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db
      .query("experiments")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

export const exportDataToCSV = action({
  args: { dataType: v.union(v.literal("users"), v.literal("receipts"), v.literal("prices"), v.literal("analytics")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Defense-in-depth: gate the action itself on admin/view_analytics.
    // Downstream query calls (listUsersForExport, getRecentReceipts) gate
    // their own permissions, but the "prices"/"analytics" stub branches
    // don't touch any gated query — without this check a non-admin could
    // probe the endpoint and confirm its existence.
    const perms = await ctx.runQuery(api.admin.getMyPermissions, {});
    if (!perms || !perms.permissions.includes("view_analytics")) {
      throw new Error("Admin access required");
    }

    let csv = "";

    if (args.dataType === "users") {
      // Use the dedicated export query — `searchUsers` short-circuits to [] for
      // terms shorter than 2 characters, so it produced header-only CSVs.
      const users = await ctx.runQuery(api.admin.listUsersForExport, {});
      csv = "ID,Name,Email,IsAdmin,Suspended,CreatedAt\n";
      for (const u of users) {
        csv += `${u._id},"${u.name || ""}",${u.email || ""},${!!u.isAdmin},${!!u.suspended},${new Date(u.createdAt).toISOString()}\n`;
      }
    } else if (args.dataType === "receipts") {
      const receipts = await ctx.runQuery(api.admin.getRecentReceipts, { limit: 1000 });
      csv = "ID,Store,Total,User,Status,Date\n";
      for (const r of receipts) {
        csv += `${r._id},"${r.storeName}",${r.total},"${r.userName}",${r.processingStatus},${new Date(r.purchaseDate || Date.now()).toISOString()}\n`;
      }
    } else {
      csv = "Feature not fully implemented in CSV export";
    }

    return { csv, fileName: `oja_export_${args.dataType}_${Date.now()}.csv` };
  },
});

export const clearSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requirePermission(ctx, "manage_catalog");

    // Use the dedicated by_admin_seed index instead of scanning every receipt
    // in the table — receipts can grow to 10K+ rows in production, and this
    // function was previously loading them all into memory just to filter in JS.
    let deletedReceipts = 0;
    const seedReceipts = await ctx.db
      .query("receipts")
      .withIndex("by_admin_seed", (q) => q.eq("isAdminSeed", true))
      .collect();
    for (const r of seedReceipts) {
      await ctx.db.delete(r._id);
      deletedReceipts++;
    }

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "clear_seed_data",
      targetType: "system",
      details: `Cleared ${deletedReceipts} seed receipts`,
      createdAt: Date.now(),
    });

    return { success: true, deletedReceipts };
  },
});

export const simulateSystemLoad = mutation({
  args: { intensity: v.number() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");

    for (let i = 0; i < args.intensity; i++) {
      await ctx.db.insert("adminAlerts", {
        alertType: "simulated_load_test",
        message: `System load simulation active (Instance ${i+1})`,
        severity: i % 2 === 0 ? "warning" : "critical",
        isResolved: false,
        createdAt: Date.now(),
      });
    }

    return { success: true, alertsGenerated: args.intensity };
  },
});

export const simulateHighLoad = internalMutation({
  args: { userCount: v.number(), receiptCount: v.number() },
  handler: async (ctx, args) => {
    return { success: true, message: "Use simulateSystemLoad mutation for manual triggering" };
  },
});
