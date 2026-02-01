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
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { SeedItem } from "@/convex/ai";
import { safeHaptics } from "@/lib/utils/safeHaptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

export default function ReviewItemsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ items?: string }>();
  const insets = useSafeAreaInsets();

  const bulkCreate = useMutation(api.pantryItems.bulkCreate);
  const generateVariants = useAction(api.ai.generateItemVariants);
  const bulkUpsertVariants = useMutation(api.itemVariants.bulkUpsert);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

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
            onPress: async () => {
              safeHaptics.light();
              await completeOnboarding();
              router.replace("/(app)/(tabs)");
            },
          },
        ]
      );
      return;
    }

    setIsSaving(true);

    try {
      // Get selected items and normalize stock levels to 3-level system
      const stockMap: Record<string, string> = { good: "stocked", half: "low" };
      const itemsToSave = items
        .filter((_, i) => selectedItems.has(i))
        .map((item) => ({
          ...item,
          stockLevel: stockMap[item.stockLevel] || item.stockLevel,
        }));

      // Save to Convex
      await bulkCreate({ items: itemsToSave as any });

      // Mark onboarding as complete
      await completeOnboarding();

      safeHaptics.success();

      // Fire variant seeding in the background (don't block navigation)
      const variantItems = itemsToSave.filter((item) => item.hasVariants);
      if (variantItems.length > 0) {
        generateVariants({
          items: variantItems.map((i) => ({ name: i.name, category: i.category })),
        })
          .then((variants) => {
            if (variants && variants.length > 0) {
              bulkUpsertVariants({ variants }).catch(console.error);
            }
          })
          .catch(console.error);
      }

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
    <GlassScreen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Review Your Pantry</Text>
        <Text style={styles.subtitle}>
          Tap items to remove them from your pantry
        </Text>

        <GlassCard variant="standard" style={styles.statsCard}>
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
        </GlassCard>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>

            <View style={styles.itemGrid}>
              {categoryItems.map((item) => {
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
                    activeOpacity={0.7}
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

                      {item.estimatedPrice != null && (
                        <Text
                          style={[
                            styles.itemPrice,
                            !isSelected && styles.itemPriceDeselected,
                          ]}
                        >
                          ~£{item.estimatedPrice.toFixed(2)}
                        </Text>
                      )}

                      {isSelected && (
                        <View style={styles.checkmark}>
                          <MaterialCommunityIcons name="check" size={12} color="#fff" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <GlassButton
          variant="primary"
          size="lg"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving}
          icon="check-all"
        >
          Save to Pantry ({selectedCount} items)
        </GlassButton>
      </View>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.displaySmall,
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  statsCard: {
    padding: 0,
  },
  stats: {
    flexDirection: "row",
    padding: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.accent.primary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.glass.border,
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  itemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  itemCard: {
    width: "30%",
    minWidth: 100,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: colors.accent.primary,
  },
  itemCardDeselected: {
    borderColor: colors.glass.border,
    opacity: 0.5,
  },
  itemContent: {
    position: "relative",
  },
  itemName: {
    ...typography.labelSmall,
    fontWeight: "600",
    color: colors.text.primary,
    paddingRight: 20,
  },
  itemNameDeselected: {
    color: colors.text.tertiary,
  },
  itemPrice: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: 2,
  },
  itemPriceDeselected: {
    color: colors.text.tertiary,
  },
  checkmark: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
});
