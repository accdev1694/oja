/**
 * StoreSwitchPreview - Modal for previewing store switch changes
 *
 * Shows a detailed breakdown of how switching stores will affect
 * the shopping list items, including:
 * - Price changes per item (old -> new)
 * - Size auto-matching indicators
 * - Manual override preservation
 * - Total savings summary
 *
 * Features:
 * - Bottom sheet modal with Glass UI styling
 * - Scrollable item list for long lists
 * - Different icons for normal, size-changed, and manual items
 * - Animated entry with Reanimated
 * - Haptic feedback on interactions
 * - Loading state on confirm button
 */

import React, { memo, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { GlassModal } from "@/components/ui/glass/GlassModal";
import { haptic } from "@/lib/haptics/safeHaptics";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
} from "@/lib/design/glassTokens";

// =============================================================================
// TYPES
// =============================================================================

export interface StoreSwitchItem {
  /** Unique item ID */
  id: string;
  /** Item display name */
  name: string;
  /** Previous size (e.g., "250g") */
  oldSize?: string;
  /** New size at new store (e.g., "227g") */
  newSize?: string;
  /** Price at previous store */
  oldPrice: number;
  /** Price at new store */
  newPrice: number;
  /** Whether size was auto-matched to closest available */
  sizeChanged: boolean;
  /** Whether user had manually overridden the price */
  manualOverride: boolean;
}

export interface StoreSwitchPreviewProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** Called when user confirms the switch */
  onConfirm: () => void;
  /** Loading state for confirm action */
  isLoading?: boolean;

  /** Previous store normalized ID */
  previousStore: string;
  /** Previous store display name */
  previousStoreDisplayName: string;
  /** New store normalized ID */
  newStore: string;
  /** New store display name */
  newStoreDisplayName: string;
  /** New store brand color */
  newStoreColor: string;

  /** Total at previous store */
  previousTotal: number;
  /** Total at new store */
  newTotal: number;
  /** Savings amount (previousTotal - newTotal) */
  savings: number;

  /** List of items with price/size changes */
  items: StoreSwitchItem[];
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format price with pound sign and 2 decimal places
 */
function formatPrice(price: number): string {
  return `£${price.toFixed(2)}`;
}

/**
 * Create a transparent version of a hex color
 */
function getTransparentColor(hexColor: string, opacity: number): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// =============================================================================
// ITEM ROW COMPONENT
// =============================================================================

interface ItemRowProps {
  item: StoreSwitchItem;
  index: number;
}

