import { memo, useRef, useEffect, useCallback, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { haptic } from "@/lib/haptics/safeHaptics";
import {
  GlassCard,
  GlassCircularCheckbox,
  colors,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { formatPrice } from "@/lib/currency/currencyUtils";
import { formatItemDisplay } from "@/convex/lib/itemNameParser";
import { styles } from "./shopping-list-item/styles";
import { ItemSwipeActions } from "./shopping-list-item/ItemSwipeActions";

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
  canEdit?: boolean;
  onAddToList?: () => void;
  // Partner mode props
  isOwner?: boolean;
  commentCount?: number;
  onOpenComments?: (itemId: Id<"listItems">, itemName: string) => void;
  // Selection mode
  selectionActive?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (itemId: Id<"listItems">) => void;
  // Currency
  currency?: string;
  // Failed toggle indicator
  hasFailed?: boolean;
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
  canEdit = true,
  onAddToList,
  isOwner,
  commentCount,
  onOpenComments,
  selectionActive,
  isSelected,
  onSelectToggle,
  currency = "GBP",
  hasFailed = false,
}: ShoppingListItemProps) {
  const translateX = useSharedValue(0);
  const shakeX = useSharedValue(0);

  const currentPriority = item.priority || "should-have";

  // Shake animation for failed toggles
  useEffect(() => {
    if (hasFailed) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [hasFailed, shakeX]);

  // ── Unified press handlers ──────────────────────────────────────────────
  const handlePress = useCallback(() => {
    if (selectionActive) {
      // Selection mode: tap = toggle selection
      haptic("light");
      onSelectToggle?.(item._id);
      return;
    }

    if (isShopping) {
      // Shopping: tap = check off
      if (canEdit) {
        // Snappy haptic and immediate toggle
        haptic("medium");
        onToggle(item._id);
      }
    } else {
      // Planning: tap = edit
      if (canEdit && !item.isChecked) {
        haptic("light");
        onEdit(item);
      }
    }
  }, [selectionActive, isShopping, canEdit, item._id, item.isChecked, onToggle, onEdit, onSelectToggle]);

  const handleLongPress = useCallback(() => {
    // Both modes: long press = toggle selection
    haptic("medium");
    onSelectToggle?.(item._id);
  }, [item._id, onSelectToggle]);

  // ── Priority swipe (planning mode only) ─────────────────────────────────
  const triggerPriorityChange = useCallback((direction: "left" | "right") => {
    const currentIndex = PRIORITY_ORDER.indexOf(currentPriority);
    let newIndex: number;

    if (direction === "left") {
      newIndex = Math.min(currentIndex + 1, PRIORITY_ORDER.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }

    if (newIndex !== currentIndex) {
      haptic("medium");
      onPriorityChange(item._id, PRIORITY_ORDER[newIndex]);
    }
  }, [currentPriority, onPriorityChange, item._id]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .enabled(canEdit && !isShopping)
    .onUpdate((event) => {
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value + shakeX.value },
    ],
  }));

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 20 ? Math.min((translateX.value - 20) / 30, 1) : 0,
  }));

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? Math.min((-translateX.value - 20) / 30, 1) : 0,
  }));

  // Build display name with size/weight at the beginning
  const displayName = useMemo(() => {
    return formatItemDisplay(item.name, item.size, item.unit);
  }, [item.name, item.size, item.unit]);


  // Selected state background tint (planning mode)
  const selectedTint = isSelected
    ? { backgroundColor: `${colors.accent.primary}15` }
    : undefined;

  return (
    <View style={styles.swipeContainer}>
      <ItemSwipeActions 
        isShopping={isShopping}
        leftActionStyle={leftActionStyle}
        rightActionStyle={rightActionStyle}
      />

      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <View style={{ borderRadius: borderRadius.lg }}>
            <GlassCard
              variant="standard"
              style={[styles.itemCard, selectedTint, item.isChecked && styles.itemCardChecked]}
            >
              <Pressable
                style={styles.itemRow}
                onPress={handlePress}
                onLongPress={handleLongPress}
                delayLongPress={400}
                android_ripple={{ color: `${colors.accent.primary}20` }}
              >
                {/* Checkbox — visible in selection mode OR shopping mode (not in planning) */}
                {(selectionActive || (isShopping && !selectionActive)) && (
                  <GlassCircularCheckbox
                    checked={selectionActive ? !!isSelected : item.isChecked}
                    size="xs"
                    style={{ marginRight: spacing.xs }}
                    onToggle={handlePress}
                  />
                )}

                {/* Item details: Two-line layout */}
                <View style={styles.itemDetailsColumn}>
                  {/* Line 1: Item name + Failed indicator + Edit button */}
                  <View style={styles.nameRow}>
                    <Text
                      style={[styles.itemName, item.isChecked && styles.itemNameChecked]}
                      numberOfLines={1}
                    >
                      {displayName}
                    </Text>

                    {/* Failed toggle indicator */}
                    {hasFailed && (
                      <View style={styles.failedIndicator}>
                        <MaterialCommunityIcons
                          name="alert-circle"
                          size={16}
                          color={colors.semantic.danger}
                        />
                      </View>
                    )}

                    {/* Edit button — visible in both shopping and planning modes (not in selection mode) */}
                    {canEdit && !selectionActive && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          haptic("light");
                          onEdit(item);
                        }}
                        style={styles.iconButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={18}
                          color={colors.text.tertiary}
                        />
                      </Pressable>
                    )}
                  </View>

                  {/* Line 2: Price info + Comment button */}
                  <View style={styles.priceRowWithActions}>
                    {/* Price info */}
                    <View style={styles.priceInfo}>
                      <Text style={[styles.itemQtyLabel, item.isChecked && styles.itemPriceChecked]}>
                        Qty {item.quantity}
                      </Text>
                      <Text style={[styles.bulletSeparator, item.isChecked && styles.itemPriceChecked]}>
                        •
                      </Text>
                      <Text style={[styles.itemQty, item.isChecked && styles.itemPriceChecked]}>
                        {formatPrice(item.actualPrice || item.estimatedPrice || 0, currency)} each
                      </Text>
                      <Text style={[styles.bulletSeparator, item.isChecked && styles.itemPriceChecked]}>
                        •
                      </Text>
                      <Text style={[styles.itemQtyLabel, item.isChecked && styles.itemPriceChecked]}>
                        Total
                      </Text>
                      <Text style={[styles.itemPrice, item.isChecked && styles.itemPriceChecked]}>
                        {formatPrice((item.actualPrice || item.estimatedPrice || 0) * item.quantity, currency)}
                      </Text>
                    </View>

                    {/* Comment button — visible when partner mode is active */}
                    {onOpenComments && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          haptic("light");
                          onOpenComments(item._id, item.name);
                        }}
                        style={styles.iconButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <View>
                          <MaterialCommunityIcons
                            name="comment-outline"
                            size={18}
                            color={colors.text.tertiary}
                          />
                          {(commentCount ?? 0) > 0 && (
                            <View style={styles.commentBadge}>
                              <Text style={styles.commentBadgeText}>
                                {commentCount! > 9 ? "9+" : commentCount}
                              </Text>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    )}

                    {/* Delete button — visible in both shopping and planning modes (not in selection mode) */}
                    {canEdit && !selectionActive && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          haptic("light");
                          onRemove(item._id, item.name);
                        }}
                        style={styles.iconButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={18}
                          color={colors.semantic.danger}
                        />
                      </Pressable>
                    )}
                  </View>
                </View>
              </Pressable>
            </GlassCard>
          </View>
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
    prevProps.canEdit === nextProps.canEdit &&
    prevProps.onAddToList === nextProps.onAddToList &&
    prevProps.isOwner === nextProps.isOwner &&
    prevProps.commentCount === nextProps.commentCount &&
    prevProps.onOpenComments === nextProps.onOpenComments &&
    prevProps.selectionActive === nextProps.selectionActive &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onSelectToggle === nextProps.onSelectToggle &&
    prevProps.hasFailed === nextProps.hasFailed
  );
});
