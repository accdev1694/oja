import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, typography, spacing, borderRadius, GlassCard } from "@/components/ui/glass";
import * as Haptics from "expo-haptics";
import { Id } from "@/convex/_generated/dataModel";
import { cleanItemForStorage, formatItemDisplay } from "@/convex/lib/itemNameParser";

interface PersonalizedSuggestionsProps {
  activeListId?: Id<"shoppingLists">;
  onItemAdded?: () => void;
}

interface SuggestionItem {
  name: string;
  quantity: number;
  lastPrice: number;
  purchaseDate: number;
  size?: string;
  unit?: string;
}

export const PersonalizedSuggestions = ({ activeListId, onItemAdded }: PersonalizedSuggestionsProps) => {
  const suggestions = useQuery(api.personalization.getBuyItAgainSuggestions, {}) as SuggestionItem[] | undefined;
  const addItem = useMutation(api.listItems.create);

  if (!suggestions || suggestions.length === 0) return null;

  const getDaysAgoText = (purchaseDate: number) => {
    const days = Math.floor((Date.now() - purchaseDate) / (24 * 60 * 60 * 1000));
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days === 7) return "last week";
    return `${days} days ago`;
  };

  const handleAdd = async (item: SuggestionItem) => {
    if (!activeListId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Use centralized parser to clean name and size
    const cleaned = cleanItemForStorage(item.name, item.size, item.unit);

    try {
      await addItem({
        listId: activeListId,
        name: cleaned.name,
        quantity: item.quantity,
        size: cleaned.size,
        unit: cleaned.unit,
        estimatedPrice: item.lastPrice,
        priceSource: "personal",
        priority: "should-have",
      });
      onItemAdded?.();
    } catch (e) {
      console.error("Failed to add suggested item", e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Suggested for you</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="always"
      >
        {suggestions.map((item, index) => {
          // Use centralized formatter for consistent display
          const cleaned = cleanItemForStorage(item.name, item.size, item.unit);
          const fullDisplayName = formatItemDisplay(cleaned.name, cleaned.size, cleaned.unit);

          return (
            <Pressable
              key={index}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={({ pressed }) => [
                styles.cardPressable,
                pressed && { opacity: 0.9 }
              ]}
            >
              <GlassCard
                style={styles.card}
                variant="standard"
              >
                <Text style={styles.itemName} numberOfLines={1}>{fullDisplayName}</Text>
                <Text style={styles.itemMeta}>Bought {item.quantity} {getDaysAgoText(item.purchaseDate)}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.addButton,
                    pressed && { opacity: 0.7 },
                    !activeListId && { opacity: 0.5 }
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleAdd(item);
                  }}
                  disabled={!activeListId}
                >
                  <MaterialCommunityIcons name="plus" size={14} color={colors.accent.primary} />
                  <Text style={styles.addButtonText}>Buy again</Text>
                </Pressable>
              </GlassCard>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  title: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  cardPressable: {
    borderRadius: borderRadius.lg,
  },
  card: {
    width: 160,
    padding: spacing.md,
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "700",
  },
  itemMeta: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
    marginBottom: spacing.md,
    fontSize: 11,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 212, 170, 0.1)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(0, 212, 170, 0.2)",
  },
  addButtonText: {
    ...typography.labelSmall,
    color: colors.accent.primary,
    fontWeight: "700",
    fontSize: 11,
  },
});
