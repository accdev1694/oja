import { defineTable } from "convex/server";
import { v } from "convex/values";

export const gamificationTables = {
  // User achievements
  achievements: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    unlockedAt: v.number(),
    data: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null()))),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"]),

  // User streaks
  streaks: defineTable({
    userId: v.id("users"),
    type: v.string(),
    currentCount: v.number(),
    longestCount: v.number(),
    lastActivityDate: v.string(),
    startedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"]),

  // Weekly challenges
  weeklyChallenges: defineTable({
    userId: v.id("users"),
    type: v.string(), // e.g. "buy_sale_items", "under_budget_trips", "scan_receipts"
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    target: v.number(),
    progress: v.number(),
    reward: v.number(), // bonus points
    startDate: v.string(), // ISO date
    endDate: v.string(), // ISO date
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "endDate"]),

  // New Points System (Phase 2)
  pointsBalance: defineTable({
    userId: v.id("users"),
    totalPoints: v.number(),        // Lifetime earned
    availablePoints: v.number(),    // Current balance (redeemable)
    pendingPoints: v.optional(v.number()),  // DEPRECATED: unused, kept for backward compat
    pointsUsed: v.number(),         // Historical redemptions
    tier: v.string(),               // bronze/silver/gold/platinum
    tierProgress: v.number(),       // Lifetime scans (for tier calc)
    earningScansThisMonth: v.number(), // Count of scans that earned points this month
    monthStart: v.number(),         // Timestamp of current earning period start
    lastEarnedAt: v.number(),       // Timestamp of last points earned
    streakCount: v.number(),        // Consecutive weeks with scans
    lastStreakScan: v.number(),     // Week number of last scan (for streak tracking)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_tier", ["tier"]),

  pointsTransactions: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("earn"),        // Earned from scan
      v.literal("bonus"),       // Streak/referral bonus
      v.literal("redeem"),      // Applied to invoice
      v.literal("expire"),      // Points expired (12mo)
      v.literal("refund"),      // Scan deleted/fraudulent
    ),
    amount: v.number(),          // Points (positive or negative)
    source: v.string(),          // "receipt_scan", "referral", "streak_bonus", "invoice_XXX"
    receiptId: v.optional(v.id("receipts")),
    invoiceId: v.optional(v.string()), // Stripe invoice ID
    stripeInvoiceItemId: v.optional(v.string()), // Stripe invoice item ID
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    metadata: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null()))),  // Extra data (e.g., tier at time of earn)
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_type", ["userId", "type"])
    .index("by_receipt", ["receiptId"])
    .index("by_receipt_and_type", ["receiptId", "type"])
    .index("by_created", ["createdAt"]),

  // Phase 5.3.1: Seasonal Events
  seasonalEvents: defineTable({
    name: v.string(),           // "Double Points December"
    description: v.string(),
    type: v.union(
      v.literal("points_multiplier"),  // 2x points
      v.literal("bonus_points"),       // +X bonus per scan
      v.literal("tier_boost"),         // Temporary tier upgrade
    ),
    multiplier: v.optional(v.number()),  // 2.0 for double points
    bonusAmount: v.optional(v.number()), // +50 per scan
    isActive: v.boolean(),
    startDate: v.number(),
    endDate: v.number(),
    createdAt: v.number(),
  })
    .index("by_active", ["isActive"])
    .index("by_dates", ["startDate", "endDate"]),

  // DEPRECATED: Legacy loyalty points (migrated to pointsBalance/pointsTransactions)
  // Keep in schema until all data is verified migrated and tables emptied
  loyaltyPoints: defineTable({
    userId: v.id("users"),
    points: v.number(),
    lifetimePoints: v.number(),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold"), v.literal("platinum")),
    lastEarnedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // DEPRECATED: Legacy point transactions (migrated to pointsTransactions)
  // Keep in schema until all data is verified migrated and tables emptied
  pointTransactions: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    type: v.union(v.literal("earned"), v.literal("redeemed"), v.literal("expired")),
    source: v.string(),
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),
};
