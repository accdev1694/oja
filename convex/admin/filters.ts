import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { 
  requirePermission, 
  requirePermissionQuery 
} from "./helpers";

export const getSavedFilters = query({
  args: { tab: v.string() },
  handler: async (ctx, args) => {
    const admin = await requirePermissionQuery(ctx, "view_analytics");
    return await ctx.db
      .query("savedFilters")
      .withIndex("by_admin_tab", (q) => q.eq("adminUserId", admin._id).eq("tab", args.tab))
      .collect();
  },
});

export const saveFilter = mutation({
  args: { name: v.string(), tab: v.string(), filterData: v.any() },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "view_analytics");
    
    const id = await ctx.db.insert("savedFilters", {
      adminUserId: admin._id,
      name: args.name,
      tab: args.tab,
      filterData: args.filterData,
      createdAt: Date.now(),
    });

    return id;
  },
});

export const deleteSavedFilter = mutation({
  args: { id: v.id("savedFilters") },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "view_analytics");
    const filter = await ctx.db.get(args.id);
    
    if (!filter || filter.adminUserId !== admin._id) {
      throw new Error("Filter not found or unauthorized");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
