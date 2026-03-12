import { defineTable } from "convex/server";
import { v } from "convex/values";

export const receiptTables = {
  // Receipts
  receipts: defineTable({
    userId: v.id("users"),
    listId: v.optional(v.id("shoppingLists")),

    // Store info
    storeName: v.string(),
    storeAddress: v.optional(v.string()),
    normalizedStoreId: v.optional(v.string()),  // Normalized store ID (e.g., "tesco", "sainsburys")

    // Totals
    subtotal: v.number(),
    tax: v.optional(v.number()),
    total: v.number(),

    // Items parsed from receipt
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        totalPrice: v.number(),
        category: v.optional(v.string()),
        size: v.optional(v.string()),      // "2L", "500g", "6-pack"
        unit: v.optional(v.string()),      // "L", "g", "pack"
        confidence: v.optional(v.number()), // 0-100 AI confidence score
      })
    ),

    // Overall image quality score from AI (0-100)
    imageQuality: v.optional(v.number()),

    // Receipt image
    imageStorageId: v.optional(v.string()),

    // Processing status
    processingStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),

    // Admin pre-launch seeding flag
    isAdminSeed: v.optional(v.boolean()),

    // Soft-delete: hides receipt from user's profile but preserves price data
    isHidden: v.optional(v.boolean()),

    purchaseDate: v.number(),
    createdAt: v.number(),

    // Duplicate detection fingerprint: storeName|total|purchaseDate
    fingerprint: v.optional(v.string()),

    // Fraud prevention and points
    imageHash: v.optional(v.string()),      // Link to receiptHashes
    pointsEarned: v.optional(v.number()),   // Points earned from this scan
    earnedPoints: v.optional(v.boolean()),  // Did this scan earn points?
    fraudFlags: v.optional(v.array(v.string())), // Validation warnings
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "purchaseDate"])
    .index("by_list", ["listId"])
    .index("by_user_fingerprint", ["userId", "fingerprint"])
    .index("by_processing_status", ["processingStatus"])
    .index("by_created", ["createdAt"])
    .index("by_store_status", ["storeName", "processingStatus"])
    .index("by_status_created", ["processingStatus", "createdAt"])
    .index("by_hash", ["imageHash"]) // Deduplication
    .searchIndex("search_store", { searchField: "storeName" }),

  receiptHashes: defineTable({
    userId: v.id("users"),
    imageHash: v.string(),          // SHA-256 of receipt image
    receiptId: v.id("receipts"),
    storeName: v.optional(v.string()),
    receiptDate: v.optional(v.number()), // Parsed from OCR
    totalAmount: v.optional(v.number()),
    ocrConfidence: v.optional(v.number()), // 0-100
    flags: v.optional(v.array(v.string())), // ["duplicate", "low_confidence", etc]
    firstSeenAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_hash", ["imageHash"])
    .index("by_user_and_date", ["userId", "receiptDate"])
    .index("by_flags", ["flags"]),

  // Store-specific learned mappings (crowdsourced)
  itemMappings: defineTable({
    // Store context
    normalizedStoreId: v.string(),        // "primark", "tesco", etc.

    // Receipt-side pattern (what appears on receipt)
    receiptPattern: v.string(),           // Normalized receipt text (lowercase, trimmed)
    receiptPatternTokens: v.array(v.string()), // Tokenized for partial matching ["socks", "black", "35", "38"]

    // Canonical-side (what we map to)
    canonicalName: v.string(),            // "Socks", "NFL Socks 2pk"
    canonicalCategory: v.optional(v.string()), // "Clothing", "Food", etc.

    // Confidence & learning
    confirmationCount: v.number(),        // How many users confirmed this mapping
    lastConfirmedAt: v.number(),          // Timestamp of last confirmation
    lastConfirmedBy: v.optional(v.id("users")), // Last user who confirmed

    // Price context (helps with matching)
    typicalPriceMin: v.optional(v.number()), // Lowest confirmed price
    typicalPriceMax: v.optional(v.number()), // Highest confirmed price

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_store_pattern", ["normalizedStoreId", "receiptPattern"])
    .index("by_store", ["normalizedStoreId"])
    .index("by_canonical", ["canonicalName"])
    .index("by_confirmations", ["confirmationCount"]),

  // Pending matches waiting for user confirmation
  pendingItemMatches: defineTable({
    userId: v.id("users"),
    receiptId: v.id("receipts"),

    // Receipt item info
    receiptItemName: v.string(),          // "socks black 35 38 0502927"
    receiptItemPrice: v.number(),         // Unit price from receipt
    receiptItemQuantity: v.number(),

    // Candidate matches (suggested by system)
    candidateMatches: v.array(v.object({
      listItemId: v.optional(v.id("listItems")),  // If from active list
      pantryItemId: v.optional(v.id("pantryItems")), // If from pantry
      scannedProductName: v.optional(v.string()), // Name from product scan
      matchScore: v.number(),             // 0-1 confidence
      matchReason: v.string(),            // "category_match", "price_match", "token_overlap"
    })),

    // Resolution
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("skipped"),
      v.literal("no_match")
    ),
    confirmedMatch: v.optional(v.object({
      type: v.union(v.literal("list_item"), v.literal("pantry_item"), v.literal("new_item")),
      itemId: v.optional(v.string()),     // listItemId or pantryItemId
      canonicalName: v.string(),          // The name user confirmed
    })),

    // Metadata
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_receipt", ["receiptId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"]),
};
