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

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_created", ["createdAt"]),

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

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_category", ["userId", "category"])
    .index("by_user_stock", ["userId", "stockLevel"]),

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

    // Timestamps
    plannedDate: v.optional(v.number()),
    shoppingStartedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    pausedAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),

    // Post-trip summary
    receiptId: v.optional(v.id("receipts")),
    actualTotal: v.optional(v.number()),
    pointsEarned: v.optional(v.number()),

    // List-level approval (Epic 4 - Partner Mode)
    approvalStatus: v.optional(v.union(
      v.literal("draft"),
      v.literal("pending_approval"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("changes_requested")
    )),
    approvalRequestedAt: v.optional(v.number()),
    approvalRequestedBy: v.optional(v.id("users")),
    approvalRespondedAt: v.optional(v.number()),
    approvalRespondedBy: v.optional(v.id("users")),
    approvalNote: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

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

    // Auto-added from pantry
    autoAdded: v.boolean(),

    // Mid-shop add tracking
    isImpulse: v.optional(v.boolean()), // Deprecated — kept for existing data
    addedMidShop: v.optional(v.boolean()), // Added during shopping

    // Approval workflow (Epic 4 - Partner Mode)
    approvalStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    )),
    approvalNote: v.optional(v.string()),

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
      })
    ),

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

    purchaseDate: v.number(),
    createdAt: v.number(),

    // Duplicate detection fingerprint: storeName|total|purchaseDate
    fingerprint: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "purchaseDate"])
    .index("by_list", ["listId"])
    .index("by_user_fingerprint", ["userId", "fingerprint"]),

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
    .index("by_store", ["storeName"]),

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
    .index("by_receipt", ["receiptId"]),

  // Item variants (size-aware pricing)
  itemVariants: defineTable({
    baseItem: v.string(),            // "milk" (normalized)
    variantName: v.string(),         // "Whole Milk 2 Pints"
    size: v.string(),                // "2 pints"
    unit: v.string(),                // "pint"
    category: v.string(),            // "Dairy"
    source: v.string(),              // "ai_seeded" | "receipt_discovered"
    commonality: v.optional(v.number()), // How often this variant appears in receipts (0-1)
    estimatedPrice: v.optional(v.number()), // AI-generated price for this variant
  })
    .index("by_base_item", ["baseItem"]),

  // === Epic 4: Partner Mode & Collaboration ===

  // List partners (shared list membership)
  listPartners: defineTable({
    listId: v.id("shoppingLists"),
    userId: v.id("users"),
    role: v.union(v.literal("viewer"), v.literal("editor"), v.literal("approver")),
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
    role: v.union(v.literal("viewer"), v.literal("editor"), v.literal("approver")),
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
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

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
    .index("by_action", ["action"]),

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
});
