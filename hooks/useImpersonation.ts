import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "./useCurrentUser";

/**
 * Hook to detect and manage impersonation state.
 * Returns information about whether the current user is being impersonated by an admin.
 */
export function useImpersonation() {
  const { user } = useCurrentUser();
  
  // We check the impersonationTokens table for a token that:
  // 1. Matches this user
  // 2. Is NOT expired
  // 3. Was marked as 'used' (meaning an admin is currently using it)
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
    tokenValue: activeToken?.tokenValue,
  };
}
