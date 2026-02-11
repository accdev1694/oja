/**
 * SizePriceModal - Bottom sheet for selecting item size and price
 *
 * This modal appears when adding an item to a shopping list, showing
 * available sizes with prices for the list's selected store.
 *
 * Features:
 * - Horizontal scrollable size options using SizeOptionCard
 * - Shows best value and "your usual" indicators
 * - Loading skeleton state
 * - Manual entry fallback when no variants found
 * - Glassmorphic styling with haptic feedback
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { GlassModal, GlassButton, colors, typography, spacing, borderRadius } from "@/components/ui/glass";
import { haptic } from "@/lib/haptics/safeHaptics";
import {
  trackSizePriceModalOpened,
  trackSizeSelected,
  type AnalyticsPriceSource,
} from "@/lib/analytics";
import { useNetworkStatus } from "@/lib/network/useNetworkStatus";
import {
  SizeOptionCard,
  SizeOptionCardSkeleton,
  type PriceSource,
} from "./SizeOptionCard";

// =============================================================================
// TYPES
// =============================================================================

export interface SizeOption {
  size: string;
  sizeNormalized: string;
  price: number | null;
  pricePerUnit: number | null;
  unitLabel: string;
  source: PriceSource;
  confidence: number;
  isUsual: boolean;
}

export interface SizePriceModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called when the modal is dismissed */
  onClose: () => void;
  /** Item name being added */
  itemName: string;
  /** Store name for display (e.g., "Tesco") */
  storeName: string;
  /** Store ID for analytics (e.g., "tesco") */
  storeId?: string;
  /** Store color for branding */
  storeColor?: string;
  /** Available size options from getSizesForStore query */
  sizes: SizeOption[];
  /** Pre-selected size (user's usual or default) */
  defaultSize?: string;
  /** Called when user confirms adding the item */
  onAddItem: (data: {
    size: string;
    price: number;
    priceSource: PriceSource;
    confidence: number;
  }) => void;
  /** Loading state while fetching sizes */
  isLoading?: boolean;
  /** Category for manual entry AI estimation */
  category?: string;
  /** Error state when fetching sizes fails */
  error?: Error | null;
  /** Callback to retry fetching sizes */
  onRetry?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatPrice(price: number | null): string {
  if (price === null) return "--";
  return `£${price.toFixed(2)}`;
}

function findBestValueIndex(sizes: SizeOption[]): number {
  if (sizes.length === 0) return -1;

  let bestIdx = -1;
  let lowestPPU = Infinity;

  sizes.forEach((s, idx) => {
    if (s.pricePerUnit !== null && s.pricePerUnit < lowestPPU) {
      lowestPPU = s.pricePerUnit;
      bestIdx = idx;
    }
  });

  return bestIdx;
}


/**
 * Convert PriceSource to AnalyticsPriceSource
 */
function toAnalyticsPriceSource(source: PriceSource): AnalyticsPriceSource {
  return source as AnalyticsPriceSource;
}

// =============================================================================
// EMPTY STATE SUBCOMPONENT
// =============================================================================

interface EmptyStateProps {
  itemName: string;
}

function EmptyState({ itemName }: EmptyStateProps) {
  return (
    <View style={styles.emptyState} accessible accessibilityRole="text">
      <View style={styles.emptyStateIconContainer}>
        <MaterialCommunityIcons
          name="package-variant"
          size={32}
          color={colors.text.tertiary}
        />
      </View>
      <Text style={styles.emptyStateTitle}>No size variants found</Text>
      <Text style={styles.emptyStateSubtitle}>
        We don't have size/price data for "{itemName}" at this store yet
      </Text>
    </View>
  );
}

// =============================================================================
// MANUAL ENTRY SUBCOMPONENT
// =============================================================================

interface ManualEntryProps {
  onSubmit: (size: string, price: number) => void;
}

function ManualEntry({ onSubmit }: ManualEntryProps) {
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");

  const isValid = size.trim().length > 0 && parseFloat(price) > 0;

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    haptic("light");
    onSubmit(size.trim(), parseFloat(price));
  }, [isValid, size, price, onSubmit]);

  return (
    <View style={styles.manualEntry}>
      <View style={styles.manualEntryHeader}>
        <MaterialCommunityIcons
          name="pencil-plus"
          size={18}
          color={colors.accent.primary}
        />
        <Text style={styles.manualEntryTitle}>Enter size & price manually</Text>
      </View>

      <View style={styles.manualInputRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel} nativeID="sizeInputLabel">Size</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={size}
              onChangeText={setSize}
              placeholder="e.g., 500ml"
              placeholderTextColor={colors.text.tertiary}
              accessibilityLabel="Size"
              accessibilityHint="Enter the product size, for example 500ml or 2 pints"
              accessibilityLabelledBy="sizeInputLabel"
            />
          </View>
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel} nativeID="priceInputLabel">Price</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencyPrefix} accessibilityElementsHidden>£</Text>
            <TextInput
              style={styles.textInput}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
              accessibilityLabel="Price in pounds"
              accessibilityHint="Enter the price in pounds"
              accessibilityLabelledBy="priceInputLabel"
            />
          </View>
        </View>
      </View>

      <GlassButton
        variant="primary"
        size="md"
        onPress={handleSubmit}
        disabled={!isValid}
        icon="plus"
        style={styles.manualAddButton}
      >
        {isValid ? `Add ${formatPrice(parseFloat(price))}` : "Add Item"}
      </GlassButton>
    </View>
  );
}

