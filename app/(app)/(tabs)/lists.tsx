import { View, Text, StyleSheet } from "react-native";

export default function ListsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shopping Lists</Text>
      <Text style={styles.subtitle}>Your shopping lists will appear here</Text>
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
  },
});
