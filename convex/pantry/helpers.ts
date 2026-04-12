import { Doc, Id, DataModel } from "../_generated/dataModel";
import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { isDuplicateItem } from "../lib/fuzzyMatch";

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;

export const ACTIVE_PANTRY_CAP = 150;

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
 * Determine the tier of a pantry item:
 *   1 = Essential (pinned or purchaseCount >= 3)
 *   2 = Regular (active, not essential)
 *   3 = Archived
 */
export function getItemTier(item: { pinned?: boolean; purchaseCount?: number; status?: string }): 1 | 2 | 3 {
  if (item.status === "archived") return 3;
  if (item.pinned) return 1;
  if ((item.purchaseCount ?? 0) >= 3) return 1;
  return 2;
}

/**
 * Enforce the 150-item active pantry cap.
 * If at/over the limit, archives the oldest non-pinned item
 */
export async function enforceActiveCap(ctx: MutationCtx, userId: Id<"users">) {
  const activeItems = await ctx.db
    .query("pantryItems")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
    .collect();

  if (activeItems.length >= ACTIVE_PANTRY_CAP) {
    const archivable = activeItems
      .filter((item) => !item.pinned)
      .sort((a, b) => {
        const aTime = a.lastPurchasedAt ?? a.updatedAt;
        const bTime = b.lastPurchasedAt ?? b.updatedAt;
        return aTime - bTime;
      });

    if (archivable.length > 0) {
      await ctx.db.patch(archivable[0]._id, {
        status: "archived",
        archivedAt: Date.now(),
        archiveReason: "cap_enforce",
        updatedAt: Date.now(),
      });
    }
  }
}

/**
 * Find an existing pantry item by name+size using fuzzy matching.
 */
export async function findExistingPantryItem(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">,
  name: string,
  size?: string | null,
) {
  const activeItems = await ctx.db
    .query("pantryItems")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
    .collect();
  
  const activeMatch = activeItems.find((item) => isDuplicateItem(name, size, item.name, item.defaultSize));
  if (activeMatch) return activeMatch;

  const archivedItems = await ctx.db
    .query("pantryItems")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "archived"))
    .collect();
    
  return archivedItems.find((item) => isDuplicateItem(name, size, item.name, item.defaultSize)) ?? null;
}
