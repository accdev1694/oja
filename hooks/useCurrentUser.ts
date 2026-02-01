import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function useCurrentUser() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  const convexUser = useQuery(
    api.users.getByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  return {
    clerkUser,
    user: convexUser,
    isLoading: !isClerkLoaded || convexUser === undefined,
    hasProfile: !!convexUser,
  };
}
