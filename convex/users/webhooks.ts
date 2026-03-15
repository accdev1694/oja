import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";

/** Minimal shape of Clerk webhook user data. */
interface ClerkUserData {
  id: string;
  first_name?: string;
  last_name?: string;
  email_addresses?: Array<{ email_address: string }>;
}

/**
 * Clerk Webhook Handler
 * Processes user.deleted and user.updated events from Clerk.
 */
export const handleClerkWebhook = action({
  args: {
    type: v.string(),
    data: v.string(),
  },
  handler: async (ctx, args) => {
    const { type } = args;
    const data = JSON.parse(args.data) as ClerkUserData;

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
      const clerkName = `${data.first_name || ""} ${data.last_name || ""}`.trim();
      const user = await ctx.runQuery(api.users.getByClerkId, { clerkId });
      if (user) {
        // Only overwrite name if the user hasn't manually set one in-app
        const nameToUse = user.nameManuallySet
          ? user.name
          : (clerkName || user.name || "");
        await ctx.runMutation(internal.users.updateUserInfo, {
          userId: user._id,
          email: email || user.email || "",
          name: nameToUse,
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
