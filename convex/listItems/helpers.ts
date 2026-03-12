import { Doc, Id, DataModel } from "../_generated/dataModel";
import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { isDuplicateItem } from "../lib/fuzzyMatch";

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;

export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}

export async function optionalUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/**
 * Helper to mark a list as updated after item changes.
 */
export async function recalculateListTotal(
  ctx: MutationCtx,
  listId: Id<"shoppingLists">
): Promise<void> {
  await ctx.db.patch(listId, {
    updatedAt: Date.now(),
  });
}

/**
 * Find an existing list item that is a fuzzy duplicate of the given name.
 */
export async function findDuplicateListItem(
  ctx: MutationCtx | QueryCtx,
  listId: Id<"shoppingLists">,
  name: string,
  size?: string | null,
) {
  const items = await ctx.db
    .query("listItems")
    .withIndex("by_list", (q) => q.eq("listId", listId))
    .collect();

  for (const item of items) {
    if (isDuplicateItem(name, size, item.name, item.size)) {
      return item;
    }
  }
  return null;
}

/**
 * Find a pantry item that is a fuzzy duplicate of the given name.
 */
export async function findDuplicatePantryItem(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">,
  name: string,
  size?: string | null,
) {
  const activeItems = await ctx.db
    .query("pantryItems")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
    .collect();

  for (const item of activeItems) {
    if (isDuplicateItem(name, size, item.name, item.defaultSize)) {
      return item;
    }
  }

  const archivedItems = await ctx.db
    .query("pantryItems")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "archived"))
    .collect();

  for (const item of archivedItems) {
    if (isDuplicateItem(name, size, item.name, item.defaultSize)) {
      return item;
    }
  }

  return null;
}
