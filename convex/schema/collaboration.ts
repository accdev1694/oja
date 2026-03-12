import { defineTable } from "convex/server";
import { v } from "convex/values";

export const collaborationTables = {
  // List partners (shared list membership) — single "member" role
  listPartners: defineTable({
    listId: v.id("shoppingLists"),
    userId: v.id("users"),
    role: v.literal("member"),
    invitedBy: v.id("users"),
    invitedAt: v.number(),
    acceptedAt: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
  })
    .index("by_list", ["listId"])
    .index("by_user", ["userId"])
    .index("by_list_user", ["listId", "userId"]),

  // Invite codes for sharing lists
  inviteCodes: defineTable({
    code: v.string(),
    listId: v.id("shoppingLists"),
    createdBy: v.id("users"),
    role: v.literal("member"),
    expiresAt: v.number(),
    usedBy: v.optional(v.id("users")),
    usedAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_list", ["listId"]),

  // List-level chat messages (Epic 4 - Partner Mode)
  listMessages: defineTable({
    listId: v.id("shoppingLists"),
    userId: v.id("users"),
    text: v.string(),
    isSystem: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_user", ["userId"]),

  // Comments on list items
  itemComments: defineTable({
    listItemId: v.id("listItems"),
    userId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_item", ["listItemId"])
    .index("by_user", ["userId"]),
};
