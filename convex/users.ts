import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { trackFunnelEvent, trackActivity } from "./lib/analytics";
import { requireAdmin, requireCurrentUser } from "./lib/auth";

/**
 * Record a health analysis score for historical tracking
 */
export const recordHealthAnalysis = internalMutation({
  args: {
    userId: v.id("users"),
    listId: v.id("shoppingLists"),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const healthHistory = user.healthHistory || [];
    // Keep only last 50 entries to prevent document bloat
    const updatedHistory = [
      ...healthHistory,
      { listId: args.listId, score: args.score, analyzedAt: Date.now() }
    ].slice(-50);

    await ctx.db.patch(args.userId, {
      healthHistory: updatedHistory,
      updatedAt: Date.now(),
    });

    // Check for "Health Champion" achievement: 3 lists scored 80+ in the last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentHighScores = updatedHistory.filter(h => h.score >= 80 && h.analyzedAt > thirtyDaysAgo);
    
    if (recentHighScores.length >= 3) {
      // Check if already has it
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", q => q.eq("userId", args.userId).eq("type", "health_champion"))
        .first();
      
      if (!existing) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          type: "health_champion",
          title: "🏆 Health Champion",
          description: "Scored 80+ on 3 different lists this month!",
          icon: "medal",
          unlockedAt: Date.now(),
        });
        
        // Also notify user
        await ctx.db.insert("notifications", {
          userId: args.userId,
          type: "achievement",
          title: "New Achievement Unlocked!",
          body: "You've earned the Health Champion medal! 🏆",
          read: false,
          createdAt: Date.now(),
        });
      }
    }
  },
});

/**
 * Sync MFA status from the frontend (security requirement)
 */
export const syncMfaStatus = mutation({
  args: { mfaEnabled: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      mfaEnabled: args.mfaEnabled,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get the current user from the database
 * Creates a new user if one doesn't exist for this Clerk ID
 */
export const getOrCreate = mutation({
  args: { mfaEnabled: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // 1. Check if user already exists by exact Clerk ID
    let existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // 2. If not found by Clerk ID, check by email (to prevent duplicates for same person)
    if (!existingUser && identity.email) {
      existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email))
        .unique();
      
      // If found by email, migrate/link this new Clerk ID to the existing record
      if (existingUser) {
        console.log(`[Users] Migrating user ${existingUser._id} to new Clerk ID: ${identity.subject}`);
        await ctx.db.patch(existingUser._id, {
          clerkId: identity.subject,
          updatedAt: Date.now(),
        });
      }
    }

    if (existingUser) {
      // Track login activity
      await trackActivity(ctx, existingUser._id, "login");
      
      // Update MFA status if provided
      if (args.mfaEnabled !== undefined && existingUser.mfaEnabled !== args.mfaEnabled) {
        await ctx.db.patch(existingUser._id, {
          mfaEnabled: args.mfaEnabled,
          updatedAt: Date.now(),
        });
      }
      
      return existingUser;
    }

    // Create new user
    const now = Date.now();
    
    // Improved name extraction: Name -> Given Name -> Email Prefix -> "Shopper"
    const fallbackName = identity.email ? identity.email.split("@")[0] : "Shopper";
    const displayName = identity.name || identity.givenName || fallbackName;

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: displayName,
      email: identity.email,
      avatarUrl: identity.pictureUrl,
      currency: "GBP", // Default for UK
      onboardingComplete: false,
      mfaEnabled: args.mfaEnabled ?? false,
      createdAt: now,
      updatedAt: now,
    });

    // Track funnel event: signup
    await trackFunnelEvent(ctx, userId, "signup");
    
    // Track activity: signup
    await trackActivity(ctx, userId, "signup");

    return await ctx.db.get(userId);
  },
});

/**
 * Get current user (read-only, doesn't create)
 */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

/**
 * Get user by Clerk ID
 */
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

/**
 * Get user by internal ID
 */
export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Update user profile
 */
export const update = mutation({
  args: {
    name: v.optional(v.string()),
    defaultBudget: v.optional(v.number()),
    currency: v.optional(v.string()),
    showTutorialHints: v.optional(v.boolean()),
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
            start: v.string(),
            end: v.string(),
          }))
        }))
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.defaultBudget !== undefined) updates.defaultBudget = args.defaultBudget;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.showTutorialHints !== undefined) updates.showTutorialHints = args.showTutorialHints;
    if (args.preferences !== undefined) updates.preferences = args.preferences;

    await ctx.db.patch(user._id, updates);
    return await ctx.db.get(user._id);
  },
});

/**
 * Update specific notification settings without overwriting other preferences
 */
