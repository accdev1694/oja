import React, { useRef, useCallback } from "react";
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
import { getSafeIcon } from "@/lib/icons/iconMatcher";

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
  };
  onSwipeDecrease: (itemId: Id<"pantryItems">) => void;
  onSwipeIncrease: (itemId: Id<"pantryItems">) => void;
  onRemove: (itemId: Id<"pantryItems">) => void;
  onAddToList: (itemId: Id<"pantryItems">) => void;
}

function arePropsEqual(prev: PantryItemRowProps, next: PantryItemRowProps): boolean {
  return (
    prev.item._id === next.item._id &&
    prev.item.stockLevel === next.item.stockLevel &&
    prev.item.icon === next.item.icon &&
    prev.item.name === next.item.name &&
    prev.onSwipeDecrease === next.onSwipeDecrease &&
    prev.onSwipeIncrease === next.onSwipeIncrease &&
    prev.onRemove === next.onRemove &&
    prev.onAddToList === next.onAddToList
  );
}

export const PantryItemRow = React.memo(function PantryItemRow({
  item,
  onSwipeDecrease,
  onSwipeIncrease,
  onRemove,
  onAddToList,
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

  const stockLabel =
    item.stockLevel === "stocked"
      ? "Stocked"
      : item.stockLevel === "low"
        ? "Running low"
        : "Out of stock";

  return (
    <Animated.View
      exiting={FadeOut.duration(150)}
      style={styles.itemRowContainer}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View>
          <View collapsable={false}>
            <GlassCard style={styles.itemCard}>
              <GaugeIndicator level={item.stockLevel as StockLevel} size="small" />

              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.itemSubRow}>
                  <Text style={styles.stockLevelText}>{stockLabel}</Text>
                </View>
              </View>

              <AddToListButton onPress={handleAddToList} size="sm" />
              <RemoveButton onPress={handleRemove} size="sm" />
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
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.lg,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
    color: colors.text.primary,
  },
  stockLevelText: {
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 24,
    color: colors.text.tertiary,
  },
  itemSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
