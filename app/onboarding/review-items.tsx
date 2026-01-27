import { View, Text, StyleSheet } from "react-native";

export default function ReviewItemsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review & Customize Items</Text>
      <Text style={styles.subtitle}>Coming in Story 1.9...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFAF8",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#636E72",
  },
});
