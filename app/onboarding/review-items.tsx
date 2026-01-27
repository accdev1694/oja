import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { SeedItem } from "@/convex/ai";
import { safeHaptics } from "@/lib/utils/safeHaptics";

export default function ReviewItemsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ items?: string }>();

  const bulkCreate = useMutation(api.pantryItems.bulkCreate);

  const [items, setItems] = useState<SeedItem[]>(() => {
    try {
      return params.items ? JSON.parse(params.items) : [];
    } catch {
      return [];
    }
  });

  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    () => new Set(items.map((_, i) => i))
  );

  const [isSaving, setIsSaving] = useState(false);

  // Group items by category
  const groupedItems: Record<string, SeedItem[]> = {};
  items.forEach((item) => {
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = [];
    }
    groupedItems[item.category].push(item);
  });

  // Calculate counts
  const totalItems = items.length;
  const selectedCount = selectedItems.size;
  const localItemsCount = Math.floor(totalItems * 0.6);
  const culturalItemsCount = totalItems - localItemsCount;

  function toggleItem(index: number) {
    safeHaptics.light();

    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }

  async function handleSave() {
    if (selectedItems.size === 0) {
      Alert.alert(
        "No items selected",
        "You haven't selected any items. Start with an empty pantry?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Continue",
            onPress: () => {
              safeHaptics.light();
              router.replace("/(app)/(tabs)");
            },
          },
        ]
      );
      return;
    }

    setIsSaving(true);

    try {
      // Get selected items
      const itemsToSave = items.filter((_, i) => selectedItems.has(i));

      // Save to Convex
      await bulkCreate({ items: itemsToSave });

      safeHaptics.success();

      // Navigate to main app
      router.replace("/(app)/(tabs)");
    } catch (error) {
      console.error("Failed to save pantry items:", error);
      safeHaptics.error();
      Alert.alert("Error", "Failed to save items. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Review Your Pantry</Text>
        <Text style={styles.subtitle}>
          Tap items to remove them from your pantry
        </Text>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Local Items</Text>
            <Text style={styles.statValue}>{localItemsCount}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Cultural Items</Text>
            <Text style={styles.statValue}>{culturalItemsCount}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Selected</Text>
            <Text style={styles.statValue}>{selectedCount}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>

            <View style={styles.itemGrid}>
              {categoryItems.map((item, localIndex) => {
                const globalIndex = items.indexOf(item);
                const isSelected = selectedItems.has(globalIndex);

                return (
                  <TouchableOpacity
                    key={globalIndex}
                    style={[
                      styles.itemCard,
                      !isSelected && styles.itemCardDeselected,
                    ]}
                    onPress={() => toggleItem(globalIndex)}
                  >
                    <View style={styles.itemContent}>
                      <Text
                        style={[
                          styles.itemName,
                          !isSelected && styles.itemNameDeselected,
                        ]}
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>

                      {isSelected && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              Save to Pantry ({selectedCount} items)
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFAF8",
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2D3436",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#636E72",
    marginBottom: 16,
  },
  stats: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#636E72",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF6B35",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
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
    width: "30%",
    minWidth: 100,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  itemCardDeselected: {
    borderColor: "#E5E7EB",
    opacity: 0.5,
  },
  itemContent: {
    position: "relative",
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2D3436",
    paddingRight: 20,
  },
  itemNameDeselected: {
    color: "#95A5A6",
  },
  checkmark: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFAF8",
  },
  saveButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
