import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { 
  requireAdmin, 
} from "./helpers";

export const getDashboardPreferences = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    
    const prefs = await ctx.db
      .query("adminDashboardPreferences")
      .withIndex("by_user", (q) => q.eq("userId", admin._id))
      .unique();

    if (!prefs) {
      return {
        overviewWidgets: [
          { id: "health", visible: true, order: 0 },
          { id: "analytics", visible: true, order: 1 },
          { id: "revenue", visible: true, order: 2 },
          { id: "audit_logs", visible: true, order: 3 },
        ],
      };
    }

    return prefs;
  },
});

export const updateDashboardPreferences = mutation({
  args: {
    overviewWidgets: v.array(v.object({
      id: v.string(),
      visible: v.boolean(),
      order: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    
    const existing = await ctx.db
      .query("adminDashboardPreferences")
      .withIndex("by_user", (q) => q.eq("userId", admin._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        overviewWidgets: args.overviewWidgets,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("adminDashboardPreferences", {
        userId: admin._id,
        overviewWidgets: args.overviewWidgets,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
