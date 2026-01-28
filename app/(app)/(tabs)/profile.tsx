import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const allLists = useQuery(api.shoppingLists.getByUser);
  const pantryItems = useQuery(api.pantryItems.getByUser);

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  if (allLists === undefined || pantryItems === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  // Calculate stats
  const completedLists = allLists.filter(list => list.status === "completed");
  const activeLists = allLists.filter(list => list.status === "active");
  const shoppingLists = allLists.filter(list => list.status === "shopping");

  const totalSpent = completedLists.reduce((sum, list) => {
    return sum + (list.budget || 0);
  }, 0);

  const budgetAdherence = completedLists.length > 0
    ? (completedLists.filter(list => (list.budget || 0) > 0).length / completedLists.length) * 100
    : 0;

  const outOfStockItems = pantryItems.filter(item => item.stockLevel === "out").length;
  const lowStockItems = pantryItems.filter(item => item.stockLevel === "low").length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Profile & Insights</Text>

      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>
            {user?.primaryEmailAddress?.emailAddress || "Not set"}
          </Text>
        </View>
      </View>

      {/* Shopping Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shopping Stats</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{allLists.length}</Text>
            <Text style={styles.statLabel}>Total Lists</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedLists.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueActive]}>
              {activeLists.length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueShopping]}>
              {shoppingLists.length}
            </Text>
            <Text style={styles.statLabel}>Shopping</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Total Spent</Text>
          <Text style={[styles.value, styles.moneyValue]}>
            £{totalSpent.toFixed(2)}
          </Text>
        </View>

        {completedLists.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>Budget Adherence</Text>
            <Text style={styles.value}>
              {budgetAdherence.toFixed(0)}% of trips tracked
            </Text>
          </View>
        )}
      </View>

      {/* Pantry Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pantry Overview</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardFull]}>
            <Text style={styles.statValue}>{pantryItems.length}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
        </View>

        {outOfStockItems > 0 && (
          <View style={[styles.card, styles.warningCard]}>
            <Text style={styles.warningLabel}>⚠️ Out of Stock</Text>
            <Text style={styles.warningValue}>
              {outOfStockItems} {outOfStockItems === 1 ? "item" : "items"}
            </Text>
          </View>
        )}

        {lowStockItems > 0 && (
          <View style={[styles.card, styles.cautionCard]}>
            <Text style={styles.cautionLabel}>⚡ Low Stock</Text>
            <Text style={styles.cautionValue}>
              {lowStockItems} {lowStockItems === 1 ? "item" : "items"}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFAF8",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFFAF8",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3436",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  warningCard: {
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
  },
  cautionCard: {
    borderColor: "#FEF3C7",
    backgroundColor: "#FFFBEB",
  },
  label: {
    fontSize: 12,
    color: "#636E72",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    color: "#2D3436",
    fontWeight: "600",
  },
  moneyValue: {
    fontSize: 24,
    color: "#FF6B35",
  },
  warningLabel: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "600",
    marginBottom: 4,
  },
  warningValue: {
    fontSize: 18,
    color: "#DC2626",
    fontWeight: "700",
  },
  cautionLabel: {
    fontSize: 14,
    color: "#D97706",
    fontWeight: "600",
    marginBottom: 4,
  },
  cautionValue: {
    fontSize: 18,
    color: "#D97706",
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: "47%",
  },
  statCardFull: {
    minWidth: "100%",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 4,
  },
  statValueActive: {
    color: "#10B981",
  },
  statValueShopping: {
    color: "#F59E0B",
  },
  statLabel: {
    fontSize: 12,
    color: "#636E72",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  signOutButton: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
