import React, { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeOut, runOnJS } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";

import {
  GaugeIndicator,
  type StockLevel,
} from "@/components/pantry";
import { GlassCard, colors, spacing, borderRadius } from "@/components/ui/glass";
import { RemoveButton } from "@/components/ui/RemoveButton";
import { AddToListButton } from "@/components/ui/AddToListButton";

/**
 * Format size display for items
 * Returns formatted size string or null if no size data
 * Examples: "250g", "2pt", "500ml"
 */
function formatSize(size?: string, unit?: string): string | null {
  if (!size) return null;
  // If size already includes unit (e.g., "2pt", "500ml", "250g"), return as-is
  if (/\d+\s*(ml|l|g|kg|pt|pint|oz|lb)/i.test(size)) return size;
  // Otherwise combine: "2" + "pint" → "2pint" or abbreviate common units
  if (unit) {
    // Abbreviate common units for cleaner display
    const unitAbbr: Record<string, string> = {
      pint: "pt",
      pints: "pt",
      litre: "L",
      litres: "L",
      liter: "L",
      liters: "L",
      gram: "g",
      grams: "g",
      kilogram: "kg",
      kilograms: "kg",
      millilitre: "ml",
      millilitres: "ml",
      milliliter: "ml",
      milliliters: "ml",
      ounce: "oz",
      ounces: "oz",
      pound: "lb",
      pounds: "lb",
    };
    const abbr = unitAbbr[unit.toLowerCase()] || unit;
    return `${size}${abbr}`;
  }
  return size;
}

export interface PantryItemRowProps {
  item: {
    _id: Id<"pantryItems">;
    name: string;
    category: string;
    stockLevel: string;
    icon?: string;
    lastPrice?: number;
    priceSource?: string;
    lastStoreName?: string;
    defaultSize?: string;
    defaultUnit?: string;
    preferredVariant?: string;
    pinned?: boolean;
    purchaseCount?: number;
    status?: string;
  };
  onSwipeDecrease: (itemId: Id<"pantryItems">) => void;
  onSwipeIncrease: (itemId: Id<"pantryItems">) => void;
  onRemove: (itemId: Id<"pantryItems">) => void;
  onAddToList: (itemId: Id<"pantryItems">) => void;
  onLongPress?: (itemId: Id<"pantryItems">) => void;
  /** Show muted/archived appearance (for archived items in search) */
  isArchivedResult?: boolean;
}

function arePropsEqual(prev: PantryItemRowProps, next: PantryItemRowProps): boolean {
  return (
    prev.item._id === next.item._id &&
    prev.item.stockLevel === next.item.stockLevel &&
    prev.item.icon === next.item.icon &&
    prev.item.name === next.item.name &&
    prev.item.defaultSize === next.item.defaultSize &&
    prev.item.defaultUnit === next.item.defaultUnit &&
    prev.item.lastPrice === next.item.lastPrice &&
    prev.item.priceSource === next.item.priceSource &&
    prev.item.pinned === next.item.pinned &&
    prev.item.purchaseCount === next.item.purchaseCount &&
    prev.item.status === next.item.status &&
    prev.isArchivedResult === next.isArchivedResult &&
    prev.onSwipeDecrease === next.onSwipeDecrease &&
    prev.onSwipeIncrease === next.onSwipeIncrease &&
    prev.onRemove === next.onRemove &&
    prev.onAddToList === next.onAddToList &&
    prev.onLongPress === next.onLongPress
  );
}

