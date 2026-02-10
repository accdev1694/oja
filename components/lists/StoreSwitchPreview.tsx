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
  trackStoreSwitchCompleted,
  trackStoreSwitchCancelled,
} from "@/lib/analytics";
import { useNetworkStatus } from "@/lib/network/useNetworkStatus";
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
  /** List ID for analytics tracking */
  listId: string;
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

  // Build accessibility label for the item
  const accessibilityLabel = useMemo(() => {
    const parts = [item.name];
    if (item.newSize) parts.push(item.newSize);
    parts.push(`${formatPrice(item.oldPrice)} to ${formatPrice(item.newPrice)}`);
    if (isPriceCheaper) {
      parts.push(`saves ${formatPrice(item.oldPrice - item.newPrice)}`);
    } else if (item.newPrice > item.oldPrice) {
      parts.push(`costs ${formatPrice(item.newPrice - item.oldPrice)} more`);
    }
    if (item.sizeChanged) parts.push("size auto-matched");
    if (item.manualOverride) parts.push("manual price kept");
    return parts.join(", ");
  }, [item, isPriceCheaper]);

  return (
    <Animated.View
      style={[styles.itemRow, animatedStyle]}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      <View style={styles.itemLeft} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
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

      <View style={styles.itemRight} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
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
  listId,
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
  // Network status for offline handling
  // Note: Convex automatically queues mutations when offline and syncs when reconnected
  const { isConnected } = useNetworkStatus();

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

  // Calculate stats for analytics
  const analyticsStats = useMemo(() => {
    const sizeChangedCount = items.filter((i) => i.sizeChanged).length;
    const manualOverrideCount = items.filter((i) => i.manualOverride).length;
    return { sizeChangedCount, manualOverrideCount };
  }, [items]);

  // Handle close with haptic and analytics
  const handleClose = useCallback(() => {
    haptic("light");
    // Track store switch cancelled
    trackStoreSwitchCancelled(
      listId,
      previousStore,
      newStore,
      savings
    );
    onClose();
  }, [listId, previousStore, newStore, savings, onClose]);

  // Handle confirm with haptic and analytics
  const handleConfirm = useCallback(() => {
    if (isLoading) return;
    haptic("success");
    // Track store switch completed
    trackStoreSwitchCompleted(
      listId,
      previousStore,
      newStore,
      savings,
      items.length,
      analyticsStats.sizeChangedCount,
      analyticsStats.manualOverrideCount
    );
    onConfirm();
  }, [listId, previousStore, newStore, savings, items.length, analyticsStats, isLoading, onConfirm]);

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
      <View
        style={styles.header}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`Switch from ${previousStoreDisplayName} to ${newStoreDisplayName}? ${items.length} items will be updated.`}
      >
        <View style={styles.headerIconContainer} accessibilityElementsHidden>
          <MaterialCommunityIcons
            name="swap-horizontal"
            size={24}
            color={newStoreColor}
          />
        </View>
        <Text style={styles.headerTitle}>
          Switch to {newStoreDisplayName}?
        </Text>
        {/* Offline indicator - Convex will queue the switch and sync when connected */}
        {!isConnected && (
          <View style={styles.offlineIndicator} accessible accessibilityRole="alert">
            <MaterialCommunityIcons
              name="cloud-off-outline"
              size={14}
              color={colors.accent.warning}
            />
            <Text style={styles.offlineText}>
              Offline - will sync when connected
            </Text>
          </View>
        )}
      </View>

      {/* Items List */}
      <ScrollView
        style={styles.itemsList}
        contentContainerStyle={styles.itemsListContent}
        showsVerticalScrollIndicator={false}
        accessibilityRole="list"
        accessibilityLabel={`${items.length} items with price changes`}
      >
        {items.map((item, index) => (
          <ItemRow key={item.id} item={item} index={index} />
        ))}
      </ScrollView>

      {/* Divider */}
      <View style={styles.divider} accessibilityElementsHidden />

      {/* Summary Section */}
      <View
        style={styles.summary}
        accessible
        accessibilityLabel={
          hasSavings
            ? `${previousStoreDisplayName} total ${formatPrice(previousTotal)}. ${newStoreDisplayName} total ${formatPrice(newTotal)}. You save ${formatPrice(savings)}.`
            : savings === 0
              ? `${previousStoreDisplayName} total ${formatPrice(previousTotal)}. ${newStoreDisplayName} total ${formatPrice(newTotal)}. Same total price at both stores.`
              : `${previousStoreDisplayName} total ${formatPrice(previousTotal)}. ${newStoreDisplayName} total ${formatPrice(newTotal)}. Warning: This will cost ${formatPrice(Math.abs(savings))} more.`
        }
        accessibilityRole="summary"
      >
        {/* Previous store total */}
        <View style={styles.summaryRow} accessibilityElementsHidden>
          <Text style={styles.summaryLabel}>
            {previousStoreDisplayName} Total:
          </Text>
          <Text style={styles.summaryValue}>{formatPrice(previousTotal)}</Text>
        </View>

        {/* New store total */}
        <View style={styles.summaryRow} accessibilityElementsHidden>
          <Text style={[styles.summaryLabel, { color: newStoreColor }]}>
            {newStoreDisplayName} Total:
          </Text>
          <Text style={[styles.summaryValue, { color: newStoreColor }]}>
            {formatPrice(newTotal)}
          </Text>
        </View>

        {/* Savings */}
        {hasSavings && (
          <View style={[styles.summaryRow, styles.savingsRow]} accessibilityElementsHidden>
            <Text style={styles.savingsLabel}>You Save:</Text>
            <View style={styles.savingsValueContainer}>
              <Text style={styles.savingsValue}>{formatPrice(savings)}</Text>
              <Text style={styles.savingsEmoji}> </Text>
            </View>
          </View>
        )}

        {/* No savings / price increase warning */}
        {savings <= 0 && (
          <View style={styles.warningContainer} accessibilityElementsHidden>
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
      <View style={styles.actions} accessibilityRole="toolbar">
        {/* Cancel Button */}
        <Animated.View style={[styles.cancelButtonWrapper, cancelAnimatedStyle]}>
          <Pressable
            style={styles.cancelButton}
            onPress={handleClose}
            onPressIn={handleCancelPressIn}
            onPressOut={handleCancelPressOut}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Cancel store switch"
            accessibilityState={{ disabled: isLoading }}
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
            accessibilityRole="button"
            accessibilityLabel={
              isLoading
                ? "Switching stores..."
                : hasSavings
                  ? `Switch to ${newStoreDisplayName} and save ${formatPrice(savings)}`
                  : `Switch to ${newStoreDisplayName}`
            }
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
            accessibilityHint="Double tap to confirm switching to this store"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.text.inverse} accessibilityElementsHidden />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={20}
                  color={colors.text.inverse}
                  style={styles.confirmButtonIcon}
                  accessibilityElementsHidden
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

  // Offline indicator
  offlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: borderRadius.sm,
  },
  offlineText: {
    ...typography.bodySmall,
    color: colors.accent.warning,
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
