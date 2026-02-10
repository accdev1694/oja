/**
 * ListComparisonSummary - Store comparison summary for shopping lists
 *
 * Displays a summary of the current list's total at the selected store
 * and compares prices across alternative stores, highlighting potential savings.
 *
 * Features:
 * - Current store total display
 * - Alternative store comparison with savings
 * - "Best deal" star on cheapest alternative
 * - Store brand colors
 * - Switch store action buttons
 * - Items compared count with missing data note
 * - Loading skeleton state
 * - Haptic feedback on interactions
 * - Glassmorphic styling
 */

import React, { useCallback, useMemo, memo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { haptic } from "@/lib/haptics/safeHaptics";
import { trackStoreSwitchInitiated } from "@/lib/analytics";
import { GlassCard } from "@/components/ui/glass/GlassCard";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
} from "@/lib/design/glassTokens";
import { getStoreInfoSafe } from "@/convex/lib/storeNormalizer";

// =============================================================================
// TYPES
// =============================================================================

export interface StoreAlternative {
  /** Normalized store ID (e.g., "tesco", "aldi") */
  store: string;
  /** Human-readable store name */
  storeDisplayName: string;
  /** Store brand hex color */
  storeColor: string;
  /** Total price at this store */
  total: number;
  /** Potential savings vs current store */
  savings: number;
  /** Number of items with prices at this store */
  itemsCompared: number;
  /** Number of items missing price data at this store */
  itemsWithIssues: number;
}

export interface ListComparisonSummaryProps {
  /** List ID for analytics tracking */
  listId: string;
  /** Current selected store ID */
  currentStore: string;
  /** Current store's total price */
  currentTotal: number;
  /** Alternative stores with their totals and savings */
  alternatives: StoreAlternative[];
  /** Total number of items in the list */
  totalItems: number;
  /** Callback when user wants to switch to a different store */
  onSwitchStore: (storeId: string) => void;
  /** Whether the component is loading data */
  isLoading?: boolean;
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
// SUB-COMPONENTS
// =============================================================================

/**
 * Skeleton loading item for alternative store
 */
function SkeletonItem() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      shimmer.value = 0;
      shimmer.value = withTiming(1, { duration: 1000 });
    };
    animate();
    const interval = setInterval(animate, 1500);
    return () => clearInterval(interval);
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }));

  return (
    <Animated.View
      style={[styles.skeletonCard, shimmerStyle]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonStoreName} />
        <View style={styles.skeletonPrice} />
      </View>
      <View style={styles.skeletonButton} />
    </Animated.View>
  );
}

/**
 * Loading skeleton for the entire component
 */
function LoadingSkeleton() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      shimmer.value = 0;
      shimmer.value = withTiming(1, { duration: 1000 });
    };
    animate();
    const interval = setInterval(animate, 1500);
    return () => clearInterval(interval);
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }));

  return (
    <GlassCard variant="standard" padding="lg">
      <View
        accessible
        accessibilityLabel="Loading store comparison"
        accessibilityRole="progressbar"
      >
        {/* Header skeleton */}
        <Animated.View style={[styles.skeletonHeader, shimmerStyle]} accessibilityElementsHidden />

        {/* Current store skeleton */}
        <View style={styles.currentStoreSection} accessibilityElementsHidden>
          <Animated.View style={[styles.skeletonCurrentStore, shimmerStyle]} />
          <Animated.View style={[styles.skeletonCurrentTotal, shimmerStyle]} />
        </View>

        {/* Divider */}
        <View style={styles.divider} accessibilityElementsHidden />

        {/* Alternatives section skeleton */}
        <Animated.View style={[styles.skeletonAlternativesHeader, shimmerStyle]} accessibilityElementsHidden />

        {/* Alternative store skeletons */}
        <SkeletonItem />
        <SkeletonItem />
      </View>
    </GlassCard>
  );
}

/**
 * Alternative store card with switch button
 */
