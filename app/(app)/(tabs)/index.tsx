import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import * as Haptics from "expo-haptics";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 48; // 24px on each side
const COLUMNS = SCREEN_WIDTH > 600 ? 3 : 2; // 3 columns on tablet, 2 on phone

export default function PantryScreen() {
  const items = useQuery(api.pantryItems.getByUser);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  if (items === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading pantry...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🏠</Text>
        <Text style={styles.emptyTitle}>Your Pantry is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Add items to track what you have at home
        </Text>
      </View>
    );
  }

  // Group items by category
  const groupedItems: Record<string, typeof items> = {};
  items.forEach((item) => {
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = [];
    }
    groupedItems[item.category].push(item);
  });

  // Stock level colors
  const getStockColor = (level: string) => {
    switch (level) {
      case "stocked": return "#10B981"; // Green
      case "good": return "#3B82F6";    // Blue
      case "low": return "#F59E0B";     // Orange
      case "out": return "#EF4444";     // Red
      default: return "#6B7280";
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Pantry</Text>
      <Text style={styles.subtitle}>{items.length} items in stock</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>

            <View style={styles.itemGrid}>
              {categoryItems.map((item) => (
                <View key={item._id} style={styles.itemCard}>
                  <View
                    style={[
                      styles.stockIndicator,
                      { backgroundColor: getStockColor(item.stockLevel) },
                    ]}
                  />
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.stockLevel}>
                    {item.stockLevel === "stocked" && "Fully Stocked"}
                    {item.stockLevel === "good" && "Good"}
                    {item.stockLevel === "low" && "Running Low"}
                    {item.stockLevel === "out" && "Out of Stock"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFAF8",
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
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2D3436",
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#636E72",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 12,
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  itemCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  stockIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2D3436",
    marginBottom: 4,
    paddingRight: 20,
  },
  stockLevel: {
    fontSize: 12,
    color: "#636E72",
  },
});
