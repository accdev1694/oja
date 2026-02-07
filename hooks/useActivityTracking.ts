import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Hook to track user activity for nurture sequence
 * Records activity when:
 * - App first loads (signed in)
 * - App comes to foreground from background
 */
export function useActivityTracking() {
  const recordActivity = useMutation(api.nurture.recordActivity);
  const appState = useRef(AppState.currentState);
  const hasRecordedInitial = useRef(false);

  useEffect(() => {
    // Record initial activity on mount (app opened)
    if (!hasRecordedInitial.current) {
      hasRecordedInitial.current = true;
      recordActivity().catch(console.warn);
    }

    // Listen for app state changes (foreground/background)
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      // App came to foreground from background
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        recordActivity().catch(console.warn);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [recordActivity]);
}
