import { View, Text, StyleSheet, Platform } from "react-native";
import { useAuth } from "@clerk/clerk-expo";

export default function PantryScreen() {
  const { userId } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pantry</Text>
      <Text style={styles.subtitle}>Your pantry items will appear here</Text>
      <Text style={styles.debug}>User ID: {userId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFAF8",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
  },
  debug: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
