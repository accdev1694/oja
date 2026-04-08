import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireUser } from "./helpers";

export const setPreferredVariant = mutation({
  args: {
    itemName: v.string(),
    preferredVariant: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const normalizedName = args.itemName.toLowerCase().trim();
    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const match = items.find(
      (item) => item.name.toLowerCase().trim() === normalizedName
    );

    if (!match) throw new Error("Pantry item not found");

    await ctx.db.patch(match._id, {
      preferredVariant: args.preferredVariant,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
