import { defineTable } from "convex/server";
import { v } from "convex/values";

export const pricingTables = {
  // Current best-known prices (freshest price per item per store)
  currentPrices: defineTable({
    normalizedName: v.string(),
    variantName: v.optional(v.string()),  // "Whole Milk 2 Pints"
    itemName: v.string(),         // Display name (original casing)
    size: v.optional(v.string()), // "2 pints"
    unit: v.optional(v.string()), // "pint"
    storeName: v.string(),
    normalizedStoreId: v.optional(v.string()),  // Normalized store ID (e.g., "tesco", "sainsburys")
    region: v.optional(v.string()), // Postcode area (Phase 2)

    // Price data
    unitPrice: v.number(),         // Most recent single report (existing field)
    averagePrice: v.optional(v.number()),  // Weighted 30-day average
    minPrice: v.optional(v.number()),      // Lowest in 30 days
    maxPrice: v.optional(v.number()),      // Highest in 30 days
    reportCount: v.number(),       // How many receipts contributed
    confidence: v.optional(v.number()),    // 0-1 based on reportCount + recency

    lastSeenDate: v.number(),      // purchaseDate from receipt
    lastReportedBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_item", ["normalizedName"])
    .index("by_item_store", ["normalizedName", "storeName"])
    .index("by_item_store_region", ["normalizedName", "storeName", "region"])
    .index("by_store", ["storeName"])
    .index("by_updated", ["updatedAt"]),

  // Price history tracking
  priceHistory: defineTable({
    userId: v.id("users"),
    receiptId: v.id("receipts"),

    // Item info
    itemName: v.string(),
    normalizedName: v.string(), // Lowercase for fuzzy matching
    size: v.optional(v.string()),  // "2 pints"
    unit: v.optional(v.string()),  // "pint"

    // Price info
    price: v.number(),
    quantity: v.number(),
    unitPrice: v.number(),

    // Store info
    storeName: v.string(),
    storeAddress: v.optional(v.string()),
    normalizedStoreId: v.optional(v.string()),  // Normalized store ID (e.g., "tesco", "sainsburys")
    region: v.optional(v.string()),

    // Purchase date
    purchaseDate: v.number(),

    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_item", ["userId", "normalizedName"])
    .index("by_user_item_date", ["userId", "normalizedName", "purchaseDate"])
    .index("by_user_item_store", ["userId", "normalizedName", "storeName"])
    .index("by_receipt", ["receiptId"])
    .index("by_store", ["storeName"]),

  // Aggregated price history (for long-term retention)
  priceHistoryMonthly: defineTable({
    userId: v.id("users"),
    normalizedName: v.string(),
    month: v.string(), // "2025-01"
    
    // Aggregated stats
    avgPrice: v.number(),
    minPrice: v.number(),
    maxPrice: v.number(),
    entryCount: v.number(),
    
    // Store context
    storeName: v.string(),
    normalizedStoreId: v.optional(v.string()),
    region: v.optional(v.string()),

    updatedAt: v.number(),
  })
    .index("by_user_month", ["userId", "month"])
    .index("by_user_item_month", ["userId", "normalizedName", "month"]),

  // Item variants (size-aware pricing + community product catalog)
  itemVariants: defineTable({
    baseItem: v.string(),            // "milk" (normalized)
    variantName: v.string(),         // "Whole Milk 2 Pints"
    size: v.string(),                // "2 pints"
    unit: v.string(),                // "pint"
    category: v.string(),            // "Dairy"
    source: v.string(),              // "ai_seeded" | "receipt_discovered" | "scan_enriched"
    commonality: v.optional(v.number()), // How often this variant appears in receipts (0-1)
    estimatedPrice: v.optional(v.number()), // AI-generated price for this variant
    brand: v.optional(v.string()),   // "Sainsbury's", "Tesco" — from scans
    productName: v.optional(v.string()), // "Free Range Eggs" — specific name from scans
    displayLabel: v.optional(v.string()), // "Free Range 6pk" — short chip label
    scanCount: v.optional(v.number()), // Times scanned — higher = more trusted

    // Community product sharing fields
    imageStorageId: v.optional(v.id("_storage")), // First scan photo of this product
    userCount: v.optional(v.number()),    // Approximate distinct users who've scanned/bought this
    lastSeenAt: v.optional(v.number()),   // Last time any user scanned/bought this variant
    region: v.optional(v.string()),       // Postcode area prefix (e.g., "SW", "M", "B") — Phase 3 prep
  })
    .index("by_base_item", ["baseItem"])
    .index("by_base_item_region", ["baseItem", "region"]),
};
