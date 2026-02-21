import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
  useGlassAlert,
} from "@/components/ui/glass";

// =============================================================================
// TYPES
// =============================================================================

type SourceGroup = "local" | "cultural";

interface GroupedBySource {
  local: Record<string, SeedItem[]>;
  cultural: Record<string, SeedItem[]>;
}

const SOURCE_CONFIG: Record<
  SourceGroup,
  {
    title: string;
    subtitle: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    accent: string;
  }
> = {
  local: {
    title: "Local Staples",
    subtitle: "Everyday essentials common in your area",
    icon: "home-outline",
    accent: colors.accent.primary,
  },
  cultural: {
    title: "Cultural Favourites",
    subtitle: "Ingredients from your chosen cuisines",
    icon: "earth",
    accent: "#FFB088",
  },
};

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function ReviewItemsScreen() {
  const router = useRouter();
  const { alert } = useGlassAlert();
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

  // Group items by source, then by category within each source
  // If source field exists (new prompt), use it directly.
  // If missing (old prompt), infer from position: first 60% = local, rest = cultural.
  const localCutoff = Math.floor(items.length * 0.6);
  const grouped: GroupedBySource = { local: {}, cultural: {} };
  items.forEach((item, index) => {
    const source: SourceGroup = item.source
      ? item.source
      : index < localCutoff ? "local" : "cultural";
    if (!grouped[source][item.category]) {
      grouped[source][item.category] = [];
    }
    grouped[source][item.category].push(item);
  });

  // Counts
  const localCount = Object.values(grouped.local).flat().length;
  const culturalCount = Object.values(grouped.cultural).flat().length;
  const selectedCount = selectedItems.size;

  // Count selected per source
  const localSelected = Object.values(grouped.local)
    .flat()
    .filter((item) => selectedItems.has(items.indexOf(item))).length;
  const culturalSelected = Object.values(grouped.cultural)
    .flat()
    .filter((item) => selectedItems.has(items.indexOf(item))).length;

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

  function toggleSection(source: SourceGroup) {
    safeHaptics.medium();
    const sectionItems = Object.values(grouped[source]).flat();
    const sectionIndices = sectionItems.map((item) => items.indexOf(item));
    const allSelected = sectionIndices.every((i) => selectedItems.has(i));

    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      sectionIndices.forEach((i) => {
        if (allSelected) {
          newSet.delete(i);
        } else {
          newSet.add(i);
        }
      });
      return newSet;
    });
  }

  async function handleSave() {
    if (selectedItems.size === 0) {
      alert(
        "No items selected",
        "You haven't selected any items. Start with an empty pantry?",
        [
          { text: "Cancel", style: "cancel" },
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
      const stockMap: Record<string, string> = { good: "stocked", half: "low" };
      const itemsToSave = items
        .filter((_, i) => selectedItems.has(i))
        .map((item) => ({
          name: item.name,
          category: item.category,
          stockLevel: (stockMap[item.stockLevel] || item.stockLevel) as "stocked" | "low" | "out",
          estimatedPrice: item.estimatedPrice,
          hasVariants: item.hasVariants,
          defaultSize: item.defaultSize,
          defaultUnit: item.defaultUnit,
        }));

      await bulkCreate({ items: itemsToSave });
      await completeOnboarding();
      safeHaptics.success();

      // Fire variant seeding in the background
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

      router.replace("/(app)/(tabs)");
    } catch (error) {
      console.error("Failed to save pantry items:", error);
      safeHaptics.error();
      alert("Error", "Failed to save items. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <GlassScreen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Review Your Pantry</Text>
        <Text style={styles.subtitle}>
          Tap items to deselect, or toggle whole sections
        </Text>

        {/* Summary chips */}
        <View style={styles.chipRow}>
          <View style={[styles.chip, { borderColor: SOURCE_CONFIG.local.accent }]}>
            <MaterialCommunityIcons
              name={SOURCE_CONFIG.local.icon}
              size={14}
              color={SOURCE_CONFIG.local.accent}
            />
            <Text style={[styles.chipText, { color: SOURCE_CONFIG.local.accent }]}>
              {localSelected}/{localCount} local
            </Text>
          </View>
          <View style={[styles.chip, { borderColor: SOURCE_CONFIG.cultural.accent }]}>
            <MaterialCommunityIcons
              name={SOURCE_CONFIG.cultural.icon}
              size={14}
              color={SOURCE_CONFIG.cultural.accent}
            />
            <Text style={[styles.chipText, { color: SOURCE_CONFIG.cultural.accent }]}>
              {culturalSelected}/{culturalCount} cultural
            </Text>
          </View>
          <View style={[styles.chip, { borderColor: colors.text.secondary }]}>
            <Text style={[styles.chipText, { color: colors.text.secondary }]}>
              {selectedCount} selected
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {(["local", "cultural"] as SourceGroup[]).map((source) => {
          const categories = grouped[source];
          const categoryEntries = Object.entries(categories);
          if (categoryEntries.length === 0) return null;

          const config = SOURCE_CONFIG[source];
          const sectionItems = Object.values(categories).flat();
          const sectionIndices = sectionItems.map((item) => items.indexOf(item));
          const allSelected = sectionIndices.every((i) => selectedItems.has(i));

          return (
            <View key={source} style={styles.sourceSection}>
              {/* Source Header */}
              <TouchableOpacity
                style={[styles.sourceHeader, { borderLeftColor: config.accent }]}
                onPress={() => toggleSection(source)}
                activeOpacity={0.7}
              >
                <View style={[styles.sourceIconContainer, { backgroundColor: `${config.accent}20` }]}>
                  <MaterialCommunityIcons
                    name={config.icon}
                    size={22}
                    color={config.accent}
                  />
                </View>
                <View style={styles.sourceHeaderText}>
                  <Text style={styles.sourceTitle}>{config.title}</Text>
                  <Text style={styles.sourceSubtitle}>{config.subtitle}</Text>
                </View>
                <View style={[styles.selectAllBadge, allSelected && { backgroundColor: config.accent }]}>
                  {allSelected ? (
                    <MaterialCommunityIcons name="check-all" size={16} color="#fff" />
                  ) : (
                    <MaterialCommunityIcons name="checkbox-blank-outline" size={16} color={colors.text.tertiary} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Categories within this source */}
              {categoryEntries.map(([category, categoryItems]) => (
                <View key={category} style={styles.categorySection}>
                  <View style={styles.categoryHeader}>
                    <View style={[styles.categoryDot, { backgroundColor: config.accent }]} />
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <Text style={styles.categoryCount}>
                      {categoryItems.filter((item) => selectedItems.has(items.indexOf(item))).length}/{categoryItems.length}
                    </Text>
                  </View>

                  <View style={styles.itemGrid}>
                    {categoryItems.map((item) => {
                      const globalIndex = items.indexOf(item);
                      const isSelected = selectedItems.has(globalIndex);

                      return (
                        <TouchableOpacity
                          key={globalIndex}
                          style={[
                            styles.itemCard,
                            isSelected && { borderColor: config.accent },
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
                              <View style={[styles.checkmark, { backgroundColor: config.accent }]}>
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
            </View>
          );
        })}
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
          {`Save to Pantry (${selectedCount} items)`}
        </GlassButton>
      </View>
    </GlassScreen>
  );
}

// =============================================================================
// STYLES
// =============================================================================

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
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: {
    ...typography.labelSmall,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  // -- Source section (Local / Cultural) --
  sourceSection: {
    marginBottom: spacing.xl,
  },
  sourceHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  sourceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  sourceHeaderText: {
    flex: 1,
  },
  sourceTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  sourceSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  selectAllBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    justifyContent: "center",
    alignItems: "center",
  },
  // -- Category subsection --
  categorySection: {
    marginBottom: spacing.md,
    marginLeft: spacing.md,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  categoryTitle: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryCount: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  // -- Item grid --
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
    borderColor: colors.glass.border,
  },
  itemCardDeselected: {
    borderColor: colors.glass.border,
    opacity: 0.4,
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
