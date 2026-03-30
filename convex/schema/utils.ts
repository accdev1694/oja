import { defineTable } from "convex/server";
import { v } from "convex/values";

export const utilityTables = {
  // Phase 5.2.1: Referral Program
  referralCodes: defineTable({
    userId: v.id("users"),
    code: v.string(),           // Unique 8-char code
    referredUsers: v.array(v.id("users")), // Who they referred
    pointsEarned: v.number(),   // Total bonus points from referrals
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_code", ["code"]),

  // Rate limiting (Phase 2.1)
  rateLimits: defineTable({
    userId: v.id("users"),
    feature: v.string(), // "receipt_scan", "voice_assistant", "ai_estimation"
    windowStart: v.number(), // timestamp
    count: v.number(),
  })
    .index("by_user_feature", ["userId", "feature", "windowStart"]),

  // Atomic Points Deduction (Phase 2)
  pointsReservations: defineTable({
    userId: v.id("users"),
    stripeInvoiceId: v.string(),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("released")),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_invoice", ["stripeInvoiceId"])
    .index("by_status_expires", ["status", "expiresAt"]),

  // Points Reconciliation (Phase 2)
  discrepancies: defineTable({
    type: v.string(),
    severity: v.string(),
    description: v.string(),
    metadata: v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())),
    status: v.union(v.literal("open"), v.literal("resolved")),
    createdAt: v.number(),
  })
    .index("by_status", ["status"]),

  // Scheduled Reports (Phase 4.4)
  scheduledReports: defineTable({
    type: v.union(v.literal("weekly_summary"), v.literal("monthly_financial")),
    recipientEmails: v.array(v.string()),
    lastRunAt: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("paused")),
    createdAt: v.number(),
  }),

  reportHistory: defineTable({
    reportId: v.id("scheduledReports"),
    data: v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null())), // Serialized metrics
    sentAt: v.number(),
    status: v.union(v.literal("success"), v.literal("failed")),
    error: v.optional(v.string()),
  }).index("by_report", ["reportId"]),

  // Trial abuse prevention: tombstone records for deleted accounts.
  // When a user deletes their account, we record their email so re-signups
  // can't exploit the free trial again.
  deletedAccounts: defineTable({
    email: v.string(),            // Normalized email at time of deletion
    clerkId: v.optional(v.string()), // Clerk ID (for support investigations)
    trialUsed: v.boolean(),       // Whether this account had a trial
    deletedAt: v.number(),
  })
    .index("by_email", ["email"]),

  userTags: defineTable({
    userId: v.id("users"),
    tag: v.string(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_tag", ["tag"]),
};
