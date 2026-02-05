import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * Extract first name from full name.
 * Handles "John Smith" → "John", "Mary-Jane" → "Mary-Jane"
 * Ignores placeholder names like "User"
 */
function getFirstName(fullName?: string | null): string | undefined {
  if (!fullName || fullName === "User") return undefined;
  return fullName.split(" ")[0];
}

export function useCurrentUser() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  const convexUser = useQuery(
    api.users.getByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Try Convex name first, then Clerk's firstName/fullName as fallback
  const firstName =
    getFirstName(convexUser?.name) ||
    clerkUser?.firstName ||
    getFirstName(clerkUser?.fullName);

  return {
    clerkUser,
    user: convexUser,
    firstName,
    isLoading: !isClerkLoaded || convexUser === undefined,
    hasProfile: !!convexUser,
  };
}
