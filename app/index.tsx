import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "@/lib/design/glassTokens";

/**
 * Root index — renders a loading spinner while _layout.tsx's InitialLayout
 * handles all auth routing (sign-in, onboarding, app).
 * Does NOT call useAuth() because it mounts before ClerkProvider is ready.
 */
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.primary,
  },
});
