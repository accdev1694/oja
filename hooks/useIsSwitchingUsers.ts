import { createContext, useContext } from 'react';

/**
 * Context for tracking user switching state across the app.
 * When true, all Convex queries should be skipped to prevent
 * showing cached data from the previous user.
 */
export const UserSwitchContext = createContext(false);

/**
 * Hook to check if the app is currently switching between users.
 * Returns true during the brief transition period when a user signs out/in.
 *
 * Use this in combination with other conditions when calling Convex queries:
 * ```typescript
 * const isSwitchingUsers = useIsSwitchingUsers();
 * const data = useQuery(
 *   api.foo.bar,
 *   isLoaded && isSignedIn && !isSwitchingUsers ? {} : "skip"
 * );
 * ```
 */
export function useIsSwitchingUsers() {
  return useContext(UserSwitchContext);
}
