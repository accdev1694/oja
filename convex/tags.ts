import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

/**
 * Add a tag to a user (admin-only)
 */
export const addUserTag = mutation({
  args: { userId: v.id("users"), tag: v.string() },
  handler: async (ctx, args) => {
    // P1 Fix: Use standardized admin check
    // We can't import requirePermission because of circular dependencies 
    // if admin.ts also imports tags.ts. Let's check admin.ts imports.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
      
    if (!admin || !admin.isAdmin) throw new Error("Unauthorized");
    
    // 2. Check if tag already exists for this user
    const existing = await ctx.db
      .query("userTags")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("tag"), args.tag))
      .first();
      
    if (existing) return { alreadyExists: true };
    
    // 3. Insert tag
    await ctx.db.insert("userTags", {
      userId: args.userId,
      tag: args.tag,
      createdBy: admin._id,
      createdAt: Date.now(),
    });
    
    // 4. Log in audit logs
    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "add_user_tag",
      targetType: "user",
      targetId: args.userId,
      details: `Added tag "${args.tag}" to user ${args.userId}`,
      createdAt: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Remove a tag from a user (admin-only)
 */
export const removeUserTag = mutation({
  args: { userId: v.id("users"), tag: v.string() },
  handler: async (ctx, args) => {
    // P1 Fix: Use standardized admin check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
      
    if (!admin || !admin.isAdmin) throw new Error("Unauthorized");
    
    // 2. Find and delete tag
    const tag = await ctx.db
      .query("userTags")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("tag"), args.tag))
      .first();
      
    if (tag) {
      await ctx.db.delete(tag._id);
      
      // P1 Fix: Add missing audit log
      await ctx.db.insert("adminLogs", {
        adminUserId: admin._id,
        action: "remove_user_tag",
        targetType: "user",
        targetId: args.userId,
        details: `Removed tag "${args.tag}" from user ${args.userId}`,
        createdAt: Date.now(),
      });
    }
    
    return { success: true };
  },
});

/**
 * Get all tags for a user
 */
export const getUserTags = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("userTags")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
      
    return tags.map((t) => t.tag);
  },
});

/**
 * Search users by tag
 */
export const getUsersByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, args) => {
    const taggedUsers = await ctx.db
      .query("userTags")
      .withIndex("by_tag", (q) => q.eq("tag", args.tag))
      .collect();
      
    return Promise.all(
      taggedUsers.map(async (t) => {
        const u = await ctx.db.get(t.userId);
        return {
          _id: t.userId,
          name: u?.name || "Unknown",
          email: u?.email || "",
        };
      })
    );
  },
});
