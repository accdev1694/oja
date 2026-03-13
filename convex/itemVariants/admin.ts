import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Admin mutation: Merge two variants into one.
 * All references to the 'from' variant will be updated to the 'to' variant.
 */
export const mergeVariants = mutation({
  args: {
    fromId: v.id("itemVariants"),
    toId: v.id("itemVariants"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user?.isAdmin) throw new Error("Unauthorized: Admin only");

    const fromVariant = await ctx.db.get(args.fromId);
    const toVariant = await ctx.db.get(args.toId);

    if (!fromVariant || !toVariant) throw new Error("Variant not found");

    // 1. Update any pantry items that point to the 'from' variant
    const pantryItems = await ctx.db
      .query("pantryItems")
      .filter((q) => q.eq(q.field("preferredVariant"), fromVariant.variantName))
      .collect();

    for (const item of pantryItems) {
      await ctx.db.patch(item._id, {
        preferredVariant: toVariant.variantName,
        updatedAt: Date.now(),
      });
    }

    // 2. Update currentPrices that point to the 'from' variant
    const prices = await ctx.db
      .query("currentPrices")
      .filter((q) => q.eq(q.field("variantName"), fromVariant.variantName))
      .collect();

    for (const price of prices) {
      await ctx.db.patch(price._id, {
        variantName: toVariant.variantName,
        size: toVariant.size,
        unit: toVariant.unit,
        updatedAt: Date.now(),
      });
    }

    // 3. Merge stats into the 'to' variant
    await ctx.db.patch(args.toId, {
      scanCount: (toVariant.scanCount ?? 0) + (fromVariant.scanCount ?? 0),
      userCount: (toVariant.userCount ?? 0) + (fromVariant.userCount ?? 0),
      lastSeenAt: Math.max(toVariant.lastSeenAt ?? 0, fromVariant.lastSeenAt ?? 0),
    });

    // 4. Delete the 'from' variant
    await ctx.db.delete(args.fromId);

    // 5. Log the action
    await ctx.db.insert("adminLogs", {
      adminUserId: user._id,
      action: "merge_variants",
      targetType: "itemVariants",
      targetId: args.toId,
      details: `Merged variant ${fromVariant.variantName} into ${toVariant.variantName}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
