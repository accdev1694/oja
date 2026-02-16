/**
 * ListActionRow - Store dropdown and Add Items button for list header.
 */

import { memo, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  GuidedBorder,
} from "@/components/ui/glass";
import { haptic } from "@/lib/haptics/safeHaptics";
import { getAllStores, getStoreInfoSafe } from "@/convex/lib/storeNormalizer";
import type { StoreInfo } from "@/convex/lib/storeNormalizer";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListActionRowProps {
  storeName?: string;
  storeColor?: string;
  hasStore: boolean;
  currentStoreId?: string;
  userFavorites: string[];
  itemCount: number;
  onStoreSelect: (storeId: string) => void;
  onAddItemsPress: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const ListActionRow = memo(function ListActionRow({
  storeName,
  storeColor,
  hasStore,
  currentStoreId,
  userFavorites,
  itemCount,
  onStoreSelect,
  onAddItemsPress,
}: ListActionRowProps) {
  // ── Store dropdown state ──────────────────────────────────────────────────
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
    setShowStoreDropdown((prev) => !prev);
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
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {/* Store Selector */}
        <GuidedBorder
          active={!hasStore}
          borderRadius={borderRadius.md}
          style={styles.storeAnchor}
        >
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
              name={showStoreDropdown ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.text.tertiary}
            />
          </Pressable>
        </GuidedBorder>

        {/* Add Items Button */}
        <GuidedBorder
          active={hasStore && itemCount === 0}
          borderRadius={borderRadius.md}
          style={{ flex: 1 }}
        >
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
        </GuidedBorder>
      </View>

      {!hasStore && (
        <Text style={styles.hintText}>Pick a store to see prices</Text>
      )}

      {/* Inline Store Dropdown — at wrapper level so it spans full width */}
      {showStoreDropdown && (
        <>
          <Pressable
            style={styles.backdrop}
            onPress={() => setShowStoreDropdown(false)}
          />
          <View style={styles.dropdown}>
            <ScrollView
              style={styles.dropdownScroll}
              contentContainerStyle={styles.dropdownScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              nestedScrollEnabled
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
          </View>
        </>
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
    zIndex: 10,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    zIndex: 3,
    elevation: 9,
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
    zIndex: 3,
    elevation: 9,
  },

  // Store anchor
  storeAnchor: {
    flex: 1,
  },

  // Store dropdown
  backdrop: {
    position: "absolute",
    top: -1000,
    bottom: -1000,
    left: -1000,
    right: -1000,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1,
  },
  dropdown: {
    maxHeight: 265,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.glass.borderFocus,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    zIndex: 2,
    elevation: 8,
  },
  dropdownScroll: {
    maxHeight: 255,
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
    paddingHorizontal: spacing.md,
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
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.secondary,
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
