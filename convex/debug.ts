
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const findDuplicates = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const emailMap = new Map<string, any[]>();
    
    for (const user of allUsers) {
      if (user.email) {
        const existing = emailMap.get(user.email) || [];
        existing.push({
          id: user._id,
          clerkId: user.clerkId,
          name: user.name,
          createdAt: new Date(user.createdAt).toISOString(),
        });
        emailMap.set(user.email, existing);
      }
    }
    
    const duplicates = [];
    for (const [email, users] of emailMap.entries()) {
      if (users.length > 1) {
        duplicates.push({ email, users });
      }
    }
    
    return duplicates;
  },
});

export const mergeDuplicateUsers = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // 1. Find all users with this email
    const users = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    if (users.length <= 1) return { message: "No duplicates found for this email" };

    // 2. Determine master user (oldest one)
    const sortedUsers = [...users].sort((a, b) => a.createdAt - b.createdAt);
    const master = sortedUsers[0];
    const duplicates = sortedUsers.slice(1);

    const stats: any = {
      masterId: master._id,
      duplicatesRemoved: duplicates.length,
    };

    const tablesToReassign = [
      { table: "pantryItems", index: "by_user" },
      { table: "shoppingLists", index: "by_user" },
      { table: "listItems", index: "by_user" },
      { table: "receipts", index: "by_user" },
      { table: "priceHistory", index: "by_user" },
      { table: "achievements", index: "by_user" },
      { table: "streaks", index: "by_user" },
      { table: "notifications", index: "by_user" },
      { table: "subscriptions", index: "by_user" },
      { table: "loyaltyPoints", index: "by_user" },
      { table: "scanCredits", index: "by_user" },
      { table: "pointTransactions", index: "by_user" },
      { table: "scanCreditTransactions", index: "by_user" },
      { table: "activityEvents", index: "by_user_timestamp" },
      { table: "supportTickets", index: "by_user" },
      { table: "userRoles", index: "by_user" },
      { table: "userTags", index: "by_user" },
      { table: "listPartners", index: "by_user" },
      { table: "itemComments", index: "by_user" },
      { table: "listMessages", index: "by_user" },
      { table: "aiUsage", index: "by_user" },
      { table: "experimentAssignments", index: "by_user" },
      { table: "experimentEvents", index: "by_experiment" }, // This one is tricky, needs manual filter
      { table: "nurtureMessages", index: "by_user" },
      { table: "tipsDismissed", index: "by_user" },
    ];

    for (const duplicate of duplicates) {
      for (const { table, index } of tablesToReassign) {
        if (table === "experimentEvents") continue; // Skip for now

        // Reassign by specific index
        const docs = await ctx.db
          .query(table as any)
          .withIndex(index as any, (q: any) => q.eq("userId", duplicate._id))
          .collect();
        
        for (const doc of docs) {
          await ctx.db.patch(doc._id, { userId: master._id } as any);
          stats[`${table}Moved`] = (stats[`${table}Moved`] || 0) + 1;
        }
      }

      // Handle inviteCodes (createdBy)
      const invites = await ctx.db.query("inviteCodes").collect();
      for (const invite of invites) {
        if (invite.createdBy === duplicate._id) {
          await ctx.db.patch(invite._id, { createdBy: master._id });
          stats.invitesMoved = (stats.invitesMoved || 0) + 1;
        }
      }

      // Delete the duplicate user
      await ctx.db.delete(duplicate._id);
    }

    // Final merge of profile data if master is missing something
    const latestDuplicate = duplicates[duplicates.length - 1];
    await ctx.db.patch(master._id, {
      avatarUrl: master.avatarUrl || latestDuplicate.avatarUrl,
      country: master.country || latestDuplicate.country,
      cuisinePreferences: master.cuisinePreferences || latestDuplicate.cuisinePreferences,
      onboardingComplete: master.onboardingComplete || latestDuplicate.onboardingComplete,
      updatedAt: Date.now(),
    });

    return stats;
  },
});
