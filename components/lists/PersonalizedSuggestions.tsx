import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, typography, spacing, borderRadius, GlassCard } from "@/components/ui/glass";
import * as Haptics from "expo-haptics";
import { Id } from "@/convex/_generated/dataModel";

interface PersonalizedSuggestionsProps {
  activeListId?: Id<"shoppingLists">;
  onItemAdded?: () => void;
}

export const PersonalizedSuggestions = ({ activeListId, onItemAdded }: PersonalizedSuggestionsProps) => {
  const suggestions = useQuery(api.personalization.getBuyItAgainSuggestions, {});
  const addItem = useMutation(api.listItems.create);

  if (!suggestions || suggestions.length === 0) return null;

  const handleAdd = async (item: any) => {
    if (!activeListId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await addItem({
        listId: activeListId,
        name: item.name,
        quantity: item.quantity,
        size: item.size,
        unit: item.unit,
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {suggestions.map((item, index) => (
          <GlassCard key={index} style={styles.card} variant="standard">
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemMeta}>Bought {item.quantity} last week</Text>
            <Pressable 
              style={({ pressed }) => [
                styles.addButton, 
                pressed && { opacity: 0.7 },
                !activeListId && { opacity: 0.5 }
              ]}
              onPress={() => handleAdd(item)}
              disabled={!activeListId}
            >
              <MaterialCommunityIcons name="plus" size={14} color={colors.accent.primary} />
              <Text style={styles.addButtonText}>Buy again</Text>
            </Pressable>
          </GlassCard>
        ))}
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
