/**
 * StoreChip - Colored pill component with store name and optional price
 *
 * Features:
 * - Store brand color background/border
 * - Optional price display
 * - Selectable state with visual feedback
 * - Three size variants (small, medium, large)
 * - Glassmorphic styling with store accent
 * - Haptic feedback on press
 */

import React, { memo, useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";

import { haptic } from "@/lib/haptics/safeHaptics";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  animations,
} from "@/lib/design/glassTokens";
import {
  getStoreInfoSafe,
  type UKStoreId,
} from "@/convex/lib/storeNormalizer";

// =============================================================================
// TYPES
// =============================================================================

export interface StoreChipProps {
  /** Normalized store ID (e.g., "tesco", "aldi") */
  storeId: string;
  /** Override display name (uses store's default if not provided) */
  displayName?: string;
  /** Optional price to show on the chip */
  price?: number | null;
  /** Whether this chip is currently selected */
  isSelected?: boolean;
  /** Callback when chip is pressed */
  onPress?: () => void;
  /** Size variant */
  size?: "small" | "medium" | "large";
  /** Whether the chip is disabled */
  disabled?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price for display
 */
function formatPrice(price: number | null | undefined): string | null {
  if (price === null || price === undefined) return null;
  return `£${price.toFixed(2)}`;
}

/**
 * Get contrasting text color for a given background
 * Uses luminance calculation to determine if text should be light or dark
 */
function getContrastingColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark backgrounds, dark for light backgrounds
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

/**
 * Create a lighter/transparent version of a color for backgrounds
 */
function getTransparentColor(hexColor: string, opacity: number): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const StoreChip = memo(function StoreChip({
  storeId,
  displayName,
  price,
  isSelected = false,
  onPress,
  size = "medium",
  disabled = false,
}: StoreChipProps) {
  // Get store info for colors and display name
  const storeInfo = useMemo(() => getStoreInfoSafe(storeId), [storeId]);

  const storeColor = storeInfo?.color ?? colors.accent.secondary;
  const storeName = displayName ?? storeInfo?.displayName ?? storeId;

  // Animation values
  const scale = useSharedValue(1);
  const selected = useSharedValue(isSelected ? 1 : 0);

  // Update selected animation when prop changes
  React.useEffect(() => {
    selected.value = withSpring(isSelected ? 1 : 0, animations.spring.gentle);
  }, [isSelected, selected]);

  // Animated styles
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(
      selected.value,
      [0, 1],
      [getTransparentColor(storeColor, 0.4), storeColor]
    ),
    backgroundColor: interpolateColor(
      selected.value,
      [0, 1],
      [getTransparentColor(storeColor, 0.15), getTransparentColor(storeColor, 0.35)]
    ),
  }));

  // Press handlers
  const handlePressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(animations.pressScale, animations.spring.stiff);
  }, [disabled, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animations.spring.gentle);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled || !onPress) return;
    haptic("selection");
    onPress();
  }, [disabled, onPress]);

  // Size-specific styles
  const sizeStyles = useMemo(() => {
    switch (size) {
      case "small":
        return {
          container: styles.containerSmall,
          name: styles.nameSmall,
          price: styles.priceSmall,
        };
      case "large":
        return {
          container: styles.containerLarge,
          name: styles.nameLarge,
          price: styles.priceLarge,
        };
      default:
        return {
          container: styles.containerMedium,
          name: styles.nameMedium,
          price: styles.priceMedium,
        };
    }
  }, [size]);

  const formattedPrice = formatPrice(price);

  return (
    <Animated.View style={[styles.container, sizeStyles.container, animatedContainerStyle]}>
      <Pressable
        style={styles.pressable}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || !onPress}
        accessibilityRole="button"
        accessibilityState={{
          selected: isSelected,
          disabled,
        }}
        accessibilityLabel={`${storeName}${formattedPrice ? ` at ${formattedPrice}` : ""}`}
      >
        {/* Store Color Indicator */}
        <View style={[styles.colorIndicator, { backgroundColor: storeColor }]} />

        {/* Store Name */}
        <Text
          style={[
            styles.name,
            sizeStyles.name,
            isSelected && styles.nameSelected,
            disabled && styles.nameDisabled,
          ]}
          numberOfLines={1}
        >
          {storeName}
        </Text>

        {/* Price (if provided) */}
        {formattedPrice && (
          <Text
            style={[
              styles.price,
              sizeStyles.price,
              isSelected && styles.priceSelected,
              disabled && styles.priceDisabled,
            ]}
          >
            {formattedPrice}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  containerSmall: {
    minHeight: 28,
  },
  containerMedium: {
    minHeight: 36,
  },
  containerLarge: {
    minHeight: 44,
  },
  pressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: "100%",
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  name: {
    color: colors.text.primary,
    fontWeight: "600",
  },
  nameSmall: {
    ...typography.bodySmall,
    fontSize: 11,
  },
  nameMedium: {
    ...typography.bodyMedium,
  },
  nameLarge: {
    ...typography.bodyLarge,
  },
  nameSelected: {
    color: colors.text.primary,
  },
  nameDisabled: {
    color: colors.text.disabled,
  },
  price: {
    color: colors.text.secondary,
    fontWeight: "600",
  },
  priceSmall: {
    ...typography.bodySmall,
    fontSize: 11,
  },
  priceMedium: {
    ...typography.bodyMedium,
  },
  priceLarge: {
    ...typography.bodyLarge,
  },
  priceSelected: {
    color: colors.text.primary,
  },
  priceDisabled: {
    color: colors.text.disabled,
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default StoreChip;
