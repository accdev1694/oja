import { defineTable } from "convex/server";
import { v } from "convex/values";

export const subscriptionTables = {
  // User subscriptions
  subscriptions: defineTable({
    userId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("premium_monthly"), v.literal("premium_annual")),
    status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("expired"), v.literal("trial")),
    lastStatus: v.optional(v.string()), // For movement tracking (e.g., "trial" -> "active")
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_status", ["status"])
    .index("by_current_period_end", ["currentPeriodEnd"])
    .index("by_plan_status", ["plan", "status"])
    .index("by_created", ["createdAt"]),

  // Revenue movements tracking (Phase 4.1)
  revenueMetrics: defineTable({
    month: v.string(), // "2025-02"
    newMrr: v.number(),       // Revenue from new subscribers
    expansionMrr: v.number(), // Revenue from upgrades
    contractionMrr: v.number(), // Revenue from downgrades
    churnMrr: v.number(),     // Lost revenue from cancellations
    totalMrr: v.number(),     // Net MRR at month end
    computedAt: v.number(),
  })
    .index("by_month", ["month"]),

  // DEPRECATED: Legacy scan credits (migrated to pointsBalance/pointsTransactions)
  // Keep in schema until all data is verified migrated and tables emptied
  scanCredits: defineTable({
    userId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
    scansThisPeriod: v.number(),
    creditsEarned: v.number(),
    maxScans: v.number(),
    maxCredits: v.number(),
    creditPerScan: v.number(),
    appliedToInvoice: v.boolean(),
    stripeInvoiceId: v.optional(v.string()),

    // Unified rewards — tier progression based on lifetime scans
    lifetimeScans: v.optional(v.number()),
    tier: v.optional(v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold"), v.literal("platinum"))),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_period", ["userId", "periodEnd"]),

  // DEPRECATED: Legacy scan credit events (migrated to pointsTransactions)
  // Keep in schema until all data is verified migrated and tables emptied
  scanCreditTransactions: defineTable({
    userId: v.id("users"),
    scanCreditId: v.id("scanCredits"),
    receiptId: v.id("receipts"),
    creditAmount: v.number(),
    scanNumber: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_scan_credit", ["scanCreditId"])
    .index("by_receipt", ["receiptId"]),

  // Pricing configuration (dynamic subscription prices)
  pricingConfig: defineTable({
    planId: v.string(), // "premium_monthly" | "premium_annual"
    displayName: v.string(), // "Premium Monthly"
    priceAmount: v.number(), // 2.99
    currency: v.string(), // "GBP"
    region: v.optional(v.string()), // "UK", "US", or postcode prefix (Phase 4.1)
    stripePriceId: v.optional(v.string()), // From env: STRIPE_PRICE_MONTHLY
    isActive: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_plan", ["planId"])
    .index("by_active", ["isActive"])
    .index("by_region", ["region"]),
};
