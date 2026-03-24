import { defineTable } from "convex/server";
import { v } from "convex/values";

export const coreTables = {
  // User profiles (synced from Clerk)
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),

    // Oja-specific
    defaultBudget: v.optional(v.number()),
    currency: v.string(),
    country: v.optional(v.string()),
    postcodePrefix: v.optional(v.string()),
    cuisinePreferences: v.optional(v.array(v.string())),
    dietaryRestrictions: v.optional(v.array(v.string())), // e.g. ["vegan", "gluten-free", "halal"]
    healthHistory: v.optional(v.array(v.object({
      listId: v.id("shoppingLists"),
      score: v.number(),
      analyzedAt: v.number()
    }))),

    // Store preferences
    storePreferences: v.optional(v.object({
      favorites: v.array(v.string()),      // ["tesco", "aldi", "lidl"]
      defaultStore: v.optional(v.string()), // "tesco"
    })),

    // Settings
    preferences: v.optional(
      v.object({
        notifications: v.boolean(),
        haptics: v.boolean(),
        theme: v.string(),
        notificationSettings: v.optional(v.object({
          stockReminders: v.boolean(),
          nurtureMessages: v.boolean(),
          partnerUpdates: v.boolean(),
          quietHours: v.optional(v.object({
            enabled: v.boolean(),
            start: v.string(), // "22:00"
            end: v.string(),   // "08:00"
          }))
        }))
      })
    ),

    // AI feature settings
    aiSettings: v.optional(
      v.object({
        voiceEnabled: v.boolean(), // User can disable voice assistant
        usageAlerts: v.boolean(), // Notify at 50%, 80%, 100%
      })
    ),

    // Push notifications
    expoPushToken: v.optional(v.string()), // Expo push token for notifications

    // Name tracking
    nameManuallySet: v.optional(v.boolean()), // True when user explicitly entered their name

    // Onboarding
    onboardingComplete: v.boolean(),

    // Tutorial Settings
    showTutorialHints: v.optional(v.boolean()), // Default: true

    // Activity tracking (for nurture sequence)
    lastActiveAt: v.optional(v.number()), // Last activity timestamp
    sessionCount: v.optional(v.number()), // Number of app sessions
    lastSessionAt: v.optional(v.number()), // Start of last session (for "welcome back")

    // Admin
    isAdmin: v.optional(v.boolean()),
    adminGrantedAt: v.optional(v.number()), // Timestamp when admin access was granted (for MFA grace period)
    suspended: v.optional(v.boolean()),
    mfaEnabled: v.optional(v.boolean()),
    allowedIps: v.optional(v.array(v.string())), // For IP Whitelisting (Phase 4.1)
    
    // Analytics (Phase 4.2)
    churnRiskScore: v.optional(v.number()), // 0-100 probability
    lastChurnRiskComputeAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_created", ["createdAt"])
    .index("by_last_active", ["lastActiveAt"])
    .index("by_is_admin", ["isAdmin"])
    .index("by_suspended", ["suspended"])
    .searchIndex("search_name", { searchField: "name" })
    .searchIndex("search_email", { searchField: "email" }),

  // Pantry items (stock tracker)
  pantryItems: defineTable({
    userId: v.id("users"),
    name: v.string(),
    category: v.string(),

    // Icon (MaterialCommunityIcons name)
    icon: v.optional(v.string()),

    // Stock levels
    stockLevel: v.union(
      v.literal("stocked"),
      v.literal("low"),
      v.literal("out"),
      // TEMP: old values kept for migration — remove after running migrateStockLevels
      v.literal("good"),
      v.literal("half")
    ),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),

    // Price tracking
    lastPrice: v.optional(v.number()),
    priceSource: v.optional(v.string()), // "ai_estimate" | "receipt" | "user"
    lastStoreName: v.optional(v.string()), // Store name from last receipt price
    preferredVariant: v.optional(v.string()), // e.g. "Whole Milk 2 Pints"

    // Size context for non-variant items (hasVariants: false)
    defaultSize: v.optional(v.string()), // "250g", "400g tin", "per item"
    defaultUnit: v.optional(v.string()), // "g", "tin", "each"

    // Auto-add to list when out
    autoAddToList: v.boolean(),

    // Name provenance: "system" = auto-generated (AI, onboarding); "user" = manually edited; "scan" = replaced via product scan
    nameSource: v.optional(v.union(v.literal("system"), v.literal("user"), v.literal("scan"))),
    lastScannedAt: v.optional(v.number()), // timestamp of last product-scan replacement

    // Pantry lifecycle (tiered pantry with auto-archiving)
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))), // defaults to "active"
    pinned: v.optional(v.boolean()),            // user manually pinned → Essentials tier
    purchaseCount: v.optional(v.number()),      // rolling 90-day purchase count
    lastPurchasedAt: v.optional(v.number()),    // timestamp of last receipt match
    archivedAt: v.optional(v.number()),         // when auto/manually archived

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_category", ["userId", "category"])
    .index("by_user_stock", ["userId", "stockLevel"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status_stock", ["status", "stockLevel"])
    .index("by_created", ["createdAt"]),

  // Shopping lists
  shoppingLists: defineTable({
    userId: v.id("users"),
    name: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("archived"),
    ),

    // Budget
    budget: v.optional(v.number()),
    budgetLocked: v.optional(v.boolean()), // Deprecated — kept for existing data
    impulseFund: v.optional(v.number()), // Deprecated — kept for existing data

    // Store
    storeName: v.optional(v.string()),
    normalizedStoreId: v.optional(v.string()),  // Target store for this list (e.g., "tesco", "sainsburys")

    // Multi-store: chronological list of stores visited during a shopping trip
    storeSegments: v.optional(v.array(v.object({
      storeId: v.string(),
      storeName: v.string(),
      switchedAt: v.number(),
    }))),

    // Timestamps
    plannedDate: v.optional(v.number()),
    shoppingStartedAt: v.optional(v.number()),
    activeShopperId: v.optional(v.id("users")), // Who is currently shopping this list
    completedAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),

    // Post-trip summary
    receiptId: v.optional(v.id("receipts")),
    receiptIds: v.optional(v.array(v.id("receipts"))),
    actualTotal: v.optional(v.number()),
    pointsEarned: v.optional(v.number()),

    // Provenance: which receipt this list was created from (create-from-receipt flow)
    sourceReceiptId: v.optional(v.id("receipts")),

    // AI Health Analysis
    healthAnalysis: v.optional(v.object({
      score: v.number(), // 0-100
      summary: v.string(),
      strengths: v.array(v.string()),
      weaknesses: v.array(v.string()),
      swaps: v.array(v.object({
        originalName: v.string(),
        originalId: v.optional(v.id("listItems")),
        suggestedName: v.string(),
        suggestedCategory: v.optional(v.string()),
        suggestedSize: v.optional(v.string()),
        suggestedUnit: v.optional(v.string()),
        priceDelta: v.optional(v.number()), // Estimated price difference (e.g., +0.30 or -0.15)
        scoreImpact: v.optional(v.number()), // Estimated score increase
        reason: v.string()
      })),
      itemCountAtAnalysis: v.optional(v.number()), // Number of items when analyzed to detect staleness
      updatedAt: v.number()
    })),

    // Per-user sequential number (auto-assigned on creation)
    listNumber: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_updated", ["updatedAt"]),

  // Shopping list items
  listItems: defineTable({
    listId: v.id("shoppingLists"),
    userId: v.id("users"),
    pantryItemId: v.optional(v.id("pantryItems")),

    name: v.string(),
    category: v.optional(v.string()),
    quantity: v.number(),

    // Size/Unit from variant selection (Zero-Blank: AI fills if not provided)
    size: v.optional(v.string()),   // "2pt", "500ml", "250g"
    unit: v.optional(v.string()),   // "pint", "ml", "g"
    brand: v.optional(v.string()),  // "Heinz", "Tesco", "PG Tips" — for duplicate detection

    // Pricing
    estimatedPrice: v.optional(v.number()),
    actualPrice: v.optional(v.number()),

    // Priority
    priority: v.union(
      v.literal("must-have"),
      v.literal("should-have"),
      v.literal("nice-to-have")
    ),

    // Status
    isChecked: v.boolean(),
    checkedAt: v.optional(v.number()),
    checkedByUserId: v.optional(v.id("users")), // Who checked this item off

    // Auto-added from pantry
    autoAdded: v.boolean(),

    // Mid-shop add tracking
    isImpulse: v.optional(v.boolean()), // Deprecated — kept for existing data
    addedMidShop: v.optional(v.boolean()), // Added during shopping
    addedFromReceipt: v.optional(v.boolean()), // Added from receipt reconciliation (unplanned)

    // Multi-store: which store the item was actually purchased at
    purchasedAtStoreId: v.optional(v.string()),
    purchasedAtStoreName: v.optional(v.string()),

    // Notes
    notes: v.optional(v.string()),

    // Track size/price source and overrides
    originalSize: v.optional(v.string()),       // Size before auto-match on store switch
    priceOverride: v.optional(v.boolean()),     // User manually edited price
    sizeOverride: v.optional(v.boolean()),      // User manually edited size
    priceSource: v.optional(v.union(
      v.literal("personal"),      // From user's own receipts
      v.literal("crowdsourced"),  // From other users' receipts
      v.literal("ai"),            // AI estimate
      v.literal("manual")         // User typed it
    )),
    priceConfidence: v.optional(v.number()),    // 0-1 confidence score

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_user", ["userId"])
    .index("by_list_checked", ["listId", "isChecked"])
    .index("by_list_priority", ["listId", "priority"]),
};