const ItemRow = memo(function ItemRow({ item, index }: ItemRowProps) {
  // Animation for staggered entry
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    const delay = index * 50; // Stagger each item by 50ms
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, animations.spring.gentle);
    }, delay);
    return () => clearTimeout(timer);
  }, [index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Determine which icon to show
  const getIcon = (): {
    name: keyof typeof MaterialCommunityIcons.glyphMap;
    color: string;
  } => {
    if (item.manualOverride) {
      return { name: "pause-circle", color: colors.text.tertiary };
    }
    if (item.sizeChanged) {
      return { name: "lightning-bolt", color: colors.accent.warning };
    }
    return { name: "check-circle", color: colors.accent.success };
  };

  const icon = getIcon();
  const isPriceCheaper = item.newPrice < item.oldPrice;
  const priceChangeColor = isPriceCheaper
    ? colors.accent.success
    : item.newPrice > item.oldPrice
      ? colors.accent.error
      : colors.text.secondary;

  // Format size display
  const sizeDisplay = useMemo(() => {
    if (item.sizeChanged && item.oldSize && item.newSize) {
      return `(${item.oldSize}\u2192${item.newSize})`;
    }
    if (item.newSize) {
      return `(${item.newSize})`;
    }
    if (item.oldSize) {
      return `(${item.oldSize})`;
    }
    return "";
  }, [item.sizeChanged, item.oldSize, item.newSize]);

  return (
    <Animated.View style={[styles.itemRow, animatedStyle]}>
      <View style={styles.itemLeft}>
        <MaterialCommunityIcons
          name={icon.name}
          size={18}
          color={icon.color}
          style={styles.itemIcon}
        />
        <View style={styles.itemNameContainer}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
            {sizeDisplay ? (
              <Text style={styles.itemSize}> {sizeDisplay}</Text>
            ) : null}
          </Text>
          {/* Show note for size-changed or manual override items */}
          {item.sizeChanged && (
            <Text style={styles.itemNote}>Closest size auto-matched</Text>
          )}
          {item.manualOverride && (
            <Text style={styles.itemNote}>Your price kept (manual override)</Text>
          )}
        </View>
      </View>

      <View style={styles.itemRight}>
        <Text style={styles.oldPrice}>{formatPrice(item.oldPrice)}</Text>
        <MaterialCommunityIcons
          name="arrow-right"
          size={14}
          color={colors.text.tertiary}
          style={styles.priceArrow}
        />
        <Text style={[styles.newPrice, { color: priceChangeColor }]}>
          {formatPrice(item.newPrice)}
        </Text>
      </View>
    </Animated.View>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const StoreSwitchPreview = memo(function StoreSwitchPreview({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
  previousStore,
  previousStoreDisplayName,
  newStore,
  newStoreDisplayName,
  newStoreColor,
  previousTotal,
  newTotal,
  savings,
  items,
}: StoreSwitchPreviewProps) {
  // Animation values
  const confirmScale = useSharedValue(1);
  const cancelScale = useSharedValue(1);

  // Animated styles for buttons
  const confirmAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confirmScale.value }],
  }));

  const cancelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cancelScale.value }],
  }));

  // Handle close with haptic
  const handleClose = useCallback(() => {
    haptic("light");
    onClose();
  }, [onClose]);

  // Handle confirm with haptic
  const handleConfirm = useCallback(() => {
    if (isLoading) return;
    haptic("success");
    onConfirm();
  }, [isLoading, onConfirm]);

  // Button press handlers
  const handleConfirmPressIn = useCallback(() => {
    confirmScale.value = withSpring(
      animations.pressScale,
      animations.spring.stiff
    );
  }, [confirmScale]);

  const handleConfirmPressOut = useCallback(() => {
    confirmScale.value = withSpring(1, animations.spring.gentle);
  }, [confirmScale]);

  const handleCancelPressIn = useCallback(() => {
    cancelScale.value = withSpring(
      animations.pressScale,
      animations.spring.stiff
    );
  }, [cancelScale]);

  const handleCancelPressOut = useCallback(() => {
    cancelScale.value = withSpring(1, animations.spring.gentle);
  }, [cancelScale]);

  // Calculate stats
  const stats = useMemo(() => {
    const sizeChangedCount = items.filter((i) => i.sizeChanged).length;
    const manualOverrideCount = items.filter((i) => i.manualOverride).length;
    const normalCount =
      items.length - sizeChangedCount - manualOverrideCount;
    return { sizeChangedCount, manualOverrideCount, normalCount };
  }, [items]);

  const hasSavings = savings > 0;

  return (
    <GlassModal
      visible={visible}
      onClose={handleClose}
      position="bottom"
      maxWidth="full"
      animationType="slide"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons
            name="swap-horizontal"
            size={24}
            color={newStoreColor}
          />
        </View>
        <Text style={styles.headerTitle}>
          Switch to {newStoreDisplayName}?
        </Text>
      </View>

      {/* Items List */}
      <ScrollView
        style={styles.itemsList}
        contentContainerStyle={styles.itemsListContent}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, index) => (
          <ItemRow key={item.id} item={item} index={index} />
        ))}
      </ScrollView>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Summary Section */}
      <View style={styles.summary}>
        {/* Previous store total */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {previousStoreDisplayName} Total:
          </Text>
          <Text style={styles.summaryValue}>{formatPrice(previousTotal)}</Text>
        </View>

        {/* New store total */}
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: newStoreColor }]}>
            {newStoreDisplayName} Total:
          </Text>
          <Text style={[styles.summaryValue, { color: newStoreColor }]}>
            {formatPrice(newTotal)}
          </Text>
        </View>

        {/* Savings */}
        {hasSavings && (
          <View style={[styles.summaryRow, styles.savingsRow]}>
            <Text style={styles.savingsLabel}>You Save:</Text>
            <View style={styles.savingsValueContainer}>
              <Text style={styles.savingsValue}>{formatPrice(savings)}</Text>
              <Text style={styles.savingsEmoji}> ✨</Text>
            </View>
          </View>
        )}

        {/* No savings / price increase warning */}
        {savings <= 0 && (
          <View style={styles.warningContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={16}
              color={colors.accent.warning}
            />
            <Text style={styles.warningText}>
              {savings === 0
                ? "Same total price at both stores"
                : `This will cost ${formatPrice(Math.abs(savings))} more`}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {/* Cancel Button */}
        <Animated.View style={[styles.cancelButtonWrapper, cancelAnimatedStyle]}>
          <Pressable
            style={styles.cancelButton}
            onPress={handleClose}
            onPressIn={handleCancelPressIn}
            onPressOut={handleCancelPressOut}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </Animated.View>

        {/* Confirm Button */}
        <Animated.View
          style={[styles.confirmButtonWrapper, confirmAnimatedStyle]}
        >
          <Pressable
            style={[
              styles.confirmButton,
              { backgroundColor: newStoreColor },
              isLoading && styles.confirmButtonLoading,
            ]}
            onPress={handleConfirm}
            onPressIn={handleConfirmPressIn}
            onPressOut={handleConfirmPressOut}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={20}
                  color={colors.text.inverse}
                  style={styles.confirmButtonIcon}
                />
                <Text style={styles.confirmButtonText}>
                  Switch to {newStoreDisplayName}
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </GlassModal>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Header
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    textAlign: "center",
  },

  // Items List
  itemsList: {
    maxHeight: 280,
    marginHorizontal: -spacing.xl,
  },
  itemsListContent: {
    paddingHorizontal: spacing.xl,
  },

  // Item Row
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: spacing.sm,
  },
  itemIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  itemNameContainer: {
    flex: 1,
  },
  itemName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  itemSize: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  itemNote: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
    fontStyle: "italic",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  oldPrice: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textDecorationLine: "line-through",
  },
  priceArrow: {
    marginHorizontal: spacing.xs,
  },
  newPrice: {
    ...typography.bodyMedium,
    fontWeight: "600",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.lg,
    marginHorizontal: -spacing.xl,
  },

  // Summary
  summary: {
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  summaryValue: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  savingsRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  savingsLabel: {
    ...typography.bodyLarge,
    color: colors.accent.success,
    fontWeight: "600",
  },
  savingsValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  savingsValue: {
    ...typography.headlineMedium,
    color: colors.accent.success,
    fontWeight: "700",
  },
  savingsEmoji: {
    fontSize: 18,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: borderRadius.md,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.accent.warning,
  },

  // Action Buttons
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelButtonWrapper: {
    flex: 0.35,
  },
  cancelButton: {
    height: 52,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    ...typography.labelLarge,
    color: colors.text.secondary,
  },
  confirmButtonWrapper: {
    flex: 0.65,
  },
  confirmButton: {
    height: 52,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  confirmButtonLoading: {
    opacity: 0.7,
  },
  confirmButtonIcon: {
    marginRight: spacing.sm,
  },
  confirmButtonText: {
    ...typography.labelLarge,
    color: colors.text.inverse,
    fontWeight: "600",
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default StoreSwitchPreview;
