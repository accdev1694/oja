import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { SeedItem } from "@/convex/ai";
import { safeHaptics } from "@/lib/haptics/safeHaptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  GlassScreen,
  GlassButton,
  colors,
  spacing,
  useGlassAlert,
} from "@/components/ui/glass";

import { styles } from "@/components/onboarding/styles";
import { OnboardingCategorySection } from "@/components/onboarding/OnboardingCategorySection";

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
  const params = useLocalSearchParams<{ items?: string; cuisines?: string }>();
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

  // C9 fix: Build O(1) lookup map instead of O(n) indexOf per item
  const itemIndexMap = useMemo(
    () => new Map(items.map((item, i) => [item, i])),
    [items]
  );

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

  const localCount = Object.values(grouped.local).flat().length;
  const culturalCount = Object.values(grouped.cultural).flat().length;
  const selectedCount = selectedItems.size;

  const localSelected = Object.values(grouped.local)
    .flat()
    .filter((item) => selectedItems.has(itemIndexMap.get(item) ?? -1)).length;
  const culturalSelected = Object.values(grouped.cultural)
    .flat()
    .filter((item) => selectedItems.has(itemIndexMap.get(item) ?? -1)).length;

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
    const sectionIndices = sectionItems.map((item) => itemIndexMap.get(item) ?? -1);
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
              try {
                const cuisineList = params.cuisines ? params.cuisines.split(",") : [];
                await completeOnboarding({ cuisines: cuisineList });
              } catch (e) {
                console.warn("Failed to complete onboarding:", e);
              }
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
      const cuisineList = params.cuisines ? params.cuisines.split(",") : [];
      await completeOnboarding({ cuisines: cuisineList });
      safeHaptics.success();

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
          const allSelected = sectionItems.every((item) => selectedItems.has(itemIndexMap.get(item) ?? -1));

          return (
            <View key={source} style={styles.sourceSection}>
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

              {categoryEntries.map(([category, categoryItems]) => (
                <OnboardingCategorySection
                  key={category}
                  category={category}
                  categoryItems={categoryItems}
                  selectedItems={selectedItems}
                  allItems={items}
                  itemIndexMap={itemIndexMap}
                  onToggleItem={toggleItem}
                  accentColor={config.accent}
                />
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
