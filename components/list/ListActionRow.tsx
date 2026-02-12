/**
 * ListActionRow - Three-button horizontal action row for list detail header
 *
 * Displays Budget, Store, and Add Items buttons in a row.
 * The Add Items button is disabled until a store is selected.
 */

import { memo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "@/components/ui/glass";
import { haptic } from "@/lib/haptics/safeHaptics";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListActionRowProps {
  budget: number;
  storeName?: string;
  storeColor?: string;
  hasStore: boolean;
  onBudgetPress: () => void;
  onStorePress: () => void;
  onAddItemsPress: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const ListActionRow = memo(function ListActionRow({
  budget,
  storeName,
  storeColor,
  hasStore,
  onBudgetPress,
  onStorePress,
  onAddItemsPress,
}: ListActionRowProps) {
  const handleBudgetPress = useCallback(() => {
    haptic("light");
    onBudgetPress();
  }, [onBudgetPress]);

  const handleStorePress = useCallback(() => {
    haptic("light");
    onStorePress();
  }, [onStorePress]);

  const handleAddItemsPress = useCallback(() => {
    if (!hasStore) return;
    haptic("light");
    onAddItemsPress();
  }, [hasStore, onAddItemsPress]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {/* Budget Button */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleBudgetPress}
          accessibilityLabel={`Budget: ${budget} pounds`}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="wallet-outline"
            size={18}
            color={colors.text.secondary}
          />
          <Text style={styles.buttonText} numberOfLines={1}>
            £{budget}
          </Text>
        </Pressable>

        {/* Store Button */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleStorePress}
          accessibilityLabel={hasStore ? `Store: ${storeName}` : "Select store"}
          accessibilityRole="button"
        >
          {hasStore && storeColor ? (
            <View
              style={[styles.storeDot, { backgroundColor: storeColor }]}
            />
          ) : null}
          <Text
            style={[styles.buttonText, hasStore && styles.storeNameText]}
            numberOfLines={1}
          >
            {hasStore && storeName ? storeName : "Store"}
          </Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={16}
            color={colors.text.tertiary}
          />
        </Pressable>

        {/* Add Items Button */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            hasStore ? styles.buttonActive : styles.buttonDisabled,
            hasStore && pressed && styles.buttonActivePressed,
          ]}
          onPress={handleAddItemsPress}
          disabled={!hasStore}
          accessibilityLabel="Add items"
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasStore }}
        >
          {hasStore ? (
            <MaterialCommunityIcons
              name="plus"
              size={18}
              color={colors.accent.primary}
            />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              hasStore ? styles.addItemsTextActive : styles.addItemsTextDisabled,
            ]}
            numberOfLines={1}
          >
            Add Items
          </Text>
        </Pressable>
      </View>

      {/* Disabled hint */}
      {!hasStore && (
        <Text style={styles.hintText}>Pick a store to see prices</Text>
      )}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
  },
  buttonPressed: {
    backgroundColor: colors.glass.backgroundActive,
  },
  buttonActive: {
    borderColor: "rgba(0, 212, 170, 0.3)",
    backgroundColor: "rgba(0, 212, 170, 0.08)",
  },
  buttonActivePressed: {
    backgroundColor: "rgba(0, 212, 170, 0.15)",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...typography.labelMedium,
    color: colors.text.secondary,
  },
  storeNameText: {
    color: colors.text.primary,
    flexShrink: 1,
  },
  addItemsTextActive: {
    color: colors.accent.primary,
  },
  addItemsTextDisabled: {
    color: colors.text.disabled,
  },
  storeDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  hintText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
  },
});
