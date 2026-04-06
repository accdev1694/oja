import { defineTable } from "convex/server";
import { v } from "convex/values";

export const adminTables = {
  // Admin audit logs
  adminLogs: defineTable({
    adminUserId: v.id("users"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_admin", ["adminUserId"])
    .index("by_action", ["action"])
    .index("by_created", ["createdAt"])
    .index("by_admin_created", ["adminUserId", "createdAt"]),

  // Cold storage for old admin logs (Phase 3.1)
  archivedAdminLogs: defineTable({
    adminUserId: v.id("users"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    details: v.optional(v.string()),
    createdAt: v.number(),
    archivedAt: v.number(),
  }).index("by_created", ["createdAt"]),

  // RBAC Roles (Phase 1.2)
  adminRoles: defineTable({
    name: v.string(), // "super_admin", "support", "analyst", "developer"
    displayName: v.string(), // "Super Administrator"
    description: v.string(),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  // Role -> Permission Mapping
  rolePermissions: defineTable({
    roleId: v.id("adminRoles"),
    permission: v.string(), // "view_users", "delete_receipts", "manage_flags", etc.
    createdAt: v.number(),
  }).index("by_role", ["roleId"])
    .index("by_permission", ["permission"])
    .index("by_role_permission", ["roleId", "permission"]),

  // User -> Role Mapping
  userRoles: defineTable({
    userId: v.id("users"),
    roleId: v.id("adminRoles"),
    grantedBy: v.optional(v.id("users")),
    grantedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_role", ["roleId"]),

  // Admin Sessions (Phase 1.3)
  adminSessions: defineTable({
    userId: v.id("users"),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    loginAt: v.number(),
    lastSeenAt: v.number(),
    logoutAt: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("logged_out"), v.literal("expired")),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),

  adminRateLimits: defineTable({
    userId: v.id("users"),
    action: v.string(), // mutation name
    count: v.number(),
    windowStart: v.number(),
  }).index("by_user_action", ["userId", "action"]),

  // Support tickets
  supportTickets: defineTable({
    userId: v.id("users"),
    subject: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("waiting_on_user"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    assignedTo: v.optional(v.id("users")), // Admin user ID
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_assigned", ["assignedTo"]),

  // Messages within a support ticket
  ticketMessages: defineTable({
    ticketId: v.id("supportTickets"),
    senderId: v.id("users"),
    message: v.string(),
    isFromAdmin: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_ticket", ["ticketId"]),

  // Impersonation tokens (Phase 3.2)
  impersonationTokens: defineTable({
    userId: v.id("users"),
    tokenValue: v.string(),
    createdBy: v.id("users"), // Admin who generated it
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token", ["tokenValue"])
    .index("by_user", ["userId"]),

  // Admin Dashboard customization (Phase 4.4)
  adminDashboardPreferences: defineTable({
    userId: v.id("users"),
    overviewWidgets: v.array(v.object({
      id: v.string(), // "health", "analytics", "revenue", "audit_logs"
      visible: v.boolean(),
      order: v.number(),
    })),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // 4.1 Real-Time Monitoring
  adminAlerts: defineTable({
    alertType: v.string(), // receipt_failure_spike, payment_failed, system_error, high_latency
    message: v.string(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    metadata: v.optional(v.any()), // Rich context (request counts, costs, usage %) for debugging
    isResolved: v.boolean(),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_severity", ["severity"])
    .index("by_resolved", ["isResolved"]),

  slaMetrics: defineTable({
    metric: v.string(), // receipt_processing_time, api_latency, search_relevance
    target: v.number(), // in ms
    actual: v.number(), // in ms
    status: v.union(v.literal("pass"), v.literal("warn"), v.literal("fail")),
    timestamp: v.number(),
  })
    .index("by_metric", ["metric"])
    .index("by_timestamp", ["timestamp"]),

  // 4.6 Advanced Search & Filtering (Phase 4.2)
  savedFilters: defineTable({
    adminUserId: v.id("users"),
    name: v.string(),
    tab: v.string(), // "users" | "receipts"
    filterData: v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())), // JSON serialized filter state
    createdAt: v.number(),
  })
    .index("by_admin_tab", ["adminUserId", "tab"]),
};
