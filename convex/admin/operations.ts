import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, action, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { 
  requirePermission, 
  requirePermissionQuery 
} from "./helpers";

export const archiveOldAdminLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    
    const oldLogs = await ctx.db
      .query("adminLogs")
      .withIndex("by_created", (q) => q.lt("createdAt", ninetyDaysAgo))
      .take(100);

    if (oldLogs.length === 0) return { archived: 0 };

    for (const log of oldLogs) {
      await ctx.db.insert("archivedAdminLogs", {
        adminUserId: log.adminUserId,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        details: log.details,
        createdAt: log.createdAt,
        archivedAt: Date.now(),
      });
      
      await ctx.db.delete(log._id);
    }

    return { archived: oldLogs.length };
  },
});

export const manuallyArchiveOldAdminLogs = mutation({
  args: { daysToKeep: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");

    const daysToKeep = args.daysToKeep ?? 30;
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    const oldLogs = await ctx.db
      .query("adminLogs")
      .withIndex("by_created", (q) => q.lt("createdAt", cutoffDate))
      .collect();

    let archivedCount = 0;
    for (const log of oldLogs) {
      await ctx.db.insert("archivedAdminLogs", {
        adminUserId: log.adminUserId,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        details: log.details,
        createdAt: log.createdAt,
        archivedAt: Date.now(),
      });
      await ctx.db.delete(log._id);
      archivedCount++;
    }

    return { success: true, archivedCount };
  },
});

export const runScheduledReports = internalMutation({
  args: { type: v.union(v.literal("weekly_summary"), v.literal("monthly_financial")) },
  handler: async (ctx, args) => {
    const activeConfigs = await ctx.db
      .query("scheduledReports")
      .filter((q) => q.and(q.eq(q.field("type"), args.type), q.eq(q.field("status"), "active")))
      .collect();

    if (activeConfigs.length === 0) return { status: "no_active_configs" };

    let reportData: Record<string, string | number | boolean | null> = {};
    if (args.type === "weekly_summary") {
      // @ts-ignore
      const raw = await ctx.runQuery(api.admin.getAnalytics, {});
      reportData = raw as Record<string, string | number | boolean | null>;
    } else {
      // @ts-ignore
      const raw = await ctx.runQuery(api.admin.getRevenueReport, {});
      reportData = raw as Record<string, string | number | boolean | null>;
    }

    // Find an admin user to attribute system-generated logs to
    const systemAdmin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .first();

    for (const config of activeConfigs) {
      await ctx.db.insert("reportHistory", {
        reportId: config._id,
        data: reportData,
        sentAt: Date.now(),
        status: "success",
      });

      await ctx.db.patch(config._id, { lastRunAt: Date.now() });

      if (systemAdmin) {
        await ctx.db.insert("adminLogs", {
          adminUserId: systemAdmin._id,
          action: "report_generated",
          targetType: "report",
          targetId: config._id,
          details: `Generated ${args.type} for ${config.recipientEmails.join(", ")}`,
          createdAt: Date.now(),
        });
      }
    }

    return { status: "success", count: activeConfigs.length };
  },
});

export const getMonitoringSummary = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    
    const activeAlerts = await ctx.db
      .query("adminAlerts")
      .withIndex("by_resolved", (q) => q.eq("isResolved", false))
      .collect();
      
    const recentSLA = await ctx.db
      .query("slaMetrics")
      .order("desc")
      .take(10);
      
    return {
      alerts: activeAlerts,
      alertCount: activeAlerts.length,
      slaStatus: recentSLA.some(s => s.status === "fail") ? "failing" : 
                 recentSLA.some(s => s.status === "warn") ? "degraded" : "healthy",
      recentSLA,
    };
  },
});

export const resolveAlert = mutation({
  args: { alertId: v.id("adminAlerts") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");
    
    await ctx.db.patch(args.alertId, {
      isResolved: true,
      resolvedBy: admin._id,
      resolvedAt: Date.now(),
    });
    
    return { success: true };
  },
});

export const getSystemHealth = query({
  args: { refreshKey: v.optional(v.string()) },
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const activeAlerts = await ctx.db
      .query("adminAlerts")
      .withIndex("by_resolved", q => q.eq("isResolved", false))
      .collect();

    const recentReceipts = await ctx.db
      .query("receipts")
      .withIndex("by_created", q => q.gte("createdAt", oneDayAgo))
      .collect();
    
    const failed = recentReceipts.filter(r => r.processingStatus === "failed").length;
    const processing = recentReceipts.filter(r => r.processingStatus === "processing").length;
    const total = recentReceipts.length;
    const successRate = total > 0 ? Math.round(((total - failed) / total) * 100) : 100;

    let status: "healthy" | "degraded" | "down" = "healthy";
    if (activeAlerts.some(a => a.severity === "critical") || successRate < 80) {
      status = "down";
    } else if (activeAlerts.length > 0 || successRate < 95) {
      status = "degraded";
    }

    return { 
      status, 
      receiptProcessing: { 
        total, 
        failed, 
        processing, 
        successRate 
      }, 
      alertCount: activeAlerts.length,
      timestamp: now 
    };
  },
});

export const getAuditLogs = query({
  args: { paginationOpts: paginationOptsValidator, refreshKey: v.optional(v.string()), dateFrom: v.optional(v.number()), dateTo: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePermissionQuery(ctx, "view_audit_logs");
    
    let query = ctx.db.query("adminLogs").withIndex("by_created");
    
    if (args.dateFrom) {
      query = query.filter(q => q.gte(q.field("createdAt"), args.dateFrom!));
    }
    if (args.dateTo) {
      query = query.filter(q => q.lte(q.field("createdAt"), args.dateTo!));
    }
    
    const logs = await query.order("desc").paginate(args.paginationOpts);
    
    const adminIds = [...new Set(logs.page.map(l => l.adminUserId))];
    const admins = await Promise.all(adminIds.map(id => ctx.db.get(id)));
    const adminMap = new Map(admins.filter(a => a).map(a => [a!._id, a!]));
    
    const enriched = logs.page.map(l => ({
      ...l,
      adminName: adminMap.get(l.adminUserId)?.name || "Unknown"
    }));
    
    return { ...logs, page: enriched };
  },
});

export const toggleWorkflow = mutation({
  args: { workflowId: v.id("automationWorkflows") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");

    const workflow = await ctx.db.get(args.workflowId);
    if (!workflow) throw new Error("Workflow not found");

    await ctx.db.patch(args.workflowId, {
      isEnabled: !workflow.isEnabled,
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "toggle_workflow",
      targetType: "workflow",
      targetId: args.workflowId,
      details: `${workflow.isEnabled ? "Disabled" : "Enabled"} workflow: ${workflow.name}`,
      createdAt: Date.now(),
    });

    return { success: true, isEnabled: !workflow.isEnabled };
  },
});

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

export const exportDataToCSV = action({
  args: { dataType: v.union(v.literal("users"), v.literal("receipts"), v.literal("prices"), v.literal("analytics")) },
  handler: async (ctx, args) => {
    let csv = "";
    
    if (args.dataType === "users") {
      const users = await ctx.runQuery(api.admin.searchUsers, { searchTerm: "" });
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

    let deletedReceipts = 0;
    const receipts = await ctx.db.query("receipts").collect();
    for (const r of receipts) {
      if (r.isAdminSeed) {
        await ctx.db.delete(r._id);
        deletedReceipts++;
      }
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

export const getExperiments = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db.query("experiments").order("desc").collect();
  },
});

export const getWorkflows = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db.query("automationWorkflows").take(100);
  },
});
