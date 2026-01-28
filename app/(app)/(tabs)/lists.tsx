import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export default function ListsScreen() {
  const router = useRouter();
  const lists = useQuery(api.shoppingLists.getActive);
  const createList = useMutation(api.shoppingLists.create);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateList() {
    setIsCreating(true);
    try {
      const listName = `Shopping List ${new Date().toLocaleDateString()}`;
      const listId = await createList({
        name: listName,
        budget: 50, // Default budget of £50
        budgetLocked: false,
      });

      router.push(`/list/${listId}`);
    } catch (error) {
      console.error("Failed to create list:", error);
      Alert.alert("Error", "Failed to create shopping list");
    } finally {
      setIsCreating(false);
    }
  }

  if (lists === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading lists...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shopping Lists</Text>
        <TouchableOpacity
          style={[styles.createButton, isCreating && styles.createButtonDisabled]}
          onPress={handleCreateList}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.createButtonText}>+ New List</Text>
          )}
        </TouchableOpacity>
      </View>

      {lists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📝</Text>
          <Text style={styles.emptyTitle}>No Shopping Lists</Text>
          <Text style={styles.emptySubtitle}>
            Create your first list to get started
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {lists.map((list) => (
            <TouchableOpacity
              key={list._id}
              style={styles.listCard}
              onPress={() => router.push(`/list/${list._id}`)}
            >
              <View style={styles.listHeader}>
                <Text style={styles.listName}>{list.name}</Text>
                <View style={[
                  styles.statusBadge,
                  list.status === "shopping" && styles.statusBadgeShopping,
                  list.status === "completed" && styles.statusBadgeCompleted,
                ]}>
                  <Text style={styles.statusText}>
                    {list.status === "shopping" ? "Shopping" : "Active"}
                  </Text>
                </View>
              </View>

              {list.budget && (
                <Text style={styles.budgetText}>
                  Budget: £{list.budget.toFixed(2)}
                </Text>
              )}

              <Text style={styles.dateText}>
                Created {new Date(list.createdAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFAF8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFAF8",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#636E72",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2D3436",
  },
  createButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#636E72",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3436",
    flex: 1,
  },
  statusBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeShopping: {
    backgroundColor: "#F59E0B",
  },
  statusBadgeCompleted: {
    backgroundColor: "#6B7280",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  budgetText: {
    fontSize: 16,
    color: "#FF6B35",
    fontWeight: "600",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: "#636E72",
  },
});
