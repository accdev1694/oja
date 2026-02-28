import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
    cuisinePreferences: v.optional(v.array(v.string())),

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

    // Onboarding
    onboardingComplete: v.boolean(),

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
    .index("by_created", ["createdAt"]),

  // Shopping lists
  shoppingLists: defineTable({
    userId: v.id("users"),
    name: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("shopping"),
      v.literal("completed"),
      v.literal("archived")
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
    pausedAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),

    // Post-trip summary
    receiptId: v.optional(v.id("receipts")),
    receiptIds: v.optional(v.array(v.id("receipts"))),
    actualTotal: v.optional(v.number()),
    pointsEarned: v.optional(v.number()),

    // Provenance: which receipt this list was created from (create-from-receipt flow)
    sourceReceiptId: v.optional(v.id("receipts")),

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
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "purchaseDate"])
    .index("by_list", ["listId"])
    .index("by_user_fingerprint", ["userId", "fingerprint"])
    .index("by_processing_status", ["processingStatus"])
    .index("by_created", ["createdAt"])
    .index("by_store_status", ["storeName", "processingStatus"])
    .index("by_status_created", ["processingStatus", "createdAt"])
    .searchIndex("search_store", { searchField: "storeName" }),

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

    // Purchase date
    purchaseDate: v.number(),

    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_item", ["userId", "normalizedName"])
    .index("by_user_item_date", ["userId", "normalizedName", "purchaseDate"])
    .index("by_receipt", ["receiptId"])
    .index("by_store", ["storeName"]),

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

  // === Epic 4: Partner Mode & Collaboration ===

  // List partners (shared list membership) — single "member" role
  listPartners: defineTable({
    listId: v.id("shoppingLists"),
    userId: v.id("users"),
    role: v.literal("member"),
    invitedBy: v.id("users"),
    invitedAt: v.number(),
    acceptedAt: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
  })
    .index("by_list", ["listId"])
    .index("by_user", ["userId"])
    .index("by_list_user", ["listId", "userId"]),

  // Invite codes for sharing lists
  inviteCodes: defineTable({
    code: v.string(),
    listId: v.id("shoppingLists"),
    createdBy: v.id("users"),
    role: v.literal("member"),
    expiresAt: v.number(),
    usedBy: v.optional(v.id("users")),
    usedAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_list", ["listId"]),

  // List-level chat messages (Epic 4 - Partner Mode)
  listMessages: defineTable({
    listId: v.id("shoppingLists"),
    userId: v.id("users"),
    text: v.string(),
    isSystem: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_user", ["userId"]),

  // Comments on list items
  itemComments: defineTable({
    listItemId: v.id("listItems"),
    userId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_item", ["listItemId"])
    .index("by_user", ["userId"]),

  // User notifications
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

  // === Epic 6: Insights & Gamification ===

  // User achievements
  achievements: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    unlockedAt: v.number(),
    data: v.optional(v.any()),
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

  // === Epic 7: Subscriptions & Loyalty ===

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

  // Loyalty points balance
  loyaltyPoints: defineTable({
    userId: v.id("users"),
    points: v.number(),
    lifetimePoints: v.number(),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold"), v.literal("platinum")),
    lastEarnedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Loyalty point transactions
  pointTransactions: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    type: v.union(v.literal("earned"), v.literal("redeemed"), v.literal("expired")),
    source: v.string(),
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Scan credits (receipt scan discount toward subscription)
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

  // Individual scan credit events (audit trail)
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

  // === Epic 8: Admin ===

  // === AI Usage Tracking ===

  // Monthly AI usage per user (voice, estimates, etc.)
  aiUsage: defineTable({
    userId: v.id("users"),
    feature: v.string(), // "voice" | "price_estimate" | "list_suggestions"
    periodStart: v.number(), // Start of billing month
    periodEnd: v.number(), // End of billing month
    requestCount: v.number(),
    tokenCount: v.optional(v.number()), // Estimated tokens used
    limit: v.number(), // Monthly limit for this feature
    lastNotifiedAt: v.optional(v.number()), // Last usage notification sent
    lastNotifiedThreshold: v.optional(v.number()), // 50, 80, or 100
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_feature", ["userId", "feature"])
    .index("by_user_feature_period", ["userId", "feature", "periodEnd"]),

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
    .index("by_permission", ["permission"]),

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
    .index("by_status", ["status"]),

  adminRateLimits: defineTable({
    userId: v.id("users"),
    action: v.string(), // mutation name
    count: v.number(),
    windowStart: v.number(),
  }).index("by_user_action", ["userId", "action"]),

  // Precomputed platform metrics (Phase 1 Performance Optimization)
  // Updated daily by cron job to avoid full table scans in getAnalytics
  platformMetrics: defineTable({
    date: v.string(), // "2025-02-25" (ISO date for easy querying)

    // User metrics
    totalUsers: v.number(),
    newUsersToday: v.number(),
    newUsersThisWeek: v.number(),
    newUsersThisMonth: v.number(),
    activeUsersThisWeek: v.number(),

    // List metrics
    totalLists: v.number(),
    completedLists: v.number(),
    listsCreatedToday: v.number(),

    // Receipt metrics
    totalReceipts: v.number(),
    receiptsToday: v.number(),
    receiptsThisWeek: v.number(),
    receiptsThisMonth: v.number(),

    // GMV (Gross Merchandise Value)
    totalGMV: v.number(),
    gmvToday: v.number(),
    gmvThisWeek: v.number(),
    gmvThisMonth: v.number(),
    gmvThisYear: v.optional(v.number()), // Optional for backward compatibility with existing records

    computedAt: v.number(), // Timestamp when metrics were computed
  })
    .index("by_date", ["date"]),

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

  // ─── Nurture Sequence ────────────────────────────────────────────────────────
  // Tracks which nurture messages have been sent to each user

  nurtureMessages: defineTable({
    userId: v.id("users"),
    messageKey: v.string(), // e.g., "day_1_welcome", "day_2_first_list", "trial_ending_3d"
    sentAt: v.number(),
    channel: v.union(v.literal("push"), v.literal("in_app"), v.literal("both")),
  })
    .index("by_user", ["userId"])
    .index("by_user_message", ["userId", "messageKey"]),

  // ─── Contextual Tips ─────────────────────────────────────────────────────────
  // Tracks which tips have been dismissed by each user

  tipsDismissed: defineTable({
    userId: v.id("users"),
    tipKey: v.string(), // e.g., "swipe_to_change_stock", "tap_to_add_list", "voice_assistant"
    dismissedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_tip", ["userId", "tipKey"]),

  // ─── Phase 2: Analytics & Business Intelligence ────────────────────────────────

  // Cohort retention metrics - computed weekly
  cohortMetrics: defineTable({
    cohortMonth: v.string(), // "2025-01" format
    totalUsers: v.number(), // Users who signed up that month
    retentionDay7: v.number(), // % still active after 7 days
    retentionDay14: v.number(),
    retentionDay30: v.number(),
    retentionDay60: v.number(),
    retentionDay90: v.number(),
    computedAt: v.number(),
  })
    .index("by_cohort", ["cohortMonth"]),

  // Funnel events - track user journey milestones
  funnelEvents: defineTable({
    userId: v.id("users"),
    eventName: v.string(), // signup, onboarding_complete, first_list, first_receipt, first_scan, subscribed
    eventData: v.optional(v.any()), // Additional context
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventName"])
    .index("by_event_date", ["eventName", "createdAt"]),

  // Churn metrics - computed monthly
  churnMetrics: defineTable({
    month: v.string(), // "2025-02" format
    totalActiveStart: v.number(), // Active users at month start
    totalActiveEnd: v.number(), // Active users at month end
    churnedUsers: v.number(), // Users who became inactive
    churnRate: v.number(), // Percentage
    reactivatedUsers: v.number(), // Previously churned who came back
    atRiskCount: v.number(), // No activity 14-30 days
    computedAt: v.number(),
  })
    .index("by_month", ["month"]),

  // LTV metrics by cohort
  ltvMetrics: defineTable({
    cohortMonth: v.string(), // "2025-01" format
    avgLTV: v.number(), // Average lifetime value in £
    avgRevenuePerUser: v.number(), // ARPU
    totalRevenue: v.number(), // Sum of all revenue from cohort
    paidUsers: v.number(), // Users who ever paid
    conversionRate: v.number(), // % who converted to paid
    computedAt: v.number(),
  })
    .index("by_cohort", ["cohortMonth"]),

  // User segments - computed daily
  userSegments: defineTable({
    userId: v.id("users"),
    segment: v.string(), // power_user, at_risk, dormant, new_user, trial_ending, churned
    assignedAt: v.number(),
    expiresAt: v.optional(v.number()), // For time-limited segments like trial_ending
    metadata: v.optional(v.any()), // Additional segment data
  })
    .index("by_user", ["userId"])
    .index("by_segment", ["segment"])
    .index("by_user_segment", ["userId", "segment"]),

  // ─── Phase 3: Support & Operations ──────────────────────────────────────────

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

  // User tags for segmentation (Phase 3.3)
  userTags: defineTable({
    userId: v.id("users"),
    tag: v.string(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_tag", ["tag"]),

  // Activity events for timeline (Phase 3.4)
  activityEvents: defineTable({
    userId: v.id("users"),
    eventType: v.string(), // login, create_list, scan_receipt, subscribe, etc.
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_type", ["eventType"]),

  // ─── Phase 4: Advanced Features ──────────────────────────────────────────

  // 4.1 Real-Time Monitoring
  adminAlerts: defineTable({
    alertType: v.string(), // receipt_failure_spike, payment_failed, system_error, high_latency
    message: v.string(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
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
    .index("by_experiment", ["experimentId"]),

  // 4.3 Automated Workflows
  automationWorkflows: defineTable({
    name: v.string(),
    trigger: v.string(), // subscription_canceled, trial_ending, user_inactive_30d, payment_failed
    actions: v.array(v.object({
      type: v.string(), // send_email, send_push, suspend_user, apply_tag
      params: v.optional(v.any()),
    })),
    isEnabled: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_enabled", ["isEnabled"]),

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

  // 4.6 Advanced Search & Filtering (Phase 4.2)
  savedFilters: defineTable({
    adminUserId: v.id("users"),
    name: v.string(),
    tab: v.string(), // "users" | "receipts"
    filterData: v.any(), // JSON serialized filter state
    createdAt: v.number(),
  })
    .index("by_admin_tab", ["adminUserId", "tab"]),

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

  // 4.7 Scheduled Reports (Phase 4.4)
  scheduledReports: defineTable({
    type: v.union(v.literal("weekly_summary"), v.literal("monthly_financial")),
    recipientEmails: v.array(v.string()),
    lastRunAt: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("paused")),
    createdAt: v.number(),
  }),

  reportHistory: defineTable({
    reportId: v.id("scheduledReports"),
    data: v.any(), // Serialized metrics
    sentAt: v.number(),
    status: v.union(v.literal("success"), v.literal("failed")),
    error: v.optional(v.string()),
  }).index("by_report", ["reportId"]),
});
