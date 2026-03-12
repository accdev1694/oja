import { defineTable } from "convex/server";
import { v } from "convex/values";

export const contentTables = {
  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"]),

  // Feature flags
  featureFlags: defineTable({
    key: v.string(),
    value: v.boolean(),
    description: v.optional(v.string()),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"]),

  // In-app announcements
  announcements: defineTable({
    title: v.string(),
    body: v.string(),
    type: v.union(v.literal("info"), v.literal("warning"), v.literal("promo")),
    active: v.boolean(),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_active", ["active"]),

  // ─── Nurture Sequence ────────────────────────────────────────────────────────
  nurtureMessages: defineTable({
    userId: v.id("users"),
    messageKey: v.string(), // e.g., "day_1_welcome", "day_2_first_list", "trial_ending_3d"
    sentAt: v.number(),
    channel: v.union(v.literal("push"), v.literal("in_app"), v.literal("both")),
  })
    .index("by_user", ["userId"])
    .index("by_user_message", ["userId", "messageKey"]),

  // ─── Contextual Tips ─────────────────────────────────────────────────────────
  tipsDismissed: defineTable({
    userId: v.id("users"),
    tipKey: v.string(), // e.g., "swipe_to_change_stock", "tap_to_add_list", "voice_assistant"
    dismissedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_tip", ["userId", "tipKey"]),

  // 4.4 Content Management System (CMS)
  helpArticles: defineTable({
    title: v.string(),
    slug: v.string(),
    content: v.string(), // Markdown
    categoryId: v.id("helpCategories"),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    publishedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["categoryId"])
    .index("by_status", ["status"]),

  helpCategories: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    order: v.number(),
  })
    .index("by_order", ["order"]),

  // Tutorial hints
  tutorialHints: defineTable({
    userId: v.id("users"),
    hintId: v.string(), // "lists_create", "list_detail_budget", "stock_low_alert"
    viewedAt: v.number(), // timestamp
    dismissedAt: v.number(), // timestamp
  })
    .index("by_user", ["userId"])
    .index("by_user_hint", ["userId", "hintId"]),
};
