import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "./useCurrentUser";

/**
 * Hook to detect and manage impersonation state.
 * Returns information about whether the current user is being impersonated by an admin.
 */
export function useImpersonation() {
  const { user } = useCurrentUser();
  
  // Check for a non-expired impersonation token for this user.
  // A non-expired token means an admin may be viewing this account.
  const activeToken = useQuery(
    api.admin.getActiveImpersonationToken,
    user?._id ? { userId: user._id } : "skip"
  );

  const isImpersonated = !!activeToken;

  return {
    isImpersonated,
    adminId: activeToken?.createdBy,
    adminName: activeToken?.adminName,
    expiresAt: activeToken?.expiresAt,
  };
}
