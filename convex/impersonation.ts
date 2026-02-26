import { v } from "convex/values";
import { mutation, query, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Generate a temporary impersonation token for an admin
 */
export const generateImpersonationToken = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // 1. Require admin permission
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
      
    if (!admin || !admin.isAdmin) throw new Error("Unauthorized");
    
    // 2. Generate a random token
    const tokenValue = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
    
    // 3. Store the token with 1-hour expiry
    const expiresAt = Date.now() + 60 * 60 * 1000;
    
    await ctx.db.insert("impersonationTokens", {
      userId: args.userId,
      tokenValue,
      createdBy: admin._id,
      expiresAt,
      createdAt: Date.now(),
    });
    
    // 4. Log the impersonation event in audit logs
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
 * Validate an impersonation token
 */
export const validateImpersonationToken = query({
  args: { tokenValue: v.string() },
  handler: async (ctx, args) => {
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
      userClerkId: user.clerkId
    };
  },
});
