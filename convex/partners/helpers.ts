import { v } from "convex/values";
import { query } from "../_generated/server";
import { Doc, Id, DataModel } from "../_generated/dataModel";
import { GenericMutationCtx, GenericQueryCtx } from "convex/server";

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;

// Helper to get authenticated user (auto-creates if missing, e.g. partner who skipped onboarding)
export async function requireUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (user) return user;

  // Auto-create user record for partners who haven't completed onboarding
  const now = Date.now();
  const fallbackName = identity.email ? identity.email.split("@")[0] : "Shopper";
  const displayName = identity.name || identity.givenName || fallbackName;

  const userId = await ctx.db.insert("users", {
    clerkId: identity.subject,
    name: displayName,
    email: identity.email,
    avatarUrl: identity.pictureUrl,
    currency: "GBP",
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  });
  const newUser = await ctx.db.get(userId);
  if (!newUser) throw new Error("Failed to create user");
  return newUser;
}

/**
 * Get user's permissions for a specific list.
 * Returns role info and computed permissions.
 * Exported for use in other Convex modules (listItems, etc.)
 */
export async function getUserListPermissions(
  ctx: QueryCtx | MutationCtx,
  listId: Id<"shoppingLists">,
  userId: Id<"users">
): Promise<{
  isOwner: boolean;
  isPartner: boolean;
  role: "member" | null;
  canView: boolean;
  canEdit: boolean;
}> {
  const list = await ctx.db.get(listId);
  if (!list) {
    return { isOwner: false, isPartner: false, role: null, canView: false, canEdit: false };
  }

  // Completed and archived lists are read-only — no edits from any angle
  const isLocked = list.status === "completed" || list.status === "archived";

  const isOwner = list.userId === userId;
  if (isOwner) {
    return { isOwner: true, isPartner: false, role: null, canView: true, canEdit: !isLocked };
  }

  // Check partner record
  const partner = await ctx.db
    .query("listPartners")
    .withIndex("by_list_user", (q) => q.eq("listId", listId).eq("userId", userId))
    .unique();

  if (!partner || (partner.status !== "accepted" && partner.status !== "pending")) {
    return { isOwner: false, isPartner: false, role: null, canView: false, canEdit: false };
  }

  return {
    isOwner: false,
    isPartner: true,
    role: "member",
    canView: true,
    canEdit: !isLocked, // Partners can now add/edit items
  };
}

/**
 * Query: get current user's permissions for a list (for frontend use)
 */
export const getMyPermissions = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isOwner: false, isPartner: false, role: null, canView: false, canEdit: false };
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) {
      return { isOwner: false, isPartner: false, role: null, canView: false, canEdit: false };
    }
    return getUserListPermissions(ctx, args.listId, user._id);
  },
});
