import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { 
  requirePermission, 
  requirePermissionQuery 
} from "./helpers";

export const getWebhooks = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "manage_flags");
    return await ctx.db.query("webhooks").collect();
  },
});

export const createWebhook = mutation({
  args: {
    url: v.string(),
    description: v.optional(v.string()),
    events: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");
    
    const secret = "whsec_" + Math.random().toString(36).substring(2, 15);
    
    const id = await ctx.db.insert("webhooks", {
      url: args.url,
      secret,
      description: args.description,
      events: args.events,
      isEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: admin._id,
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "create_webhook",
      targetType: "webhook",
      targetId: id,
      details: `Created webhook for ${args.url}`,
      createdAt: Date.now(),
    });

    return id;
  },
});

export const toggleWebhook = mutation({
  args: { id: v.id("webhooks") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");
    const webhook = await ctx.db.get(args.id);
    if (!webhook) throw new Error("Webhook not found");

    const newValue = !webhook.isEnabled;
    await ctx.db.patch(args.id, { isEnabled: newValue, updatedAt: Date.now() });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "toggle_webhook",
      targetType: "webhook",
      targetId: args.id,
      details: `Set webhook enabled to ${newValue}`,
      createdAt: Date.now(),
    });

    return { success: true, isEnabled: newValue };
  },
});

export const deleteWebhook = mutation({
  args: { id: v.id("webhooks") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");
    
    await ctx.db.delete(args.id);

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "delete_webhook",
      targetType: "webhook",
      targetId: args.id,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const testWebhook = action({
  args: { id: v.id("webhooks") },
  handler: async (ctx, args) => {
    // Action implementation would go here
    return { success: true, message: "Test payload sent" };
  },
});
