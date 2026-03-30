import { defineTable } from "convex/server";
import { v } from "convex/values";

export const experimentTables = {
  // 4.2 A/B Testing Framework
  experiments: defineTable({
    name: v.string(),
    description: v.string(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("running"), v.literal("paused"), v.literal("completed")),
    goalEvent: v.string(), // Event to track conversion
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_status", ["status"]),

  experimentVariants: defineTable({
    experimentId: v.id("experiments"),
    variantName: v.string(), // "control", "test_a", "test_b"
    allocationPercent: v.number(), // 0-100
  })
    .index("by_experiment", ["experimentId"]),

  experimentAssignments: defineTable({
    userId: v.id("users"),
    experimentId: v.id("experiments"),
    variantName: v.string(),
    assignedAt: v.number(),
  })
    .index("by_user_experiment", ["userId", "experimentId"])
    .index("by_user", ["userId"])
    .index("by_experiment", ["experimentId"]),

  experimentEvents: defineTable({
    userId: v.id("users"),
    experimentId: v.id("experiments"),
    variantName: v.string(),
    eventName: v.string(),
    timestamp: v.number(),
  })
    .index("by_experiment_variant", ["experimentId", "variantName"])
    .index("by_experiment", ["experimentId"])
    .index("by_user", ["userId"]),

  // 4.3 Automated Workflows
  automationWorkflows: defineTable({
    name: v.string(),
    trigger: v.string(), // subscription_canceled, trial_ending, user_inactive_30d, payment_failed
    actions: v.array(v.object({
      type: v.string(), // send_email, send_push, suspend_user, apply_tag
      params: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null()))),
    })),
    isEnabled: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_enabled", ["isEnabled"]),

  // 4.5 External Integrations (Phase 4.1)
  webhooks: defineTable({
    url: v.string(),
    secret: v.string(),
    description: v.optional(v.string()),
    events: v.array(v.string()), // ["receipt.completed", "user.subscribed", etc.]
    isEnabled: v.boolean(),
    lastTriggeredAt: v.optional(v.number()),
    lastResponseStatus: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_enabled", ["isEnabled"]),

  // Webhook idempotency (Stripe + Clerk)
  processedWebhooks: defineTable({
    eventId: v.string(),          // Webhook event ID (Stripe event.id or Svix svix-id)
    eventType: v.string(),        // "checkout.session.completed", "user.updated", etc.
    source: v.optional(v.string()), // "stripe" or "clerk"
    processedAt: v.number(),      // Timestamp
    status: v.optional(v.union(v.literal("processing"), v.literal("completed"), v.literal("failed"))),
    error: v.optional(v.string()),
  })
    .index("by_event_id", ["eventId"])
    .index("by_processed_at", ["processedAt"]),
};
