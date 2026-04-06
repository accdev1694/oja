import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { isGenericName } from "../lib/names";
import { useIsSwitchingUsers } from "./useIsSwitchingUsers";

/**
 * Extract first name from full name.
 * Handles "John Smith" -> "John", "Mary-Jane" -> "Mary-Jane"
 * Ignores placeholder names like "User" or "Shopper"
 */
function getFirstName(fullName?: string | null) {
  if (!fullName) return undefined;
  if (isGenericName(fullName)) return undefined;
  return fullName.split(" ")[0];
}

export function useCurrentUser() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const isSwitchingUsers = useIsSwitchingUsers();

  const convexUser = useQuery(
    api.users.getCurrent,
    clerkUser?.id && !isSwitchingUsers ? {} : "skip"
  );

  // Try Convex name first, then Clerk's firstName/fullName, then email prefix, then "Shopper"
  const firstName =
    getFirstName(convexUser?.name) ||
    clerkUser?.firstName ||
    getFirstName(clerkUser?.fullName) ||
    clerkUser?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Shopper";

  return {
    clerkUser,
    user: convexUser,
    firstName,
    isLoading: !isClerkLoaded || convexUser === undefined || isSwitchingUsers,
    hasProfile: !!convexUser,
  };
}
