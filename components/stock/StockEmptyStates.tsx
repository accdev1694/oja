import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassScreen,
  SimpleHeader,
  SkeletonPantryItem,
  EmptyPantry,
  colors,
} from "@/components/ui/glass";
import { TypewriterHint } from "@/components/pantry";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { stockStyles as styles } from "./stockStyles";

// =============================================================================
// LOADING SKELETON
// =============================================================================

export function StockLoadingSkeleton() {
  const { firstName } = useCurrentUser();
  return (
    <GlassScreen edges={["top"]}>
      <SimpleHeader title={firstName ? `${firstName}'s Stock` : "My Stock"} subtitle="What you have at home · Loading..." accentColor={colors.semantic.pantry} />
      <View style={styles.skeletonContainer}>
        <View style={styles.skeletonSection}>
          <View style={styles.skeletonSectionHeader}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonBadge} />
          </View>
          <SkeletonPantryItem />
          <SkeletonPantryItem />
          <SkeletonPantryItem />
        </View>
        <View style={styles.skeletonSection}>
          <View style={styles.skeletonSectionHeader}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonBadge} />
          </View>
          <SkeletonPantryItem />
          <SkeletonPantryItem />
        </View>
      </View>
    </GlassScreen>
  );
}

// =============================================================================
// EMPTY PANTRY
// =============================================================================

export function StockEmptyPantry() {
  const { firstName } = useCurrentUser();
  return (
    <GlassScreen edges={["top"]}>
      <SimpleHeader title={firstName ? `${firstName}'s Stock` : "My Stock"} subtitle="What you have at home · 0 items" accentColor={colors.semantic.pantry} />
      <View style={styles.emptyContainer}>
        <EmptyPantry />
      </View>
    </GlassScreen>
  );
}

// =============================================================================
// LIST HEADER CONTENT (no results / all stocked / swipe hint)
// =============================================================================

interface StockListHeaderProps {
  filteredCount: number;
  viewMode: "attention" | "all";
  hasExpandedCategory: boolean;
  searchQuery: string;
}

export const StockListHeader = React.memo(function StockListHeader({
  filteredCount,
  viewMode,
  hasExpandedCategory,
  searchQuery,
}: StockListHeaderProps) {
  if (filteredCount === 0) {
    // Active search with no results
    if (searchQuery.trim()) {
      return (
        <View style={styles.attentionEmptyContainer}>
          <MaterialCommunityIcons
            name="magnify-close"
            size={64}
            color={colors.text.tertiary}
          />
          <Text style={styles.attentionEmptyTitle}>No items found</Text>
          <Text style={styles.attentionEmptySubtitle}>
            Nothing matches &quot;{searchQuery.trim()}&quot;. Try a different search or check the other tab.
          </Text>
        </View>
      );
    }

    // No search, attention tab, genuinely empty
    if (viewMode === "attention") {
      return (
        <View style={styles.attentionEmptyContainer}>
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={64}
            color={colors.accent.success}
          />
          <Text style={styles.attentionEmptyTitle}>All stocked up!</Text>
          <Text style={styles.attentionEmptySubtitle}>
            Nothing needs restocking right now. Tap &quot;All Items&quot; to browse your full stock.
          </Text>
        </View>
      );
    }
  }

  return (
    <View style={styles.hintRow}>
      <TypewriterHint
        text={
          hasExpandedCategory
            ? "Swipe left/right to adjust stock level"
            : "Tap a category to see what\u2019s inside"
        }
      />
    </View>
  );
});
