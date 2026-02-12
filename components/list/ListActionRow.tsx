/**
 * ListActionRow - Budget input, Store dropdown, and Add Items button for list header.
 */

import { memo, useCallback, useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "@/components/ui/glass";
import { haptic } from "@/lib/haptics/safeHaptics";
import { getAllStores, getStoreInfoSafe } from "@/convex/lib/storeNormalizer";
import type { StoreInfo } from "@/convex/lib/storeNormalizer";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListActionRowProps {
  budget: number;
  storeName?: string;
  storeColor?: string;
  hasStore: boolean;
  currentStoreId?: string;
  userFavorites: string[];
  onBudgetChange: (newBudget: number | undefined) => Promise<void>;
  onStoreSelect: (storeId: string) => void;
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
  currentStoreId,
  userFavorites,
  onBudgetChange,
  onStoreSelect,
  onAddItemsPress,
}: ListActionRowProps) {
  // ── Budget input state ──────────────────────────────────────────────────────
  const [budgetText, setBudgetText] = useState(budget > 0 ? String(budget) : "");
  const [budgetFocused, setBudgetFocused] = useState(false);

  // Sync from parent when budget changes externally (e.g. from CircularBudgetDial modal)
  useEffect(() => {
    if (!budgetFocused) {
      setBudgetText(budget > 0 ? String(budget) : "");
    }
  }, [budget, budgetFocused]);

  const handleBudgetBlur = useCallback(() => {
    setBudgetFocused(false);
    const parsed = parseFloat(budgetText);
    if (budgetText.trim() === "" || isNaN(parsed) || parsed <= 0) {
      onBudgetChange(undefined);
      setBudgetText("");
    } else {
      onBudgetChange(parsed);
      setBudgetText(String(parsed));
    }
  }, [budgetText, onBudgetChange]);

  const handleBudgetSubmit = useCallback(() => {
    handleBudgetBlur();
  }, [handleBudgetBlur]);

  // ── Store dropdown state ────────────────────────────────────────────────────
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);

  const { favStores, otherStores } = useMemo(() => {
    const allStores = getAllStores();
    const favSet = new Set(userFavorites);

    const favs: StoreInfo[] = [];
    for (const favId of userFavorites) {
      const info = getStoreInfoSafe(favId);
      if (info) favs.push(info);
    }

    const others = allStores.filter((s) => !favSet.has(s.id));
    return { favStores: favs, otherStores: others };
  }, [userFavorites]);

  const handleStorePress = useCallback(() => {
    haptic("light");
    setShowStoreDropdown(true);
  }, []);

  const handleStoreSelect = useCallback(
    (storeId: string) => {
      haptic("light");
      onStoreSelect(storeId);
      setShowStoreDropdown(false);
    },
    [onStoreSelect],
  );

  const handleAddItemsPress = useCallback(() => {
    if (!hasStore) return;
    haptic("light");
    onAddItemsPress();
  }, [hasStore, onAddItemsPress]);

  return (
    <>
      <View style={styles.wrapper}>
        <View style={styles.row}>
          {/* Budget Input */}
          <View style={[styles.inputContainer, budgetFocused && styles.inputContainerFocused]}>
            <Text style={styles.currencyPrefix}>£</Text>
            <TextInput
              style={styles.budgetInput}
              value={budgetText}
              onChangeText={setBudgetText}
              onFocus={() => setBudgetFocused(true)}
              onBlur={handleBudgetBlur}
              onSubmitEditing={handleBudgetSubmit}
              placeholder="Budget"
              placeholderTextColor={colors.text.disabled}
              keyboardType="decimal-pad"
              returnKeyType="done"
              accessibilityLabel="Budget amount"
            />
          </View>

          {/* Store Selector */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              showStoreDropdown && styles.buttonActive,
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

        {!hasStore && (
          <Text style={styles.hintText}>Pick a store to see prices</Text>
        )}
      </View>

      {/* Store Dropdown Modal */}
      <Modal
        visible={showStoreDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStoreDropdown(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setShowStoreDropdown(false)}
        >
          <Pressable
            style={styles.dropdown}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              style={styles.dropdownScroll}
              contentContainerStyle={styles.dropdownScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {favStores.length > 0 && (
                <>
                  <Text style={styles.dropdownSectionHeader}>YOUR STORES</Text>
                  {favStores.map((store) => (
                    <Pressable
                      key={store.id}
                      style={[
                        styles.storeRow,
                        store.id === currentStoreId && styles.storeRowSelected,
                      ]}
                      onPress={() => handleStoreSelect(store.id)}
                    >
                      <View style={[styles.storeDot, { backgroundColor: store.color }]} />
                      <Text
                        style={[
                          styles.storeRowText,
                          store.id === currentStoreId && styles.storeRowTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {store.displayName}
                      </Text>
                      {store.id === currentStoreId && (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color={colors.accent.primary}
                        />
                      )}
                    </Pressable>
                  ))}
                </>
              )}

              {otherStores.length > 0 && (
                <>
                  {favStores.length > 0 && <View style={styles.dropdownDivider} />}
                  <Text style={styles.dropdownSectionHeader}>ALL STORES</Text>
                  {otherStores.map((store) => (
                    <Pressable
                      key={store.id}
                      style={[
                        styles.storeRow,
                        store.id === currentStoreId && styles.storeRowSelected,
                      ]}
                      onPress={() => handleStoreSelect(store.id)}
                    >
                      <View style={[styles.storeDot, { backgroundColor: store.color }]} />
                      <Text
                        style={[
                          styles.storeRowText,
                          store.id === currentStoreId && styles.storeRowTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {store.displayName}
                      </Text>
                      {store.id === currentStoreId && (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color={colors.accent.primary}
                        />
                      )}
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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

  // Budget input
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  inputContainerFocused: {
    borderColor: colors.accent.primary,
  },
  currencyPrefix: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    marginRight: 2,
  },
  budgetInput: {
    flex: 1,
    ...typography.labelMedium,
    color: colors.text.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
  },

  // Shared button
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

  // Store dropdown
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dropdown: {
    width: "88%",
    maxHeight: 420,
    backgroundColor: "rgba(15, 23, 42, 0.97)",
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  dropdownScroll: {
    maxHeight: 410,
  },
  dropdownScrollContent: {
    paddingVertical: spacing.sm,
  },
  dropdownSectionHeader: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 11,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.xs,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  storeRowSelected: {
    backgroundColor: "rgba(0, 212, 170, 0.08)",
  },
  storeRowText: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    flex: 1,
    fontSize: 15,
    marginLeft: spacing.md,
  },
  storeRowTextSelected: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
});
