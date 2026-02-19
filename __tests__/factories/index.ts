/**
 * Test Data Factories - generates realistic test data for all entity types
 */

let idCounter = 0;
function mockId(table: string): string {
  return `${table}_${++idCounter}` as any;
}

export function resetIdCounter() {
  idCounter = 0;
}

// ============================================================================
// USER FACTORY
// ============================================================================
export function createUser(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("users"),
    clerkId: `clerk_${Math.random().toString(36).slice(2, 10)}`,
    name: "Test User",
    email: "test@example.com",
    avatarUrl: "https://example.com/avatar.png",
    isAdmin: false,
    isSuspended: false,
    onboardingComplete: true,
    defaultBudget: 50,
    currency: "GBP",
    householdSize: 2,
    dietaryPreferences: [],
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// SHOPPING LIST FACTORY
// ============================================================================
export function createShoppingList(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("shoppingLists"),
    userId: mockId("users"),
    name: "Weekly Shop",
    budget: 50,
    status: "active" as const,
    storeName: "Tesco",
    itemCount: 0,
    checkedCount: 0,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// LIST ITEM FACTORY
// ============================================================================
export function createListItem(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("listItems"),
    listId: mockId("shoppingLists"),
    userId: mockId("users"),
    name: "Milk",
    quantity: 1,
    unit: "pcs",
    estimatedPrice: 1.5,
    actualPrice: undefined,
    isChecked: false,
    priority: "medium" as const,
    category: "Dairy",
    createdAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// RECEIPT FACTORY
// ============================================================================
export function createReceipt(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("receipts"),
    userId: mockId("users"),
    storeName: "Tesco",
    total: 42.5,
    date: "2026-01-30",
    items: [
      { name: "Milk", quantity: 1, unitPrice: 1.5, totalPrice: 1.5, category: "Dairy" },
      { name: "Bread", quantity: 2, unitPrice: 1.2, totalPrice: 2.4, category: "Bakery" },
    ],
    isFlagged: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// PARTNER FACTORY
// ============================================================================
export function createPartner(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("listPartners"),
    listId: mockId("shoppingLists"),
    userId: mockId("users"),
    role: "member" as const,
    status: "accepted" as const,
    joinedAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// INVITE CODE FACTORY
// ============================================================================
export function createInviteCode(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("inviteCodes"),
    listId: mockId("shoppingLists"),
    createdBy: mockId("users"),
    code: "ABC123",
    role: "member" as const,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    usedBy: undefined,
    usedAt: undefined,
    ...overrides,
  };
}

// ============================================================================
// SUBSCRIPTION FACTORY
// ============================================================================
export function createSubscription(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("subscriptions"),
    userId: mockId("users"),
    plan: "premium_monthly" as const,
    status: "active" as const,
    stripeCustomerId: "cus_test123",
    stripeSubscriptionId: "sub_test123",
    currentPeriodStart: Date.now(),
    currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// LOYALTY POINTS FACTORY
// ============================================================================
export function createLoyaltyPoints(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("loyaltyPoints"),
    userId: mockId("users"),
    points: 150,
    tier: "bronze" as const,
    lifetimePoints: 150,
    ...overrides,
  };
}

// ============================================================================
// POINT TRANSACTION FACTORY
// ============================================================================
export function createPointTransaction(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("pointTransactions"),
    userId: mockId("users"),
    type: "earned" as const,
    amount: 10,
    reason: "Receipt scan",
    createdAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// NOTIFICATION FACTORY
// ============================================================================
export function createNotification(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("notifications"),
    userId: mockId("users"),
    type: "partner_joined" as const,
    title: "New Partner",
    body: "A user joined your list",
    isRead: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// ACHIEVEMENT FACTORY
// ============================================================================
export function createAchievement(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("achievements"),
    userId: mockId("users"),
    type: "first_list",
    name: "First Steps",
    description: "Created your first shopping list",
    unlockedAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// STREAK FACTORY
// ============================================================================
export function createStreak(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("streaks"),
    userId: mockId("users"),
    type: "shopping" as const,
    currentCount: 5,
    longestCount: 10,
    lastDate: "2026-01-30",
    ...overrides,
  };
}

// ============================================================================
// CHALLENGE FACTORY
// ============================================================================
export function createChallenge(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("challenges"),
    userId: mockId("users"),
    title: "Budget Boss",
    description: "Complete 3 trips under budget this week",
    type: "budget_boss",
    target: 3,
    progress: 1,
    rewardPoints: 50,
    isCompleted: false,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// ADMIN LOG FACTORY
// ============================================================================
export function createAdminLog(overrides: Record<string, any> = {}) {
  return {
    _id: mockId("adminLogs"),
    adminId: mockId("users"),
    action: "toggle_admin",
    targetUserId: mockId("users"),
    details: "Granted admin access",
    createdAt: Date.now(),
    ...overrides,
  };
}
