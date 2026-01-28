import React, { useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LiquidFillIndicator, StockLevel } from "./LiquidFillIndicator";

interface PantryItemCardProps {
  id: string;
  name: string;
  category: string;
  stockLevel: StockLevel;
  onLongPress: () => void;
  onSwipeDecrease: () => void;
  onMeasure?: (x: number, y: number) => void;
}

/**
 * PantryItemCard - Individual pantry item with liquid fill indicator
 *
 * Features:
 * - Animated liquid fill showing stock level
 * - Long-press to open stock picker
 * - Swipe left to decrease stock
 * - Measures position for fly animation
 */
export function PantryItemCard({
  id,
  name,
  category,
  stockLevel,
  onLongPress,
  onSwipeDecrease,
  onMeasure,
}: PantryItemCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const cardRef = useRef<View>(null);

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Measure position for potential fly animation
    if (cardRef.current && onMeasure) {
      cardRef.current.measure((x, y, width, height, pageX, pageY) => {
        onMeasure(pageX + width / 2, pageY + height / 2);
      });
    }

    onLongPress();
  };

  const handleSwipeOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSwipeDecrease();
    // Close swipeable after action
    setTimeout(() => {
      swipeableRef.current?.close();
    }, 300);
  };

  const renderRightActions = () => (
    <View style={styles.swipeAction}>
      <Text style={styles.swipeActionText}>-1</Text>
      <Text style={styles.swipeActionSubtext}>Stock</Text>
    </View>
  );

  const getCategoryEmoji = (cat: string): string => {
    const emojiMap: Record<string, string> = {
      proteins: "🥩",
      dairy: "🥛",
      grains: "🌾",
      vegetables: "🥬",
      fruits: "🍎",
      beverages: "🥤",
      snacks: "🍪",
      condiments: "🧂",
      frozen: "🧊",
      household: "🧹",
      other: "📦",
    };
    return emojiMap[cat.toLowerCase()] || "📦";
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        onSwipeableOpen={handleSwipeOpen}
        overshootRight={false}
        rightThreshold={80}
      >
        <TouchableOpacity
          ref={cardRef}
          style={styles.card}
          onLongPress={handleLongPress}
          delayLongPress={400}
          activeOpacity={0.7}
        >
          {/* Liquid fill indicator */}
          <LiquidFillIndicator level={stockLevel} size="small" showWave={false} />

          {/* Item info */}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {getCategoryEmoji(category)} {name}
            </Text>
            <Text style={styles.levelText}>
              {stockLevel === "stocked" && "Fully stocked"}
              {stockLevel === "good" && "Good supply"}
              {stockLevel === "low" && "Running low"}
              {stockLevel === "out" && "Out of stock"}
            </Text>
          </View>

          {/* Hold indicator */}
          <View style={styles.holdHint}>
            <Text style={styles.holdHintText}>Hold</Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
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
  swipeAction: {
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginBottom: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  swipeActionText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  swipeActionSubtext: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "500",
  },
});
