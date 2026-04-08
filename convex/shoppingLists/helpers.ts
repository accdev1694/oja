import { Doc, Id, DataModel } from "../_generated/dataModel";
import { GenericMutationCtx, GenericQueryCtx } from "convex/server";

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
  if (user.suspended) throw new Error("Account suspended");
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

/** Get next sequential list number for a user (max existing + 1). */
export async function getNextListNumber(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<number> {
  // Fetch only the most recent list to find the highest listNumber,
  // rather than collecting ALL user lists.
  const latest = await ctx.db
    .query("shoppingLists")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .first();

  return (latest?.listNumber ?? 0) + 1;
}

/**
 * Throw if a list is completed or archived — these are read-only.
 * Call this at the top of any mutation that modifies a list or its items.
 */
export function requireEditableList(list: { status: string; name?: string }): void {
  if (list.status === "completed" || list.status === "archived") {
    throw new Error(
      `Cannot edit a ${list.status} list. ${list.status === "completed" ? "Completed" : "Archived"} lists are read-only.`
    );
  }
}
