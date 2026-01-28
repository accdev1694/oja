import { View, Text, StyleSheet } from "react-native";

export default function TestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Oja App is Working!</Text>
      <Text style={styles.subtitle}>Epic 1 Complete - All 9 Stories Implemented</Text>
      <Text style={styles.info}>✅ Expo running</Text>
      <Text style={styles.info}>✅ TypeScript working</Text>
      <Text style={styles.info}>✅ Routing working</Text>
      <Text style={styles.info}>✅ React Native working</Text>
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
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#636E72",
    marginBottom: 32,
    textAlign: "center",
  },
  info: {
    fontSize: 16,
    color: "#FF6B35",
    marginBottom: 8,
  },
});
