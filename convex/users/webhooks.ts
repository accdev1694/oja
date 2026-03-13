import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";

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
