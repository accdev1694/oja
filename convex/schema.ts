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

    // Settings
    preferences: v.optional(
      v.object({
        notifications: v.boolean(),
        haptics: v.boolean(),
        theme: v.string(),
      })
    ),

    // Onboarding
    onboardingComplete: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

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
      v.literal("good"),
      v.literal("low"),
      v.literal("out")
    ),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),

    // Price tracking
    lastPrice: v.optional(v.number()),

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
    budgetLocked: v.boolean(),
    impulseFund: v.optional(v.number()),

    // Store
    storeName: v.optional(v.string()),

    // Timestamps
    plannedDate: v.optional(v.number()),
    shoppingStartedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

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
    unit: v.optional(v.string()),

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
    isImpulse: v.optional(v.boolean()), // Added from impulse fund
    addedMidShop: v.optional(v.boolean()), // Added during shopping

    // Notes
    notes: v.optional(v.string()),

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

    purchaseDate: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "purchaseDate"])
    .index("by_list", ["listId"]),

  // Price history tracking
  priceHistory: defineTable({
    userId: v.id("users"),
    receiptId: v.id("receipts"),

    // Item info
    itemName: v.string(),
    normalizedName: v.string(), // Lowercase for fuzzy matching

    // Price info
    price: v.number(),
    quantity: v.number(),
    unitPrice: v.number(),

    // Store info
    storeName: v.string(),
    storeAddress: v.optional(v.string()),

    // Purchase date
    purchaseDate: v.number(),

    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_item", ["userId", "normalizedName"])
    .index("by_user_item_date", ["userId", "normalizedName", "purchaseDate"])
    .index("by_receipt", ["receiptId"]),
});
