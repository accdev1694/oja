import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/**
 * Generate a temporary impersonation token for an admin
 */
export const generateImpersonationToken = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const tokenValue = crypto.randomUUID();
    const expiresAt = Date.now() + 60 * 60 * 1000;

    await ctx.db.insert("impersonationTokens", {
      userId: args.userId,
      tokenValue,
      createdBy: admin._id,
      expiresAt,
      createdAt: Date.now(),
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "generate_impersonation_token",
      targetType: "user",
      targetId: args.userId,
      details: `Generated impersonation token for user ${args.userId}`,
      createdAt: Date.now(),
    });

    return { tokenValue, expiresAt };
  },
});

/**
 * Validate an impersonation token — requires admin auth
 */
export const validateImpersonationToken = query({
  args: { tokenValue: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const token = await ctx.db
      .query("impersonationTokens")
      .withIndex("by_token", (q) => q.eq("tokenValue", args.tokenValue))
      .unique();

    if (!token) return { valid: false };
    if (token.expiresAt < Date.now()) return { valid: false, expired: true };

    const user = await ctx.db.get(token.userId);
    if (!user) return { valid: false };

    return {
      valid: true,
      userId: token.userId,
      userName: user.name,
      userClerkId: user.clerkId,
    };
  },
});

/**
 * Marks an impersonation token as used and activates the session — requires admin auth
 */
export const startImpersonation = mutation({
  args: { tokenValue: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const token = await ctx.db
      .query("impersonationTokens")
      .withIndex("by_token", (q) => q.eq("tokenValue", args.tokenValue))
      .unique();

    if (!token) throw new Error("Invalid token");
    if (token.expiresAt < Date.now()) throw new Error("Token expired");
    if (token.usedAt) throw new Error("Token already used");

    await ctx.db.patch(token._id, { usedAt: Date.now() });

    const user = await ctx.db.get(token.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "start_impersonation",
      targetType: "user",
      targetId: token.userId,
      details: `Started impersonation of user ${token.userId}`,
      createdAt: Date.now(),
    });

    return {
      success: true,
      userId: token.userId,
      clerkId: user.clerkId,
    };
  },
});
