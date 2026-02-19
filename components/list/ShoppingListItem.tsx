import { memo, useRef, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  GlassCard,
  GlassCircularCheckbox,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

import type { Id } from "@/convex/_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ListItem = {
  _id: Id<"listItems">;
  name: string;
  quantity: number;
  category?: string;
  estimatedPrice?: number;
  actualPrice?: number;
  isChecked: boolean;
  autoAdded?: boolean;
  priority?: "must-have" | "should-have" | "nice-to-have";
  // Size fields for display (e.g., "250g", "2pt")
  size?: string;
  unit?: string;
  // Phase 3: Size/Price Modal override tracking
  originalSize?: string;
  priceOverride?: boolean;
  sizeOverride?: boolean;
  priceSource?: "personal" | "crowdsourced" | "ai" | "manual";
};

// ─────────────────────────────────────────────────────────────────────────────
// Priority configuration
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  "must-have": {
    label: "Must",
    color: colors.semantic.danger,
    icon: "exclamation-thick" as const,
  },
  "should-have": {
    label: "Should",
    color: colors.accent.primary,
    icon: "check" as const,
  },
  "nice-to-have": {
    label: "Nice",
    color: colors.text.tertiary,
    icon: "heart-outline" as const,
  },
};

const PRIORITY_ORDER: ("must-have" | "should-have" | "nice-to-have")[] = [
  "must-have",
  "should-have",
  "nice-to-have",
];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface ShoppingListItemProps {
  item: ListItem;
  onToggle: (itemId: Id<"listItems">) => void;
  onRemove: (itemId: Id<"listItems">, itemName: string) => void;
  onEdit: (item: ListItem) => void;
  onPriorityChange: (itemId: Id<"listItems">, priority: "must-have" | "should-have" | "nice-to-have") => void;
  isShopping: boolean;
  onAddToList?: () => void;
  // Partner mode props
  isOwner?: boolean;
  commentCount?: number;
  onOpenComments?: (itemId: Id<"listItems">, itemName: string) => void;
  // Selection mode
  isSelected?: boolean;
  onSelectToggle?: (itemId: Id<"listItems">) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const ShoppingListItem = memo(function ShoppingListItem({
  item,
  onToggle,
  onRemove,
  onEdit,
  onPriorityChange,
  isShopping,
  onAddToList,
  isOwner,
  commentCount,
  onOpenComments,
  isSelected,
  onSelectToggle,
}: ShoppingListItemProps) {
  const translateX = useSharedValue(0);
  const checkFlash = useSharedValue(0);
  const prevCheckedRef = useRef(item.isChecked);

  // Celebration flash when item gets checked
  useEffect(() => {
    if (item.isChecked && !prevCheckedRef.current) {
      checkFlash.value = 1;
      checkFlash.value = withTiming(0, { duration: 600 });
    }
    prevCheckedRef.current = item.isChecked;
  }, [item.isChecked]);

  const currentPriority = item.priority || "should-have";
  const priorityConfig = PRIORITY_CONFIG[currentPriority];

  const triggerPriorityChange = useCallback((direction: "left" | "right") => {
    const currentIndex = PRIORITY_ORDER.indexOf(currentPriority);
    let newIndex: number;

    if (direction === "left") {
      newIndex = Math.min(currentIndex + 1, PRIORITY_ORDER.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }

    if (newIndex !== currentIndex) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPriorityChange(item._id, PRIORITY_ORDER[newIndex]);
    }
  }, [currentPriority, onPriorityChange, item._id]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate((event) => {
      // Clamp the translation
      translateX.value = Math.max(-80, Math.min(80, event.translationX));
    })
    .onEnd((event) => {
      const threshold = 50;

      if (event.translationX > threshold) {
        runOnJS(triggerPriorityChange)("right");
      } else if (event.translationX < -threshold) {
        runOnJS(triggerPriorityChange)("left");
      }

      translateX.value = withSpring(0, { damping: 15 });
    });

  // Only use pan gesture for priority swipes (tap is handled by Pressable)
  const composedGesture = panGesture;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
    ],
  }));

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 20 ? Math.min((translateX.value - 20) / 30, 1) : 0,
  }));

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? Math.min((-translateX.value - 20) / 30, 1) : 0,
  }));

  const checkFlashStyle = useAnimatedStyle(() => ({
    borderColor: checkFlash.value > 0
      ? `rgba(16, 185, 129, ${checkFlash.value * 0.6})`
      : "transparent",
    borderWidth: checkFlash.value > 0 ? 1.5 : 0,
  }));



  // Name already includes size (AI embeds it). Use as-is.
  const displayName = item.name;

  return (
    <View style={itemStyles.swipeContainer}>
      {/* Left action (increase priority) */}
      <Animated.View style={[itemStyles.swipeAction, itemStyles.swipeActionLeft, leftActionStyle]}>
        <MaterialCommunityIcons name="arrow-up-bold" size={20} color="#fff" />
        <Text style={itemStyles.swipeActionText}>Priority ↑</Text>
      </Animated.View>

      {/* Right action (decrease priority) */}
      <Animated.View style={[itemStyles.swipeAction, itemStyles.swipeActionRight, rightActionStyle]}>
        <Text style={itemStyles.swipeActionText}>Priority ↓</Text>
        <MaterialCommunityIcons name="arrow-down-bold" size={20} color="#fff" />
      </Animated.View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View style={animatedStyle}>
          <Animated.View style={[{ borderRadius: borderRadius.lg }, checkFlashStyle]}>
            <GlassCard
              variant="standard"
              style={[itemStyles.itemCard, item.isChecked && itemStyles.itemCardChecked]}
            >
              <View style={itemStyles.itemRow}>
                {/* Selection checkbox — planning mode only */}
                {!isShopping && (
                  <Pressable
                    onPress={() => onSelectToggle?.(item._id)}
                    style={itemStyles.selectionCheckbox}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                      size={16}
                      color={isSelected ? colors.accent.primary : colors.text.tertiary}
                    />
                  </Pressable>
                )}

                {/* Tappable area for checking off in shopping mode */}
                <Pressable
                  style={itemStyles.itemTappableArea}
                  onPress={
                    isShopping
                      ? () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onToggle(item._id);
                        }
                      : undefined
                  }
                  disabled={!isShopping}
                >
                  {/* Shopping mode checkbox — visible during shopping */}
                  {isShopping && (
                    <GlassCircularCheckbox
                      checked={item.isChecked}
                      onToggle={() => onToggle(item._id)}
                      size="md"
                    />
                  )}

                  {/* Item Name — tap to edit */}
                  <Pressable
                    style={itemStyles.itemPairLeft}
                    onPress={() => {
                      if (!item.isChecked) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onEdit(item);
                      }
                    }}
                    disabled={item.isChecked}
                  >
                    <Text
                      style={[itemStyles.itemName, item.isChecked && itemStyles.itemNameChecked]}
                      numberOfLines={1}
                    >
                      {displayName}
                    </Text>
                  </Pressable>

                  {/* Qty × Price */}
                  <View style={itemStyles.qtyPriceRow}>
                    <Text style={[itemStyles.itemQty, item.isChecked && itemStyles.itemPriceChecked]}>
                      {item.quantity}x
                    </Text>
                    <Text style={[itemStyles.itemPrice, item.isChecked && itemStyles.itemPriceChecked]}>
                      £{((item.actualPrice || item.estimatedPrice || 0) * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </Pressable>

                {/* Delete button */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onRemove(item._id, item.name);
                  }}
                  style={itemStyles.iconButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color={colors.semantic.danger}
                  />
                </Pressable>
              </View>
            </GlassCard>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
  return (
    prevProps.item === nextProps.item &&
    prevProps.onToggle === nextProps.onToggle &&
    prevProps.onRemove === nextProps.onRemove &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onPriorityChange === nextProps.onPriorityChange &&
    prevProps.isShopping === nextProps.isShopping &&
    prevProps.onAddToList === nextProps.onAddToList &&
    prevProps.isOwner === nextProps.isOwner &&
    prevProps.commentCount === nextProps.commentCount &&
    prevProps.onOpenComments === nextProps.onOpenComments &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onSelectToggle === nextProps.onSelectToggle
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const itemStyles = StyleSheet.create({
  // Swipe Container
  swipeContainer: {
    position: "relative",
    marginBottom: spacing.sm,
  },
  swipeAction: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  swipeActionLeft: {
    left: 0,
    backgroundColor: colors.semantic.success,
    borderRadius: borderRadius.lg,
  },
  swipeActionRight: {
    right: 0,
    backgroundColor: colors.text.tertiary,
    borderRadius: borderRadius.lg,
  },
  swipeActionText: {
    ...typography.labelSmall,
    color: "#fff",
    fontWeight: "600",
  },

  // Item Card
  itemCard: {
    // No marginBottom here, handled by swipeContainer
  },
  itemCardChecked: {
    opacity: 0.7,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  selectionCheckbox: {
    marginRight: 2,
  },
  itemTappableArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  itemPairLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  itemNameChecked: {
    textDecorationLine: "line-through",
    color: colors.text.tertiary,
  },
  iconButton: {
    padding: spacing.xs,
  },
  qtyPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemQty: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  itemPrice: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  itemPriceChecked: {
    color: colors.text.tertiary,
  },
});
