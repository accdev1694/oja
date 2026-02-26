import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new help article
 */
export const createArticle = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    categoryId: v.id("helpCategories"),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
      
    if (!admin || !admin.isAdmin) throw new Error("Unauthorized");
    
    const now = Date.now();
    return await ctx.db.insert("helpArticles", {
      ...args,
      createdBy: admin._id,
      publishedAt: args.status === "published" ? now : undefined,
      updatedAt: now,
    });
  },
});

/**
 * Create a new help category
 */
export const createCategory = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    icon: v.string(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("helpCategories", args);
  },
});

/**
 * Get all published help articles by category
 */
export const getHelpCenter = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("helpCategories")
      .withIndex("by_order")
      .collect();
      
    const result = [];
    
    for (const cat of categories) {
      const articles = await ctx.db
        .query("helpArticles")
        .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
        .filter((q) => q.eq(q.field("status"), "published"))
        .collect();
        
      if (articles.length > 0) {
        result.push({
          ...cat,
          articles: articles.map(a => ({
            _id: a._id,
            title: a.title,
            slug: a.slug,
          })),
        });
      }
    }
    
    return result;
  },
});

/**
 * Get a specific help article by slug
 */
export const getArticle = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("helpArticles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/**
 * Admin: List all articles
 */
export const listAllArticles = query({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db.query("helpArticles").order("desc").collect();
    
    return await Promise.all(articles.map(async (a) => {
      const cat = await ctx.db.get(a.categoryId);
      return {
        ...a,
        categoryName: cat?.name || "Unknown",
      };
    }));
  },
});
