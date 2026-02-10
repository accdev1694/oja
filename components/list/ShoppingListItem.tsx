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
import { getIconForItem } from "@/lib/icons/iconMatcher";
import type { Id } from "@/convex/_generated/dataModel";

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
  approvalStatus?: "pending" | "approved" | "rejected";
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

const PRIORITY_ORDER: Array<"must-have" | "should-have" | "nice-to-have"> = [
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
  canApprove?: boolean;
  commentCount?: number;
  onApprove?: (itemId: Id<"listItems">) => void;
  onReject?: (itemId: Id<"listItems">) => void;
  onOpenComments?: (itemId: Id<"listItems">, itemName: string) => void;
  // Selection props (checkboxes always visible)
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
  canApprove,
  commentCount,
  onApprove,
  onReject,
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

  const iconResult = getIconForItem(item.name, item.category || "other");

  // Format display name with size if available
  const sizeDisplay = formatSize(item.size, item.unit);
  const displayName = sizeDisplay ? `${item.name} (${sizeDisplay})` : item.name;

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
              style={[itemStyles.itemCard, item.isChecked && itemStyles.itemCardChecked, item.approvalStatus === "pending" && itemStyles.itemCardPending]}
            >
              <View style={itemStyles.itemRow}>
                {/* Selection checkbox — only in planning mode (hidden during shopping to avoid conflict with shopping checkbox) */}
                {!isShopping && (
                  <Pressable
                    onPress={() => onSelectToggle?.(item._id)}
                    style={itemStyles.selectionCheckbox}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                      size={22}
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

                  {/* Pair 1: Icon + Name */}
                  <View style={itemStyles.itemPairLeft}>
                    <MaterialCommunityIcons
                      name={iconResult.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                      size={18}
                      color={item.isChecked ? colors.text.tertiary : colors.text.secondary}
                    />
                    <Text
                      style={[itemStyles.itemName, item.isChecked && itemStyles.itemNameChecked]}
                      numberOfLines={1}
                    >
                      {displayName}
                    </Text>
                  </View>

                  {/* Pair 2: Qty + Price */}
                  <View style={itemStyles.itemPairCenter}>
                    <Text style={[itemStyles.quantityText, item.isChecked && itemStyles.quantityTextChecked]}>
                      ×{item.quantity}
                    </Text>
                    <Text style={[itemStyles.itemPrice, item.isChecked && itemStyles.itemPriceChecked]}>
                      £{((item.actualPrice || item.estimatedPrice || 0) * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                </Pressable>

                {/* Pair 3: Edit + Delete */}
                <View style={itemStyles.itemPairRight}>
                  {!item.isChecked && (
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onEdit(item);
                      }}
                      style={itemStyles.iconButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={18}
                        color={colors.text.tertiary}
                      />
                    </Pressable>
                  )}
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
    prevProps.canApprove === nextProps.canApprove &&
    prevProps.commentCount === nextProps.commentCount &&
    prevProps.onApprove === nextProps.onApprove &&
    prevProps.onReject === nextProps.onReject &&
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
    marginBottom: spacing.xs,
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
  itemCardPending: {
    opacity: 0.6,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 1,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectionCheckbox: {
    marginRight: spacing.xs,
  },
  itemTappableArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemPairLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemPairCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  itemPairRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
  quantityText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  quantityTextChecked: {
    color: colors.text.tertiary,
  },
  itemPrice: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  itemPriceChecked: {
    color: colors.text.tertiary,
  },
});
