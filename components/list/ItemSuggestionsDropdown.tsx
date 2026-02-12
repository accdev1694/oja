import React, { memo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "@/lib/design/glassTokens";
import { haptic } from "@/lib/haptics/safeHaptics";
import type { ItemSuggestion } from "@/hooks/useItemSuggestions";

interface ItemSuggestionsDropdownProps {
  suggestions: ItemSuggestion[];
  isLoading: boolean;
  onSelect: (suggestion: ItemSuggestion) => void;
  onDismiss: () => void;
  visible: boolean;
  existingItemNames?: string[];
}

const STOCK_COLORS: Record<string, string> = {
  stocked: colors.accent.success,
  low: colors.accent.warning,
  out: colors.accent.error,
};

function formatPrice(price: number | undefined): string {
  if (price === undefined || price === null) return "";
  return `£${price.toFixed(2)}`;
}

const SuggestionRow = memo(function SuggestionRow({
  item,
  onSelect,
  isInList,
}: {
  item: ItemSuggestion;
  onSelect: () => void;
  isInList: boolean;
}) {
  const handlePress = () => {
    haptic("light");
    onSelect();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.rowLeft}>
        <Text
          style={[styles.itemName, isInList && styles.itemNameDimmed]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {isInList && <Text style={styles.inListBadge}>in list</Text>}
        {item.source === "pantry" && item.stockLevel && (
          <View
            style={[
              styles.stockDot,
              {
                backgroundColor:
                  STOCK_COLORS[item.stockLevel] ?? colors.text.disabled,
              },
            ]}
          />
        )}
      </View>

      <View style={styles.rowRight}>
        {item.estimatedPrice !== undefined && (
          <Text style={styles.price}>
            {item.priceSource === "ai" ? "~" : ""}
            {formatPrice(item.estimatedPrice)}
          </Text>
        )}
        {item.storeName && (
          <Text style={styles.storeName} numberOfLines={1}>
            {item.storeName}
          </Text>
        )}
        {item.size && (
          <Text style={styles.sizeLabel} numberOfLines={1}>
            {item.size}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

export const ItemSuggestionsDropdown = memo(function ItemSuggestionsDropdown({
  suggestions,
  isLoading,
  onSelect,
  visible,
  existingItemNames,
}: ItemSuggestionsDropdownProps) {
  if (!visible) return null;

  const existingSet = new Set(
    (existingItemNames ?? []).map((n) => n.toLowerCase().trim())
  );

  const pantrySuggestions = suggestions.filter((s) => s.source === "pantry");
  const knownSuggestions = suggestions.filter(
    (s) => s.source === "known" || s.source === "variant"
  );

  const hasResults = pantrySuggestions.length > 0 || knownSuggestions.length > 0;

  if (!isLoading && !hasResults) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {isLoading && !hasResults && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.text.tertiary} />
          </View>
        )}

        {pantrySuggestions.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Your pantry</Text>
            {pantrySuggestions.map((item) => (
              <SuggestionRow
                key={`pantry-${item.name}`}
                item={item}
                onSelect={() => onSelect(item)}
                isInList={existingSet.has(item.name.toLowerCase().trim())}
              />
            ))}
          </>
        )}

        {knownSuggestions.length > 0 && (
          <>
            {pantrySuggestions.length > 0 && (
              <View style={styles.divider} />
            )}
            <Text style={styles.sectionHeader}>Known items</Text>
            {knownSuggestions.map((item) => (
              <SuggestionRow
                key={`known-${item.name}-${item.source}`}
                item={item}
                onSelect={() => onSelect(item)}
                isInList={existingSet.has(item.name.toLowerCase().trim())}
              />
            ))}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glass.backgroundStrong,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    maxHeight: 280,
    overflow: "hidden",
  },
  scrollView: {
    flexGrow: 0,
  },
  loadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  sectionHeader: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.glass.backgroundHover,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: spacing.sm,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  itemName: {
    ...typography.bodySmall,
    color: colors.text.primary,
    flexShrink: 1,
  },
  itemNameDimmed: {
    color: colors.text.tertiary,
  },
  inListBadge: {
    ...typography.labelSmall,
    color: colors.text.disabled,
    marginLeft: spacing.xs,
    fontSize: 10,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: spacing.xs,
  },
  price: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    fontWeight: "600",
  },
  storeName: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    maxWidth: 60,
    fontSize: 10,
  },
  sizeLabel: {
    ...typography.labelSmall,
    color: colors.text.disabled,
    fontSize: 10,
  },
});
