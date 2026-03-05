import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Internal query: Get all users with push tokens for stock reminders
 */
export const getUsersForReminders = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all users who have a push token and have completed onboarding
    return await ctx.db
      .query("users")
      .filter((q) => 
        q.and(
          q.neq(q.field("expoPushToken"), undefined),
          q.eq(q.field("onboardingComplete"), true)
        )
      )
      .collect();
  },
});

/**
 * Internal mutation: Send stock update reminders to all eligible users
 * Called by cron jobs on Wednesdays and Fridays at 6pm
 */
export const sendStockUpdateReminders = internalMutation({
  args: {
    day: v.union(v.literal("wednesday"), v.literal("friday")),
  },
  handler: async (ctx, args) => {
    const users = await ctx.runQuery(internal.pantryReminders.getUsersForReminders);
    
    const messages = {
      wednesday: {
        title: "Pantry check? 🧐",
        body: "Mid-week check! Tap to update what's running low before the weekend rush.",
      },
      friday: {
        title: "Saturday shop tomorrow! 🛒",
        body: "Time for a quick stock check. Make sure your list is ready for tomorrow's trip.",
      },
    };

    const { title, body } = messages[args.day];
    let sentCount = 0;

    for (const user of users) {
      // 1. Create in-app notification
      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "nurture",
        title,
        body,
        data: { screen: "index" }, // Links to pantry tab
        read: false,
        createdAt: Date.now(),
      });

      // 2. Schedule push notification
      await ctx.scheduler.runAfter(0, internal.notifications.sendPush, {
        userId: user._id,
        title,
        body,
        data: { type: "pantry_reminder", screen: "index" },
      });

      sentCount++;
    }

    console.log(`[PantryReminders] Sent ${args.day} reminders to ${sentCount} users`);
    return { sent: sentCount };
  },
});
