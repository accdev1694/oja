import React, { useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { GaugeIndicator, type StockLevel } from "./GaugeIndicator";

interface PantryItemCardProps {
  id: string;
  name: string;
  category: string;
  stockLevel: StockLevel;
  onSwipeDecrease: () => void;
  onSwipeIncrease?: () => void;
  onMeasure?: (x: number, y: number) => void;
}

/**
 * PantryItemCard - Individual pantry item with gauge indicator
 *
 * Features:
 * - Segmented gauge showing stock level
 * - Swipe left to decrease, right to increase (card stays still)
 * - Measures position for fly animation
 */
export function PantryItemCard({
  id,
  name,
  category,
  stockLevel,
  onSwipeDecrease,
  onSwipeIncrease,
  onMeasure,
}: PantryItemCardProps) {
  const cardRef = useRef<View>(null);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onEnd((e) => {
      if (e.translationX < -50) {
        runOnJS(onSwipeDecrease)();
      } else if (e.translationX > 50 && onSwipeIncrease) {
        runOnJS(onSwipeIncrease)();
      }
    });

  const getCategoryEmoji = (cat: string): string => {
    const emojiMap: Record<string, string> = {
      proteins: "\u{1F969}",
      dairy: "\u{1F95B}",
      grains: "\u{1F33E}",
      vegetables: "\u{1F96C}",
      fruits: "\u{1F34E}",
      beverages: "\u{1F964}",
      snacks: "\u{1F36A}",
      condiments: "\u{1F9C2}",
      frozen: "\u{1F9CA}",
      household: "\u{1F9F9}",
      other: "\u{1F4E6}",
    };
    return emojiMap[cat.toLowerCase()] || "\u{1F4E6}";
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
      <GestureDetector gesture={panGesture}>
        <Animated.View>
          <View ref={cardRef} collapsable={false} style={styles.card}>
            {/* Gauge indicator */}
            <GaugeIndicator level={stockLevel} size="small" />

            {/* Item info */}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {getCategoryEmoji(category)} {name}
              </Text>
              <Text style={styles.levelText}>
                {stockLevel === "stocked" && "Stocked"}
                {stockLevel === "low" && "Running low"}
                {stockLevel === "out" && "Out of stock"}
              </Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2D3436",
    marginBottom: 2,
  },
  levelText: {
    fontSize: 12,
    color: "#636E72",
  },
});
