import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function usePartnerRole(listId: Id<"shoppingLists"> | undefined) {
  const permissions = useQuery(
    api.partners.getMyPermissions,
    listId ? { listId } : "skip"
  );

  if (!listId || permissions === undefined) {
    return {
      isOwner: false,
      isPartner: false,
      role: null as "member" | null,
      canView: false,
      canEdit: false,
      loading: true,
    };
  }

  return {
    ...permissions,
    loading: false,
  };
}