export const updateNotificationSettings = mutation({
  args: {
    notifications: v.optional(v.boolean()),
    stockReminders: v.optional(v.boolean()),
    nurtureMessages: v.optional(v.boolean()),
    partnerUpdates: v.optional(v.boolean()),
    quietHours: v.optional(v.object({
      enabled: v.boolean(),
      start: v.string(),
      end: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPrefs = user.preferences ?? {
      notifications: true,
      haptics: true,
      theme: "system",
    };

    const currentSettings = currentPrefs.notificationSettings ?? {
      stockReminders: true,
      nurtureMessages: true,
      partnerUpdates: true,
    };

    const newPrefs = {
      ...currentPrefs,
      notifications: args.notifications ?? currentPrefs.notifications,
      notificationSettings: {
        ...currentSettings,
        stockReminders: args.stockReminders ?? currentSettings.stockReminders,
        nurtureMessages: args.nurtureMessages ?? currentSettings.nurtureMessages,
        partnerUpdates: args.partnerUpdates ?? currentSettings.partnerUpdates,
        quietHours: args.quietHours ?? currentSettings.quietHours,
      },
    };

    await ctx.db.patch(user._id, {
      preferences: newPrefs,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Set onboarding data (name, country, cuisinePreferences)
 */
export const setOnboardingData = mutation({
  args: {
    name: v.string(),
    country: v.string(),
    cuisinePreferences: v.array(v.string()),
    dietaryRestrictions: v.optional(v.array(v.string())),
    defaultBudget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      name: args.name,
      country: args.country,
      cuisinePreferences: args.cuisinePreferences,
      dietaryRestrictions: args.dietaryRestrictions,
      defaultBudget: args.defaultBudget,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(user._id);
  },
});

/**
 * Mark onboarding as complete
 */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();
    await ctx.db.patch(user._id, {
      onboardingComplete: true,
      updatedAt: now,
    });

    // Track funnel event: onboarding_complete
    await trackFunnelEvent(ctx, user._id, "onboarding_complete");
    
    // Track activity
    await trackActivity(ctx, user._id, "onboarding_complete");

    // Auto-start 7-day premium trial for new users
    const existingSub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();

    if (!existingSub) {
      // Get dynamic pricing to find the default plan
      const defaultPlan = await ctx.db
        .query("pricingConfig")
        .withIndex("by_plan", (q) => q.eq("planId", "premium_monthly"))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      const trialEndsAt = now + 7 * 24 * 60 * 60 * 1000;
      await ctx.db.insert("subscriptions", {
        userId: user._id,
        plan: (defaultPlan?.planId as any) || "premium_monthly",
        status: "trial",
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        createdAt: now,
        updatedAt: now,
      });

      // Calculate trial days for dynamic message
      const trialDays = Math.ceil((trialEndsAt - now) / (24 * 60 * 60 * 1000));

      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "trial_started",
        title: "Welcome to Oja Premium!",
        body: `You have ${trialDays} days of full access to all features — explore everything!`,
        read: false,
        createdAt: now,
      });
    }

    return true;
  },
});

/**
 * DEVELOPMENT ONLY: Reset a specific user for re-onboarding
 * Deletes all user data (pantry, lists, receipts) and resets onboarding status
 */
export const resetUserByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Verify caller is an admin
    const caller = await requireAdmin(ctx);

    // Audit log
    await ctx.db.insert("adminLogs", {
      adminUserId: caller._id,
      action: "reset_user_data",
      targetType: "users",
      targetId: args.email,
      details: `Full data reset for user email: ${args.email}`,
      createdAt: Date.now(),
    });

    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    // Delete all pantry items for this user
    const pantryItems = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const item of pantryItems) {
      await ctx.db.delete(item._id);
    }

    // Delete all shopping lists for this user
    const shoppingLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Delete all list items for each list
    for (const list of shoppingLists) {
      const listItems = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q) => q.eq("listId", list._id))
        .collect();
      for (const item of listItems) {
        await ctx.db.delete(item._id);
      }
      await ctx.db.delete(list._id);
    }

    // Delete all receipts for this user
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const receipt of receipts) {
      await ctx.db.delete(receipt._id);
    }

    // Delete price history for this user
    const priceHistory = await ctx.db
      .query("priceHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const price of priceHistory) {
      await ctx.db.delete(price._id);
    }

    // Reset user onboarding status
    await ctx.db.patch(user._id, {
      onboardingComplete: false,
      cuisinePreferences: undefined,
      country: undefined,
      updatedAt: Date.now(),
    });

    return {
      email: args.email,
      deletedPantryItems: pantryItems.length,
      deletedShoppingLists: shoppingLists.length,
      deletedReceipts: receipts.length,
      deletedPriceHistory: priceHistory.length,
      message: "User reset for re-onboarding",
    };
  },
});

/**
 * Reset current user's data and re-trigger onboarding.
 * Keeps the user doc but wipes all associated data.
 */
