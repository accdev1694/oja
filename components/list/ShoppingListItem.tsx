import { memo, useRef, useEffect, useCallback, useMemo } from "react";
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
import { formatPrice } from "@/lib/currency/currencyUtils";

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

  // ── Unified press handlers ──────────────────────────────────────────────
  const handlePress = useCallback(() => {
    if (selectionActive) {
      // Selection mode: tap = toggle selection
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectToggle?.(item._id);
      return;
    }

    if (isShopping) {
      // Shopping: tap = check off
      if (canEdit) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle(item._id);
      }
    } else {
      // Planning: tap = edit
      if (canEdit && !item.isChecked) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onEdit(item);
      }
    }
  }, [selectionActive, isShopping, canEdit, item, onToggle, onEdit, onSelectToggle]);

  const handleLongPress = useCallback(() => {
    // Both modes: long press = toggle selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
  // Build display name with size/weight at the end only (no duplicates)
  const displayName = useMemo(() => {
    if (!item.size) return item.name;

    let cleanName = item.name;
    const sizeLower = item.size.toLowerCase().trim();

    // Extract the numeric part and unit separately
    const sizeMatch = sizeLower.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/i);
    if (!sizeMatch) {
      // If size doesn't match expected pattern, just use as-is
      return `${item.name} ${item.size}`;
    }

    const [_, sizeNum, sizeUnit] = sizeMatch;

    // Build patterns to match all variations:
    // 1. Exact size (e.g., "650g", "650 g")
    // 2. Number alone (e.g., "650")
    // 3. Number with typo units (e.g., "650ge")
    // 4. Variations like "12pk" when size is "12"
    // 5. Parenthetical sizes like "(6x124g)"

    const patterns: RegExp[] = [];

    // Pattern 1: Exact size with optional spaces
    const escapedSize = sizeLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
    patterns.push(new RegExp(`\\b${escapedSize}\\b`, 'gi'));

    // Pattern 2: Number + optional trailing letters (catches typos like "650ge")
    if (sizeUnit) {
      patterns.push(new RegExp(`\\b${sizeNum}\\s*${sizeUnit}[a-z]*\\b`, 'gi'));
    }

    // Pattern 3: Number + "pk" or "pack" variations
    patterns.push(new RegExp(`\\b${sizeNum}\\s*p[a-z]*\\b`, 'gi'));

    // Pattern 4: Number alone at word boundaries
    patterns.push(new RegExp(`\\b${sizeNum}\\b`, 'g'));

    // Pattern 5: Parenthetical sizes (e.g., "(6x124g)")
    patterns.push(new RegExp(`\\([^)]*${sizeNum}[^)]*\\)`, 'gi'));

    // Apply all patterns to remove duplicates
    for (const pattern of patterns) {
      cleanName = cleanName.replace(pattern, '').trim();
    }

    // Clean up multiple spaces and extra separators
    cleanName = cleanName.replace(/\s+/g, ' ').replace(/^[\s,.-]+|[\s,.-]+$/g, '').trim();

    // If we ended up with an empty name, use original
    if (!cleanName) return item.name;

    // Always append the size at the end
    return `${cleanName} ${item.size}`;
  }, [item.name, item.size]);


  // Selected state background tint (planning mode)
  const selectedTint = isSelected
    ? { backgroundColor: `${colors.accent.primary}15` }
    : undefined;

  return (
    <View style={itemStyles.swipeContainer}>
      {/* Swipe actions — planning mode only */}
      {!isShopping && (
        <>
          <Animated.View style={[itemStyles.swipeAction, itemStyles.swipeActionLeft, leftActionStyle]}>
            <MaterialCommunityIcons name="arrow-up-bold" size={20} color="#fff" />
            <Text style={itemStyles.swipeActionText}>Priority ↑</Text>
          </Animated.View>
          <Animated.View style={[itemStyles.swipeAction, itemStyles.swipeActionRight, rightActionStyle]}>
            <Text style={itemStyles.swipeActionText}>Priority ↓</Text>
            <MaterialCommunityIcons name="arrow-down-bold" size={20} color="#fff" />
          </Animated.View>
        </>
      )}

      <GestureDetector gesture={composedGesture}>
        <Animated.View style={animatedStyle}>
          <Animated.View style={[{ borderRadius: borderRadius.lg }, checkFlashStyle]}>
            <GlassCard
              variant="standard"
              style={[itemStyles.itemCard, selectedTint, item.isChecked && itemStyles.itemCardChecked]}
            >
              <Pressable
                style={itemStyles.itemRow}
                onPress={handlePress}
                onLongPress={handleLongPress}
                delayLongPress={400}
              >
                {/* Checkbox — visible in selection mode OR shopping mode (not in planning) */}
                {(selectionActive || (isShopping && !selectionActive)) && (
                  <GlassCircularCheckbox
                    checked={selectionActive ? !!isSelected : item.isChecked}
                    size="xs"
                    style={{ marginRight: spacing.xs }}
                  />
                )}

                {/* Item details: Two-line layout */}
                <View style={itemStyles.itemDetailsColumn}>
                  {/* Line 1: Item name + Edit/Delete buttons */}
                  <View style={itemStyles.nameRow}>
                    <Text
                      style={[itemStyles.itemName, item.isChecked && itemStyles.itemNameChecked]}
                      numberOfLines={1}
                    >
                      {displayName}
                    </Text>

                    {/* Action buttons group */}
                    <View style={itemStyles.actionButtonsRow}>
                      {/* Edit button — visible in both shopping and planning modes (not in selection mode) */}
                      {canEdit && !selectionActive && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
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

                      {/* Delete button — visible in both shopping and planning modes (not in selection mode) */}
                      {canEdit && !selectionActive && (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
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
                      )}
                    </View>
                  </View>

                  {/* Line 2: Price info + Comment button */}
                  <View style={itemStyles.priceRowWithActions}>
                    {/* Price info */}
                    <View style={itemStyles.priceInfo}>
                      <Text style={[itemStyles.itemQtyLabel, item.isChecked && itemStyles.itemPriceChecked]}>
                        Qty {item.quantity}
                      </Text>
                      <Text style={[itemStyles.bulletSeparator, item.isChecked && itemStyles.itemPriceChecked]}>
                        •
                      </Text>
                      <Text style={[itemStyles.itemQty, item.isChecked && itemStyles.itemPriceChecked]}>
                        {formatPrice(item.actualPrice || item.estimatedPrice || 0, currency)} each
                      </Text>
                      <Text style={[itemStyles.bulletSeparator, item.isChecked && itemStyles.itemPriceChecked]}>
                        •
                      </Text>
                      <Text style={[itemStyles.itemQtyLabel, item.isChecked && itemStyles.itemPriceChecked]}>
                        Total
                      </Text>
                      <Text style={[itemStyles.itemPrice, item.isChecked && itemStyles.itemPriceChecked]}>
                        {formatPrice((item.actualPrice || item.estimatedPrice || 0) * item.quantity, currency)}
                      </Text>
                    </View>

                    {/* Comment button — visible when partner mode is active */}
                    {onOpenComments && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onOpenComments(item._id, item.name);
                        }}
                        style={itemStyles.iconButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <View>
                          <MaterialCommunityIcons
                            name="comment-outline"
                            size={18}
                            color={colors.text.tertiary}
                          />
                          {(commentCount ?? 0) > 0 && (
                            <View style={itemStyles.commentBadge}>
                              <Text style={itemStyles.commentBadgeText}>
                                {commentCount! > 9 ? "9+" : commentCount}
                              </Text>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    )}
                  </View>
                </View>
              </Pressable>
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
    prevProps.canEdit === nextProps.canEdit &&
    prevProps.onAddToList === nextProps.onAddToList &&
    prevProps.isOwner === nextProps.isOwner &&
    prevProps.commentCount === nextProps.commentCount &&
    prevProps.onOpenComments === nextProps.onOpenComments &&
    prevProps.selectionActive === nextProps.selectionActive &&
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  itemCardChecked: {
    opacity: 0.7,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  itemDetailsColumn: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
  priceRowWithActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtonsRow: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  iconButton: {
    padding: spacing.xs,
  },
  itemQty: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  itemQtyLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  bulletSeparator: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginHorizontal: 6,
  },
  itemPrice: {
    ...typography.bodySmall,
    color: colors.accent.primary,
    fontWeight: "800",
    marginLeft: 4,
    fontSize: 13,
  },
  itemPriceChecked: {
    color: colors.accent.primary,
    opacity: 0.7,
  },
  commentBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: colors.accent.primary,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  commentBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
});
