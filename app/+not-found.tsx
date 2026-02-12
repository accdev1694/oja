import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

/**
 * Catch-all for unmatched routes (e.g., OAuth callbacks).
 * Redirects to the appropriate screen based on auth state.
 */
export default function NotFoundScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    // Redirect based on auth state
    if (isSignedIn) {
      router.replace("/(app)/(tabs)");
    } else {
      router.replace("/(auth)/sign-in");
    }
  }, [isLoaded, isSignedIn]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00D4AA" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D1528",
  },
});