export const resetMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);

    // Helper to delete all docs in a table by userId index
    const deleteByUser = async (table: string) => {
      const docs = await ctx.db
        .query(table as any)
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      return docs.length;
    };

    // Delete list items via their lists (by_list index, not by_user)
    const shoppingLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    let deletedListItems = 0;
    for (const list of shoppingLists) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q) => q.eq("listId", list._id))
        .collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      deletedListItems += items.length;
    }

    // Delete from all user-owned tables (must have by_user index on userId)
    const counts: Record<string, number> = {};
    const tables = [
      "pantryItems", "shoppingLists", "receipts", "priceHistory",
      "listPartners", "itemComments",
      "notifications", "achievements", "streaks", "weeklyChallenges",
      "nurtureMessages", "tipsDismissed", "supportTickets", "activityEvents"
    ];
    for (const table of tables) {
      counts[table] = await deleteByUser(table);
    }
    counts.listItems = deletedListItems;

    // Tables specifically EXCLUDED from reset to preserve Identity & Economy:
    // - "subscriptions" (Prevents trial abuse)
    // - "pointsBalance", "pointsTransactions" (Preserves earned rewards)
    // - "loyaltyPoints", "pointTransactions" (Legacy/Duplicate rewards tables)
    // - "scanCredits", "scanCreditTransactions" (Preserves scan progress)
    // - "referralCodes" (Preserves referral identity)
    // - "aiUsage" (Preserves usage limits)

    // inviteCodes uses createdBy, not userId
    const inviteCodes = await ctx.db.query("inviteCodes").collect();
    let deletedInvites = 0;
    for (const code of inviteCodes) {
      if (code.createdBy === user._id) {
        await ctx.db.delete(code._id);
        deletedInvites++;
      }
    }
    counts.inviteCodes = deletedInvites;

    // Reset user doc
    await ctx.db.patch(user._id, {
      onboardingComplete: false,
      cuisinePreferences: undefined,
      country: undefined,
      updatedAt: Date.now(),
    });

    return { message: "Account reset — you'll see onboarding next login", counts };
  },
});

/**
 * Permanently delete current user and ALL associated data.
 * After this, the Convex user doc is gone. Clerk account remains (handle separately).
 */
export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);

    // 1. Delete all receipt images from storage
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const receipt of receipts) {
      if (receipt.imageStorageId) {
        try {
          // Note: storage.delete is not available in mutation, usually handled by action or internal script
          // For now we rely on DB cleanup and storage orphaning (Convex handles some storage cleanup)
        } catch (e) {
          console.error(`Failed to delete storage for receipt ${receipt._id}:`, e);
        }
      }
    }

    // 2. Log the deletion before purging (for forensics)
    await trackActivity(ctx, user._id, "account_deleted", { 
      reason: "user_request",
      email: user.email 
    });

    // 3. Perform full data purge
    await ctx.runMutation(internal.users.internalDeleteUser, { userId: user._id });

    return { message: "Account permanently deleted" };
  },
});

/**
 * INTERNAL: Full data purge for a user.
 * Shared by user.deleted webhook and manual deleteMyAccount.
 */
export const internalDeleteUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    // Helper to delete all docs in a table by userId index
    const deleteByUser = async (table: any) => {
      const docs = await ctx.db
        .query(table)
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    };

    // 1. Delete list items via their lists
    const shoppingLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
    for (const list of shoppingLists) {
      const items = await ctx.db
        .query("listItems")
        .withIndex("by_list", (q: any) => q.eq("listId", list._id))
        .collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
    }

    const tables = [
      "pantryItems", "shoppingLists", "receipts", "priceHistory",
      "listPartners", "itemComments",
      "notifications", "achievements", "streaks", "weeklyChallenges",
      "subscriptions", "loyaltyPoints", "pointTransactions",
      "scanCredits", "scanCreditTransactions", "rateLimits"
    ];
    for (const table of tables) {
      await deleteByUser(table);
    }

    const inviteCodes = await ctx.db.query("inviteCodes").collect();
    for (const code of inviteCodes) {
      if (code.createdBy === user._id) {
        await ctx.db.delete(code._id);
      }
    }

    await ctx.db.delete(user._id);
  },
});

/**
 * Clerk Webhook Handler
 * Processes user.deleted and user.updated events from Clerk.
 */
export const handleClerkWebhook = action({
  args: {
    type: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const { type, data } = args;

    if (type === "user.deleted") {
      const clerkId = data.id;
      const user = await ctx.runQuery(api.users.getByClerkId, { clerkId });
      if (user) {
        await ctx.runMutation(internal.users.internalDeleteUser, { userId: user._id });
        console.log(`[Clerk Webhook] Deleted user ${clerkId} (${user.email})`);
      }
    } else if (type === "user.updated") {
      const clerkId = data.id;
      const email = data.email_addresses?.[0]?.email_address;
      const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
      const user = await ctx.runQuery(api.users.getByClerkId, { clerkId });
      if (user) {
        await ctx.runMutation(internal.users.updateUserInfo, {
          userId: user._id,
          email: email || user.email,
          name: name || user.name,
        });
      }
    }

    return { success: true };
  },
});

export const updateUserInfo = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      email: args.email,
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});
