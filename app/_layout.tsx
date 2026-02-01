import { useEffect, useRef } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useMutation, useQuery } from "convex/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { api } from "@/convex/_generated/api";

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
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Query current user to check onboarding status
  const currentUser = useQuery(
    api.users.getCurrent,
    isLoaded && isSignedIn ? {} : "skip"
  );
  // Ensure user record exists in Convex when signed in
  const getOrCreate = useMutation(api.users.getOrCreate);
  const creatingUser = useRef(false);

  // Ensure Convex user record exists whenever signed in but no record found
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // currentUser === undefined means query still loading; null means no record
    if (currentUser === null && !creatingUser.current) {
      creatingUser.current = true;
      getOrCreate()
        .catch(() => {})
        .finally(() => {
          creatingUser.current = false;
        });
    }
  }, [isLoaded, isSignedIn, currentUser]);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (isSignedIn && inAuthGroup) {
      // Just signed in — redirect away from auth; getOrCreate runs via
      // the other effect once getCurrent resolves to null
      router.replace("/");
      return;
    }

    // Wait for user record to load (undefined = loading, null = not found yet)
    if (isSignedIn && currentUser !== undefined && currentUser !== null) {
      if (!currentUser.onboardingComplete && !inOnboarding) {
        router.replace("/onboarding/welcome");
      } else if (currentUser.onboardingComplete && inOnboarding) {
        router.replace("/(app)/(tabs)");
      }
    }
  }, [isLoaded, isSignedIn, segments, currentUser]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <InitialLayout />
          </ConvexProviderWithClerk>
        </ClerkLoaded>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
