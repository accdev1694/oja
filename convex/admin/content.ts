import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { 
  requirePermission, 
  requirePermissionQuery 
} from "./helpers";

export const getFeatureFlags = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "manage_flags");
    return await ctx.db.query("featureFlags").collect();
  },
});

export const toggleFeatureFlag = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_flags");
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (!flag) throw new Error("Flag not found");

    const newValue = !flag.value;
    await ctx.db.patch(flag._id, {
      value: newValue,
      updatedBy: admin._id,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "toggle_feature_flag",
      targetType: "feature_flag",
      targetId: args.key,
      details: `Set ${args.key} to ${newValue}`,
      createdAt: Date.now(),
    });

    return { success: true, value: newValue };
  },
});

export const getAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "manage_announcements");
    return await ctx.db.query("announcements").order("desc").collect();
  },
});

export const createAnnouncement = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    type: v.union(v.literal("info"), v.literal("warning"), v.literal("promo")),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_announcements");
    const now = Date.now();

    const id = await ctx.db.insert("announcements", {
      title: args.title,
      body: args.body,
      type: args.type,
      active: true,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      createdBy: admin._id,
      createdAt: now,
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "create_announcement",
      targetType: "announcement",
      targetId: id,
      details: `Created announcement: ${args.title}`,
      createdAt: now,
    });

    return id;
  },
});

export const updateAnnouncement = mutation({
  args: {
    id: v.id("announcements"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_announcements");
    
    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.body !== undefined) updates.body = args.body;
    if (args.active !== undefined) updates.active = args.active;

    await ctx.db.patch(args.id, updates);

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "update_announcement",
      targetType: "announcement",
      targetId: args.id,
      details: "Updated announcement fields",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const toggleAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_announcements");
    const announcement = await ctx.db.get(args.id);
    if (!announcement) throw new Error("Announcement not found");

    const newValue = !announcement.active;
    await ctx.db.patch(args.id, { active: newValue });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "toggle_announcement",
      targetType: "announcement",
      targetId: args.id,
      details: `Set announcement active to ${newValue}`,
      createdAt: Date.now(),
    });

    return { success: true, active: newValue };
  },
});

export const getPricingConfig = query({
  args: {},
  handler: async (ctx) => {
    await requirePermissionQuery(ctx, "manage_pricing");
    return await ctx.db.query("pricingConfig").collect();
  },
});

export const updatePricing = mutation({
  args: {
    id: v.id("pricingConfig"),
    priceAmount: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "manage_pricing");
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Pricing config not found");

    await ctx.db.patch(args.id, {
      priceAmount: args.priceAmount,
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("adminLogs", {
      adminUserId: admin._id,
      action: "update_pricing",
      targetType: "pricing",
      targetId: args.id,
      details: `Updated ${existing.planId} price to ${args.priceAmount}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