export const PantryItemRow = React.memo(function PantryItemRow({
  item,
  onSwipeDecrease,
  onSwipeIncrease,
  onRemove,
  onAddToList,
  onLongPress,
  isArchivedResult,
}: PantryItemRowProps) {
  const handleSwipeDecrease = useCallback(() => {
    onSwipeDecrease(item._id);
  }, [item._id, onSwipeDecrease]);

  const handleSwipeIncrease = useCallback(() => {
    onSwipeIncrease(item._id);
  }, [item._id, onSwipeIncrease]);

  const handleRemove = useCallback(() => {
    onRemove(item._id);
  }, [item._id, onRemove]);

  const handleAddToList = useCallback(() => {
    onAddToList(item._id);
  }, [item._id, onAddToList]);

  const handleLongPress = useCallback(() => {
    onLongPress?.(item._id);
  }, [item._id, onLongPress]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onEnd((e) => {
      if (e.translationX < -50) {
        runOnJS(handleSwipeDecrease)();
      } else if (e.translationX > 50) {
        runOnJS(handleSwipeIncrease)();
      }
    });

  // Long-press gesture
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onEnd((_e, success) => {
      if (success && onLongPress) {
        runOnJS(handleLongPress)();
      }
    });

  // Compose pan + long-press (simultaneous so both can fire)
  const composedGesture = onLongPress
    ? Gesture.Race(longPressGesture, panGesture)
    : panGesture;

  const isArchived = isArchivedResult || item.status === "archived";
  const isPinned = item.pinned === true;
  const isEssential = isPinned || (item.purchaseCount ?? 0) >= 3;

  const stockLabel =
    item.stockLevel === "stocked"
      ? "Stocked"
      : item.stockLevel === "low"
        ? "Running low"
        : "Out of stock";

  // Format display name with size if available — but skip if the name already
  // contains the size (e.g. AI returns "12pk Free Range Eggs" with size "12 pack")
  const sizeDisplay = formatSize(item.defaultSize, item.defaultUnit);
  const nameAlreadyHasSize = sizeDisplay
    ? item.name.toLowerCase().includes(sizeDisplay.toLowerCase()) ||
      // Also check raw numeric portion — "12pk" in name covers size "12pack"/"12 pack"
      (/^\d+/.test(sizeDisplay) &&
        item.name.match(new RegExp(`\\b${sizeDisplay.match(/^\d+/)?.[0]}\\s*(?:pk|pack|x)?\\b`, "i")) !== null)
    : false;
  const displayName =
    sizeDisplay && !nameAlreadyHasSize ? `${item.name} (${sizeDisplay})` : item.name;

  return (
    <Animated.View
      exiting={FadeOut.duration(150)}
      style={[styles.itemRowContainer, isArchived && styles.archivedRowContainer]}
    >
      <GestureDetector gesture={composedGesture}>
        <Animated.View>
          <View collapsable={false}>
            <GlassCard style={[styles.itemCard, isArchived && styles.archivedCard]}>
              <GaugeIndicator level={item.stockLevel as StockLevel} size="small" />

              <View style={styles.itemInfo}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.itemName, isArchived && styles.archivedText]}
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                  {isPinned && (
                    <MaterialCommunityIcons
                      name="pin"
                      size={14}
                      color={colors.accent.primary}
                      style={styles.pinIcon}
                    />
                  )}
                </View>
                <View style={styles.itemSubRow}>
                  <Text style={[styles.stockLevelText, isArchived && styles.archivedSubText]}>
                    {isArchived ? "Archived" : stockLabel}
                  </Text>
                  {!isArchived && item.lastPrice != null && (
                    <Text style={styles.priceEstimate}>
                      £{item.lastPrice.toFixed(2)}
                      {item.priceSource !== "receipt" && " est."}
                    </Text>
                  )}
                  {isArchived && (
                    <View style={styles.archivedBadge}>
                      <MaterialCommunityIcons
                        name="archive-outline"
                        size={10}
                        color={colors.text.tertiary}
                      />
                      <Text style={styles.archivedBadgeText}>Archived</Text>
                    </View>
                  )}
                  {!isArchived && isEssential && !isPinned && (
                    <View style={styles.frequentBadge}>
                      <Text style={styles.frequentBadgeText}>Frequent</Text>
                    </View>
                  )}
                  {!isArchived && (
                    <View style={styles.actionButtons}>
                      <AddToListButton onPress={handleAddToList} size="sm" />
                      <RemoveButton onPress={handleRemove} size="sm" />
                    </View>
                  )}
                </View>
              </View>
            </GlassCard>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}, arePropsEqual);

const styles = StyleSheet.create({
  itemRowContainer: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  archivedRowContainer: {
    opacity: 0.55,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    gap: spacing.lg,
  },
  archivedCard: {
    borderStyle: "dashed" as const,
    borderColor: colors.glass.border,
  },
  itemInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemName: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
    color: colors.text.primary,
    flexShrink: 1,
  },
  archivedText: {
    color: colors.text.tertiary,
  },
  pinIcon: {
    marginLeft: 2,
  },
  priceEstimate: {
    fontSize: 12,
    fontStyle: "italic",
    color: colors.accent.primary,
  },
  stockLevelText: {
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 24,
    color: colors.text.tertiary,
  },
  archivedSubText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  itemSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
  archivedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: `${colors.text.tertiary}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  archivedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  frequentBadge: {
    backgroundColor: `${colors.accent.primary}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  frequentBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.accent.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
