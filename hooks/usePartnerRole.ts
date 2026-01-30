import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Hook to get current user's permissions for a specific list.
 * Returns role info and computed permissions.
 */
export function usePartnerRole(listId: Id<"shoppingLists"> | undefined) {
  const permissions = useQuery(
    api.partners.getMyPermissions,
    listId ? { listId } : "skip"
  );

  if (!listId || permissions === undefined) {
    return {
      isOwner: false,
      isPartner: false,
      role: null as "viewer" | "editor" | "approver" | null,
      canView: false,
      canEdit: false,
      canApprove: false,
      loading: true,
    };
  }

  return {
    ...permissions,
    loading: false,
  };
}