// =============================================================================
// ERROR STATE SUBCOMPONENT
// =============================================================================

interface ErrorStateProps {
  onRetry?: () => void;
  onManualEntry: () => void;
}

function ErrorState({ onRetry, onManualEntry }: ErrorStateProps) {
  const handleRetry = useCallback(() => {
    haptic("medium");
    onRetry?.();
  }, [onRetry]);

  const handleManualEntry = useCallback(() => {
    haptic("light");
    onManualEntry();
  }, [onManualEntry]);

  return (
    <View style={styles.errorState} accessible accessibilityRole="alert">
      <View style={styles.errorIconContainer}>
        <MaterialCommunityIcons
          name="wifi-off"
          size={32}
          color={colors.accent.error}
        />
      </View>
      <Text style={styles.errorTitle}>Couldn't load prices</Text>
      <Text style={styles.errorSubtitle}>
        Check your connection and try again
      </Text>
      <View style={styles.errorActions}>
        {onRetry && (
          <GlassButton
            variant="primary"
            size="md"
            onPress={handleRetry}
            icon="refresh"
            style={styles.retryButton}
          >
            Try Again
          </GlassButton>
        )}
        <GlassButton
          variant="ghost"
          size="md"
          onPress={handleManualEntry}
          icon="pencil"
        >
          Enter Manually
        </GlassButton>
      </View>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SizePriceModal({
  visible,
  onClose,
  itemName,
  storeName,
  storeId,
  storeColor,
  sizes,
  defaultSize,
  onAddItem,
  isLoading = false,
  category,
  error = null,
  onRetry,
}: SizePriceModalProps) {
  // Network status for offline handling
  // Note: Convex automatically queues mutations when offline and syncs when reconnected
  const { isConnected } = useNetworkStatus();

  // State for showing manual entry after error
  const [showManualAfterError, setShowManualAfterError] = useState(false);

  // Track if we've already fired the modal opened event for this visibility session
  const hasTrackedOpen = useRef(false);

  // Reset manual entry state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setShowManualAfterError(false);
      hasTrackedOpen.current = false;
    }
  }, [visible]);

  // Track modal opened event when modal becomes visible and sizes are loaded
  useEffect(() => {
    if (visible && !isLoading && !hasTrackedOpen.current) {
      hasTrackedOpen.current = true;
      trackSizePriceModalOpened(
        itemName,
        storeId || storeName.toLowerCase(),
        sizes.length
      );
    }
  }, [visible, isLoading, itemName, storeId, storeName, sizes.length]);

  // Find initial selection: defaultSize, or user's usual, or first option
  const initialSelection = useMemo(() => {
    if (defaultSize) {
      const idx = sizes.findIndex((s) => s.size === defaultSize);
      if (idx >= 0) return idx;
    }
    const usualIdx = sizes.findIndex((s) => s.isUsual);
    if (usualIdx >= 0) return usualIdx;
    return sizes.length > 0 ? 0 : -1;
  }, [sizes, defaultSize]);

  const [selectedIndex, setSelectedIndex] = useState(initialSelection);

  // Update selection when sizes change
  useEffect(() => {
    setSelectedIndex(initialSelection);
  }, [initialSelection]);

  // Find best value option
  const bestValueIndex = useMemo(() => findBestValueIndex(sizes), [sizes]);

  // Selected option (with bounds check)
  const selectedOption = selectedIndex >= 0 && selectedIndex < sizes.length
    ? sizes[selectedIndex]
    : null;

  // Handle selection with analytics
  const handleSelect = useCallback((index: number) => {
    haptic("selection");
    setSelectedIndex(index);

    // Track size selection
    const option = sizes[index];
    if (option && option.price !== null) {
      trackSizeSelected(
        itemName,
        option.size,
        option.price,
        toAnalyticsPriceSource(option.source),
        storeId || storeName.toLowerCase()
      );
    }
  }, [sizes, itemName, storeId, storeName]);

  // Handle add
  const handleAdd = useCallback(() => {
    if (!selectedOption || selectedOption.price === null) return;

    haptic("success");
    onAddItem({
      size: selectedOption.size,
      price: selectedOption.price,
      priceSource: selectedOption.source,
      confidence: selectedOption.confidence,
    });
  }, [selectedOption, onAddItem]);

  // Handle manual entry
  const handleManualEntry = useCallback((size: string, price: number) => {
    onAddItem({
      size,
      price,
      priceSource: "manual" as PriceSource,
      confidence: 1,
    });
  }, [onAddItem]);

  // Handle close
  const handleClose = useCallback(() => {
    haptic("light");
    onClose();
  }, [onClose]);

  // Handle switching to manual entry from error state
  const handleSwitchToManualEntry = useCallback(() => {
    haptic("light");
    setShowManualAfterError(true);
  }, []);

  // Handle retry
  const handleRetry = useCallback(() => {
    haptic("medium");
    setShowManualAfterError(false);
    onRetry?.();
  }, [onRetry]);

  const hasError = error !== null && !showManualAfterError;
  const showNoVariants = !isLoading && !hasError && sizes.length === 0;
  const showManualEntry = showNoVariants || showManualAfterError;
  const canAdd = selectedOption !== null && selectedOption.price !== null;

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
        accessibilityLabel={`Adding ${itemName} to shopping list. ${storeName} prices.`}
      >
        <View style={styles.headerIcon} accessibilityElementsHidden>
          <MaterialCommunityIcons
            name="cart-plus"
            size={24}
            color={colors.accent.primary}
          />
        </View>
        <Text style={styles.title}>Adding: {itemName}</Text>
        <Text style={[styles.storeName, storeColor ? { color: storeColor } : null]}>
          {storeName} prices
        </Text>
        {/* Offline indicator - Convex will queue the add and sync when connected */}
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

      {/* Loading state */}
      {isLoading && (
        <View
          style={styles.sizesContainer}
          accessible
          accessibilityLabel="Loading size options"
          accessibilityRole="progressbar"
        >
          <SizeOptionCardSkeleton count={3} />
        </View>
      )}

      {/* Error state */}
      {hasError && (
        <ErrorState
          onRetry={onRetry ? handleRetry : undefined}
          onManualEntry={handleSwitchToManualEntry}
        />
      )}

      {/* Size options */}
      {!isLoading && !hasError && sizes.length > 0 && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sizesScrollContent}
            style={styles.sizesScroll}
            accessible
            accessibilityRole="radiogroup"
            accessibilityLabel={`${sizes.length} size options available. Swipe left or right to browse.`}
          >
            {sizes.map((option, index) => (
              <SizeOptionCard
                key={`${option.size}-${option.source}-${index}`}
                size={option.sizeNormalized || option.size}
                price={option.price}
                pricePerUnit={option.pricePerUnit}
                unitLabel={option.unitLabel}
                priceSource={option.source}
                confidence={option.confidence}
                isUsual={option.isUsual}
                isBestValue={index === bestValueIndex}
                isSelected={index === selectedIndex}
                onSelect={() => handleSelect(index)}
              />
            ))}
          </ScrollView>

          {/* Legend */}
          <View style={styles.legend} accessibilityRole="text" accessible accessibilityLabel="Legend: Green star means best value, orange star means your usual purchase">
            <View style={styles.legendItem} accessibilityElementsHidden>
              <MaterialCommunityIcons
                name="star"
                size={12}
                color={colors.accent.success}
              />
              <Text style={styles.legendText}>Best value</Text>
            </View>
            <View style={styles.legendItem} accessibilityElementsHidden>
              <MaterialCommunityIcons
                name="star"
                size={12}
                color={colors.accent.warm}
              />
              <Text style={styles.legendText}>Your usual</Text>
            </View>
          </View>
        </>
      )}

      {/* Empty state + Manual entry - shown when no variants OR user chose manual after error */}
      {showManualEntry && (
        <>
          {showNoVariants && <EmptyState itemName={itemName} />}
          <View style={styles.divider} />
          <ManualEntry onSubmit={handleManualEntry} />
        </>
      )}

      {/* Actions - only shown when we have size options (not error, not manual entry) */}
      {!showManualEntry && !hasError && (
        <View style={styles.actions}>
          <GlassButton
            variant="ghost"
            size="lg"
            onPress={handleClose}
            style={styles.cancelButton}
          >
            Cancel
          </GlassButton>
          <GlassButton
            variant="primary"
            size="lg"
            onPress={handleAdd}
            disabled={!canAdd || isLoading}
            loading={isLoading}
            icon="plus"
            style={styles.addButton}
          >
            {`Add ${formatPrice(selectedOption?.price ?? null)}`}
          </GlassButton>
        </View>
      )}
    </GlassModal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Header
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 212, 170, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
  },
  storeName: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
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

  // Sizes
  sizesContainer: {
    marginBottom: spacing.lg,
  },
  sizesScroll: {
    marginHorizontal: -spacing.xl,
  },
  sizesScrollContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },

  // Legend
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },

  // Actions
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 0.4,
  },
  addButton: {
    flex: 0.6,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  emptyStateIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.glass.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.md,
  },

  // Error State
  errorState: {
    alignItems: "center",
    paddingVertical: spacing["2xl"],
    gap: spacing.md,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  errorTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    textAlign: "center",
  },
  errorSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
  },
  errorActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  retryButton: {
    minWidth: 120,
  },

  // Manual Entry
  manualEntry: {
    paddingVertical: spacing.md,
  },
  manualEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  manualEntryTitle: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },
  manualInputRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: 0,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  currencyPrefix: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  manualAddButton: {
    marginTop: spacing.sm,
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default SizePriceModal;
