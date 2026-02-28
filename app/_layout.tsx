import { useEffect, useRef, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useMutation, useQuery } from "convex/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeKeyboardProvider } from "@/lib/keyboard/safeKeyboardController";
import { GlassAlertProvider } from "@/components/ui/glass";
import { api } from "@/convex/_generated/api";
import { UserSwitchContext } from "@/hooks/useIsSwitchingUsers";

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  { unsavedChangesWarning: false }
);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables"
  );
}

function InitialLayout() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Track previous user ID to detect user switches (sign-out/sign-in or account switching)
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  // State to block stale queries when user changes
  // This prevents User B from seeing User A's cached data during the transition
  const [isSwitchingUsers, setIsSwitchingUsers] = useState(false);

  // Detect user ID changes and trigger cache invalidation
  useEffect(() => {
    // Skip until Clerk is loaded
    if (!isLoaded) return;

    const currentUserId = userId ?? null; // normalize undefined to null for comparison
    const previousUserId = previousUserIdRef.current;

    // First load - just store the current userId
    if (previousUserId === undefined) {
      previousUserIdRef.current = currentUserId;
      return;
    }

    // User changed (sign-out, sign-in, or account switch)
    if (previousUserId !== currentUserId) {
      console.log('[Convex Cache] User changed:', {
        from: previousUserId,
        to: currentUserId,
        action: currentUserId ? 'signed in' : 'signed out'
      });

      // Block all queries temporarily to prevent showing stale cached data
      setIsSwitchingUsers(true);

      // Update the ref
      previousUserIdRef.current = currentUserId;

      // Allow queries to resume after a brief delay to ensure Convex
      // has had a chance to re-authenticate with the new user's token
      const timeoutId = setTimeout(() => {
        console.log('[Convex Cache] Resuming queries for new user');
        setIsSwitchingUsers(false);
      }, 200); // 200ms for token refresh and query invalidation

      return () => clearTimeout(timeoutId);
    }
  }, [isLoaded, userId]);

  // Query current user to check onboarding status
  // SKIP queries during user switching to prevent cache leakage
  const currentUser = useQuery(
    api.users.getCurrent,
    isLoaded && isSignedIn && !isSwitchingUsers ? {} : "skip"
  );
  // Ensure user record exists in Convex when signed in
  const getOrCreate = useMutation(api.users.getOrCreate);
  const creatingUser = useRef(false);

  // Ensure Convex user record exists whenever signed in but no record found
  useEffect(() => {
    if (!isLoaded || !isSignedIn || isSwitchingUsers) return;
    // currentUser === undefined means query still loading; null means no record
    if (currentUser === null && !creatingUser.current) {
      creatingUser.current = true;
      getOrCreate({ mfaEnabled: false })
        .catch(() => {})
        .finally(() => {
          creatingUser.current = false;
        });
    }
  }, [isLoaded, isSignedIn, isSwitchingUsers, currentUser]);

  useEffect(() => {
    if (!isLoaded || isSwitchingUsers) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (isSignedIn && inAuthGroup) {
      // Just signed in — redirect to app; onboarding check happens below
      // once currentUser loads
      router.replace("/(app)/(tabs)");
      return;
    }

    // Wait for user record to load (undefined = loading, null = not found yet)
    if (isSignedIn && currentUser !== undefined && currentUser !== null) {
      const inAppGroup = segments[0] === "(app)";
      const inOnboarding = segments[0] === "onboarding";
      const isAdminSetup = segments[1] === "admin-setup";
      const isAdminPath = segments[1] === "admin";
      
      if (!currentUser.onboardingComplete && !inOnboarding) {
        router.replace("/onboarding/welcome");
      } else if (currentUser.onboardingComplete && !inAppGroup && !isAdminPath && !isAdminSetup) {
        router.replace("/(app)/(tabs)");
      }
    }
  }, [isLoaded, isSignedIn, isSwitchingUsers, segments, currentUser]);

  return (
    <UserSwitchContext.Provider value={isSwitchingUsers}>
      <Slot />
    </UserSwitchContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <SafeKeyboardProvider>
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
              <GlassAlertProvider>
                <InitialLayout />
              </GlassAlertProvider>
            </ConvexProviderWithClerk>
          </SafeKeyboardProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