const AlternativeStoreCard = memo(function AlternativeStoreCard({
  alternative,
  isBestDeal,
  onSwitch,
}: {
  alternative: StoreAlternative;
  isBestDeal: boolean;
  onSwitch: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(animations.pressScale, animations.spring.stiff);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animations.spring.gentle);
  }, [scale]);

  const handlePress = useCallback(() => {
    haptic("medium");
    onSwitch();
  }, [onSwitch]);

  const storeInfo = getStoreInfoSafe(alternative.store);
  const displayName = storeInfo?.displayName || alternative.storeDisplayName;
  const storeColor = storeInfo?.color || alternative.storeColor;

  // Build accessibility label for the entire card
  const cardAccessibilityLabel = [
    displayName,
    `total ${formatPrice(alternative.total)}`,
    alternative.savings > 0 ? `save ${formatPrice(alternative.savings)}` : null,
    isBestDeal ? "best deal" : null,
  ].filter(Boolean).join(", ");

  return (
    <Animated.View style={animatedStyle}>
      <View
        style={[
          styles.alternativeCard,
          { borderLeftColor: storeColor },
          isBestDeal && styles.alternativeCardBestDeal,
        ]}
        accessible
        accessibilityLabel={cardAccessibilityLabel}
        accessibilityRole="summary"
      >
        {/* Store info row - hidden from screen reader as card has full label */}
        <View style={styles.alternativeHeader} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.storeNameRow}>
            <View
              style={[styles.storeColorDot, { backgroundColor: storeColor }]}
            />
            <Text style={styles.alternativeStoreName} numberOfLines={1}>
              {displayName}
            </Text>
            {isBestDeal && (
              <View style={styles.bestDealBadge}>
                <MaterialCommunityIcons
                  name="star"
                  size={14}
                  color={colors.accent.warm}
                />
              </View>
            )}
          </View>

          <View style={styles.priceColumn}>
            <Text style={styles.alternativeTotal}>
              {formatPrice(alternative.total)}
            </Text>
            {alternative.savings > 0 && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>
                  Save {formatPrice(alternative.savings)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Switch button */}
        <Pressable
          style={[
            styles.switchButton,
            { backgroundColor: getTransparentColor(storeColor, 0.2) },
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={
            alternative.savings > 0
              ? `Switch to ${displayName}. Save ${formatPrice(alternative.savings)}${isBestDeal ? ". Best deal" : ""}`
              : `Switch to ${displayName}`
          }
          accessibilityHint="Double tap to switch your shopping list to this store"
        >
          <Text style={[styles.switchButtonText, { color: storeColor }]}>
            Switch to {displayName}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ListComparisonSummary = memo(function ListComparisonSummary({
  listId,
  currentStore,
  currentTotal,
  alternatives,
  totalItems,
  onSwitchStore,
  isLoading = false,
}: ListComparisonSummaryProps) {
  // Get current store info
  const currentStoreInfo = useMemo(
    () => getStoreInfoSafe(currentStore),
    [currentStore]
  );

  // Handle switch store with analytics tracking
  const handleSwitchStore = useCallback(
    (alternative: StoreAlternative) => {
      // Track store switch initiated
      trackStoreSwitchInitiated(
        listId,
        currentStore,
        alternative.store,
        alternative.savings,
        alternative.itemsCompared
      );

      // Call the original handler
      onSwitchStore(alternative.store);
    },
    [listId, currentStore, onSwitchStore]
  );

  const currentDisplayName = currentStoreInfo?.displayName || currentStore;
  const currentStoreColor = currentStoreInfo?.color || colors.accent.secondary;

  // Sort alternatives by savings (highest first) and find best deal
  const sortedAlternatives = useMemo(() => {
    return [...alternatives].sort((a, b) => b.savings - a.savings);
  }, [alternatives]);

  const bestDealStoreId = useMemo(() => {
    if (sortedAlternatives.length === 0) return null;
    const bestDeal = sortedAlternatives[0];
    // Only consider it a best deal if there are actual savings
    return bestDeal.savings > 0 ? bestDeal.store : null;
  }, [sortedAlternatives]);

  // Calculate items compared stats
  const itemsComparedStats = useMemo(() => {
    if (sortedAlternatives.length === 0) return null;
    // Use the max items compared from any alternative
    const maxCompared = Math.max(
      ...sortedAlternatives.map((alt) => alt.itemsCompared)
    );
    const minIssues = Math.min(
      ...sortedAlternatives.map((alt) => alt.itemsWithIssues)
    );
    return {
      compared: maxCompared,
      total: totalItems,
      issues: minIssues,
    };
  }, [sortedAlternatives, totalItems]);

  // Show loading skeleton
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Empty state - no alternatives
  if (alternatives.length === 0) {
    return (
      <GlassCard variant="standard" padding="lg">
        <View
          style={styles.header}
          accessible
          accessibilityRole="header"
          accessibilityLabel="Your list summary"
        >
          <MaterialCommunityIcons
            name="chart-bar"
            size={20}
            color={colors.text.secondary}
            accessibilityElementsHidden
          />
          <Text style={styles.headerTitle}>Your List Summary</Text>
        </View>

        <View
          style={styles.currentStoreSection}
          accessible
          accessibilityLabel={`Current store: ${currentDisplayName}. Total: ${formatPrice(currentTotal)}`}
        >
          <View style={styles.currentStoreRow} accessibilityElementsHidden>
            <Text style={styles.currentStoreLabel}>Current:</Text>
            <View
              style={[
                styles.storeColorDot,
                { backgroundColor: currentStoreColor },
              ]}
            />
            <Text style={styles.currentStoreName}>{currentDisplayName}</Text>
          </View>
          <Text style={styles.currentStoreTotal} accessibilityElementsHidden>
            Total: {formatPrice(currentTotal)}
          </Text>
        </View>

        <View style={styles.divider} accessibilityElementsHidden />

        <View
          style={styles.emptyStateContainer}
          accessible
          accessibilityLabel="No other stores to compare. Scan more receipts to unlock price comparisons."
        >
          <MaterialCommunityIcons
            name="store-search-outline"
            size={32}
            color={colors.text.tertiary}
            accessibilityElementsHidden
          />
          <Text style={styles.emptyStateText}>
            No other stores to compare
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Scan more receipts to unlock price comparisons
          </Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="standard" padding="lg">
      {/* Header */}
      <View
        style={styles.header}
        accessible
        accessibilityRole="header"
        accessibilityLabel="Your list summary"
      >
        <MaterialCommunityIcons
          name="chart-bar"
          size={20}
          color={colors.text.secondary}
          accessibilityElementsHidden
        />
        <Text style={styles.headerTitle}>Your List Summary</Text>
      </View>

      {/* Current Store Section */}
      <View
        style={styles.currentStoreSection}
        accessible
        accessibilityLabel={`Current store: ${currentDisplayName}. Total: ${formatPrice(currentTotal)}`}
      >
        <View style={styles.currentStoreRow} accessibilityElementsHidden>
          <Text style={styles.currentStoreLabel}>Current:</Text>
          <View
            style={[
              styles.storeColorDot,
              { backgroundColor: currentStoreColor },
            ]}
          />
          <Text style={styles.currentStoreName}>{currentDisplayName}</Text>
        </View>
        <Text style={styles.currentStoreTotal} accessibilityElementsHidden>
          Total: {formatPrice(currentTotal)}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} accessibilityElementsHidden />

      {/* Alternatives Section Header */}
      <View
        style={styles.alternativesHeader}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${sortedAlternatives.length} alternative stores available`}
      >
        <MaterialCommunityIcons
          name="lightbulb-outline"
          size={16}
          color={colors.accent.warm}
          accessibilityElementsHidden
        />
        <Text style={styles.alternativesHeaderText}>
          Same items at other stores:
        </Text>
      </View>

      {/* Alternative Store Cards */}
      <ScrollView
        style={styles.alternativesList}
        contentContainerStyle={styles.alternativesContent}
        showsVerticalScrollIndicator={false}
        accessibilityRole="list"
        accessibilityLabel="Alternative store options"
      >
        {sortedAlternatives.map((alternative) => (
          <AlternativeStoreCard
            key={alternative.store}
            alternative={alternative}
            isBestDeal={alternative.store === bestDealStoreId}
            onSwitch={() => handleSwitchStore(alternative)}
          />
        ))}
      </ScrollView>

      {/* Items Compared Note */}
      {itemsComparedStats && (
        <View
          style={styles.itemsComparedContainer}
          accessible
          accessibilityLabel={
            itemsComparedStats.issues > 0
              ? `${itemsComparedStats.compared} of ${itemsComparedStats.total} items compared. ${itemsComparedStats.issues} items have no price data at other stores.`
              : `${itemsComparedStats.compared} of ${itemsComparedStats.total} items compared`
          }
        >
          <Text style={styles.itemsComparedText} accessibilityElementsHidden>
            {itemsComparedStats.compared}/{itemsComparedStats.total} items compared
          </Text>
          {itemsComparedStats.issues > 0 && (
            <Text style={styles.itemsIssuesText} accessibilityElementsHidden>
              ({itemsComparedStats.issues} items have no price data elsewhere)
            </Text>
          )}
        </View>
      )}
    </GlassCard>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },

  // Current Store Section
  currentStoreSection: {
    gap: spacing.xs,
  },
  currentStoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  currentStoreLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  storeColorDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  currentStoreName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  currentStoreTotal: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.lg,
  },

  // Alternatives Section
  alternativesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  alternativesHeaderText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  alternativesList: {
    maxHeight: 300,
  },
  alternativesContent: {
    gap: spacing.md,
  },

  // Alternative Card
  alternativeCard: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    gap: spacing.md,
  },
  alternativeCardBestDeal: {
    borderColor: colors.accent.warm,
    backgroundColor: "rgba(255, 176, 136, 0.08)",
  },
  alternativeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  storeNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  alternativeStoreName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "600",
    flex: 1,
  },
  bestDealBadge: {
    marginLeft: spacing.xs,
  },
  priceColumn: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  alternativeTotal: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  savingsBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  savingsText: {
    ...typography.labelSmall,
    color: colors.accent.success,
    fontWeight: "600",
  },

  // Switch Button
  switchButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  switchButtonText: {
    ...typography.labelMedium,
    fontWeight: "600",
  },

  // Items Compared Note
  itemsComparedContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    alignItems: "center",
    gap: spacing.xs,
  },
  itemsComparedText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  itemsIssuesText: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.text.disabled,
    fontStyle: "italic",
    textAlign: "center",
  },

  // Empty State
  emptyStateContainer: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
  },
  emptyStateSubtext: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
  },

  // Skeleton styles
  skeletonHeader: {
    width: 160,
    height: 24,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: spacing.lg,
  },
  skeletonCurrentStore: {
    width: 120,
    height: 16,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: spacing.xs,
  },
  skeletonCurrentTotal: {
    width: 80,
    height: 28,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  skeletonAlternativesHeader: {
    width: 180,
    height: 16,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: spacing.md,
  },
  skeletonCard: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  skeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeletonStoreName: {
    width: 80,
    height: 18,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  skeletonPrice: {
    width: 60,
    height: 22,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  skeletonButton: {
    width: "100%",
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default ListComparisonSummary;
