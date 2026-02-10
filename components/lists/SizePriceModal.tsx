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

import React, { useState, useCallback, useMemo, useEffect } from "react";
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

// =============================================================================
// MANUAL ENTRY SUBCOMPONENT
// =============================================================================

interface ManualEntryProps {
  onSubmit: (size: string, price: number) => void;
  itemName: string;
}

function ManualEntry({ onSubmit, itemName }: ManualEntryProps) {
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
          size={20}
          color={colors.text.secondary}
        />
        <Text style={styles.manualEntryTitle}>
          No sizes found for {itemName}
        </Text>
      </View>
      <Text style={styles.manualEntrySubtitle}>
        Enter the size and price manually:
      </Text>

      <View style={styles.manualInputRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Size</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={size}
              onChangeText={setSize}
              placeholder="e.g., 500ml"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Price</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencyPrefix}>£</Text>
            <TextInput
              style={styles.textInput}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="decimal-pad"
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
// MAIN COMPONENT
// =============================================================================

export function SizePriceModal({
  visible,
  onClose,
  itemName,
  storeName,
  storeColor,
  sizes,
  defaultSize,
  onAddItem,
  isLoading = false,
  category,
}: SizePriceModalProps) {
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

  // Selected option
  const selectedOption = selectedIndex >= 0 ? sizes[selectedIndex] : null;

  // Handle selection
  const handleSelect = useCallback((index: number) => {
    haptic("selection");
    setSelectedIndex(index);
  }, []);

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

  const showNoVariants = !isLoading && sizes.length === 0;
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
      <View style={styles.header}>
        <View style={styles.headerIcon}>
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
      </View>

      {/* Loading state */}
      {isLoading && (
        <View style={styles.sizesContainer}>
          <SizeOptionCardSkeleton count={3} />
        </View>
      )}

      {/* Size options */}
      {!isLoading && sizes.length > 0 && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sizesScrollContent}
            style={styles.sizesScroll}
          >
            {sizes.map((option, index) => (
              <SizeOptionCard
                key={option.size}
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
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons
                name="star"
                size={12}
                color={colors.accent.success}
              />
              <Text style={styles.legendText}>Best value</Text>
            </View>
            <View style={styles.legendItem}>
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

      {/* No variants - show manual entry */}
      {showNoVariants && (
        <ManualEntry onSubmit={handleManualEntry} itemName={itemName} />
      )}

      {/* Actions */}
      {!showNoVariants && (
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

  // Manual Entry
  manualEntry: {
    paddingVertical: spacing.md,
  },
  manualEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  manualEntryTitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  manualEntrySubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
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
