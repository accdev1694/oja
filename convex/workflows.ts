import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new automated workflow
 */
export const createWorkflow = mutation({
  args: {
    name: v.string(),
    trigger: v.string(),
    actions: v.array(v.object({
      type: v.string(),
      params: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
      
    if (!admin || !admin.isAdmin) throw new Error("Unauthorized");
    
    return await ctx.db.insert("automationWorkflows", {
      name: args.name,
      trigger: args.trigger,
      actions: args.actions,
      isEnabled: true,
      createdBy: admin._id,
      createdAt: Date.now(),
    });
  },
});

/**
 * Process all active workflows
 * Runs daily via cron
 */
export const processWorkflows = internalMutation({
  args: {},
  handler: async (ctx) => {
    const workflows = await ctx.db
      .query("automationWorkflows")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();
      
    let usersProcessed = 0;
    
    for (const wf of workflows) {
      // Find users matching trigger
      let users: any[] = [];
      const now = Date.now();
      
      if (wf.trigger === "user_inactive_30d") {
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        users = await ctx.db
          .query("users")
          .withIndex("by_last_active", (q) => q.lt("lastActiveAt", thirtyDaysAgo))
          .collect();
      } else if (wf.trigger === "trial_ending") {
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const trials = await ctx.db
          .query("subscriptions")
          .withIndex("by_status", (q: any) => q.eq("status", "trial"))
          .collect();
          
        for (const sub of trials) {
          if (sub.trialEndsAt && (sub.trialEndsAt - now) < threeDaysMs && (sub.trialEndsAt - now) > 0) {
            users.push({ _id: sub.userId });
          }
        }
      }
      
      // Execute actions for each user
      for (const user of users) {
        for (const action of wf.actions) {
          if (action.type === "send_push") {
            await ctx.db.insert("notifications", {
              userId: user._id,
              type: "workflow_alert",
              title: action.params?.title || "Update from Oja",
              body: action.params?.body || "Check out what's new in the app!",
              read: false,
              createdAt: now,
            });
          } else if (action.type === "apply_tag") {
            // Check if tag already exists
            const existing = await ctx.db
              .query("userTags")
              .withIndex("by_user", (q) => q.eq("userId", user._id))
              .filter((q) => q.eq(q.field("tag"), action.params?.tag))
              .first();
              
            if (!existing) {
              await ctx.db.insert("userTags", {
                userId: user._id,
                tag: action.params?.tag,
                createdAt: now,
              });
            }
          }
        }
        usersProcessed++;
      }
    }
    
    return { success: true, usersProcessed };
  },
});

/**
 * List all workflows
 */
export const listWorkflows = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("automationWorkflows").collect();
  },
});
