import { useEffect, useRef, useState, useCallback } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useMutation, useQuery } from "convex/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { SafeKeyboardProvider } from "@/lib/keyboard/safeKeyboardController";
import {
  GlassAlertProvider,
  GlassModal,
  GlassInput,
  GlassButton,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/convex/_generated/api";
import { isGenericName, isValidName } from "@/lib/names";
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
      // Block all queries temporarily to prevent showing stale cached data
      setIsSwitchingUsers(true);

      // Update the ref
      previousUserIdRef.current = currentUserId;

      // Allow queries to resume after a brief delay to ensure Convex
      // has had a chance to re-authenticate with the new user's token
      const timeoutId = setTimeout(() => {
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
  const updateUser = useMutation(api.users.update);
  const creatingUser = useRef(false);

  // Name collection for existing users with generic/missing names
  const NAME_PROMPT_STORAGE_KEY = "oja_name_prompt_count";
  const MAX_NAME_PROMPTS = 3;
  const needsName = currentUser?.onboardingComplete &&
    (!currentUser.name || isGenericName(currentUser.name) ||
      currentUser.name.toLowerCase() === currentUser.email?.split("@")[0]?.toLowerCase());
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const namePromptShown = useRef(false);

  // Show name prompt for users who need it, up to MAX_NAME_PROMPTS times total
  useEffect(() => {
    if (!needsName || namePromptShown.current || isSwitchingUsers) return;
    namePromptShown.current = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(NAME_PROMPT_STORAGE_KEY);
        const count = raw ? parseInt(raw, 10) : 0;
        if (count >= MAX_NAME_PROMPTS) return;
        await AsyncStorage.setItem(NAME_PROMPT_STORAGE_KEY, String(count + 1));
        const timer = setTimeout(() => setShowNameModal(true), 800);
        return () => clearTimeout(timer);
      } catch {
        // Storage error — show anyway to avoid silently skipping
        const timer = setTimeout(() => setShowNameModal(true), 800);
        return () => clearTimeout(timer);
      }
    })();
  }, [needsName, isSwitchingUsers]);

  const handleSaveName = useCallback(async () => {
    const trimmed = nameInput.trim();
    if (!isValidName(trimmed)) return;
    setSavingName(true);
    try {
      await updateUser({ name: trimmed });
      // Reset prompt counter so it never shows again
      await AsyncStorage.setItem(NAME_PROMPT_STORAGE_KEY, String(MAX_NAME_PROMPTS));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowNameModal(false);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSavingName(false);
    }
  }, [nameInput, updateUser]);

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
      const isAdminSetup = segments.length > 1 && segments[1] === "admin-setup";
      const isAdminPath = segments.length > 1 && segments[1] === "admin";
      
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

      {/* One-time name collection for existing users with generic names */}
      <GlassModal
        visible={showNameModal}
        onClose={() => setShowNameModal(false)}
        animationType="fade"
        position="center"
        avoidKeyboard
      >
        <View style={nameStyles.container}>
          <View style={nameStyles.iconWrap}>
            <MaterialCommunityIcons name="hand-wave" size={36} color={colors.accent.primary} />
          </View>
          <Text style={nameStyles.title}>What should we call you?</Text>
          <Text style={nameStyles.subtitle}>
            Your name helps personalise your Oja experience
          </Text>
          <GlassInput
            placeholder="First name"
            value={nameInput}
            onChangeText={setNameInput}
            autoCapitalize="words"
            autoComplete="given-name"
            iconLeft="account-outline"
          />
          <View style={{ height: spacing.md }} />
          <GlassButton
            variant="primary"
            size="lg"
            onPress={handleSaveName}
            loading={savingName}
            disabled={savingName || !nameInput.trim()}
          >
            Continue
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => setShowNameModal(false)}
            style={{ marginTop: spacing.xs }}
          >
            Skip for now
          </GlassButton>
        </View>
      </GlassModal>
    </UserSwitchContext.Provider>
  );
}

const nameStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.accent.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
});

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
