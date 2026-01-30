import React, { useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, { FadeIn, FadeOut, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { GaugeIndicator, type StockLevel } from "./GaugeIndicator";

interface PantryItemCardProps {
  id: string;
  name: string;
  category: string;
  stockLevel: StockLevel;
  onLongPress: () => void;
  onSwipeDecrease: () => void;
  onSwipeIncrease?: () => void;
  onMeasure?: (x: number, y: number) => void;
}

/**
 * PantryItemCard - Individual pantry item with gauge indicator
 *
 * Features:
 * - Animated gauge needle showing stock level
 * - Long-press to open stock picker
 * - Swipe left to decrease, right to increase (card stays still)
 * - Measures position for fly animation
 */
export function PantryItemCard({
  id,
  name,
  category,
  stockLevel,
  onLongPress,
  onSwipeDecrease,
  onSwipeIncrease,
  onMeasure,
}: PantryItemCardProps) {
  const cardRef = useRef<View>(null);

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (cardRef.current && onMeasure) {
      cardRef.current.measure((x, y, width, height, pageX, pageY) => {
        onMeasure(pageX + width / 2, pageY + height / 2);
      });
    }

    onLongPress();
  };

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

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      runOnJS(handleLongPress)();
    });

  const composedGesture = Gesture.Race(panGesture, longPressGesture);

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
      <GestureDetector gesture={composedGesture}>
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
                {stockLevel === "stocked" && "Fully stocked"}
                {stockLevel === "good" && "Good supply"}
                {stockLevel === "half" && "Half stocked"}
                {stockLevel === "low" && "Running low"}
                {stockLevel === "out" && "Out of stock"}
              </Text>
            </View>

            {/* Hold indicator */}
            <View style={styles.holdHint}>
              <Text style={styles.holdHintText}>Hold</Text>
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
    gap: 12,
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
  holdHint: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  holdHintText: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
