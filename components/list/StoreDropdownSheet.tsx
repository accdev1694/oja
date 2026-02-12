/**
 * StoreDropdownSheet - Bottom sheet for selecting a store for a shopping list.
 *
 * Displays two sections:
 *  1. YOUR STORES - The user's favourite stores (preserved order)
 *  2. ALL STORES  - Remaining stores sorted by market share
 *
 * Uses GlassModal in bottom-anchored mode since @gorhom/bottom-sheet is not
 * installed. Each row shows a brand-colour dot, store name, and a checkmark
 * if the store is currently selected.
 */

import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  type ListRenderItemInfo,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassModal,
  AnimatedPressable,
  colors,
  spacing,
  typography,
  borderRadius,
} from "@/components/ui/glass";
import { haptic } from "@/lib/haptics/safeHaptics";
import { getAllStores, getStoreInfoSafe } from "@/convex/lib/storeNormalizer";
import type { StoreInfo } from "@/convex/lib/storeNormalizer";

// ── Types ────────────────────────────────────────────────────────────────────

export interface StoreDropdownSheetProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Called when the user requests close (backdrop tap or close button) */
  onClose: () => void;
  /** Called when a store is selected */
  onSelect: (storeId: string) => void;
  /** Currently selected store ID (shows checkmark) */
  currentStoreId?: string;
  /** User's favourite store IDs (shown in "YOUR STORES" section) */
  userFavorites: string[];
}

// ── Section item discriminated union ─────────────────────────────────────────

interface StoreRow {
  type: "store";
  store: StoreInfo;
}

interface SectionHeader {
  type: "header";
  title: string;
}

type ListItem = StoreRow | SectionHeader;

// ── Component ────────────────────────────────────────────────────────────────

export function StoreDropdownSheet({
  visible,
  onClose,
  onSelect,
  currentStoreId,
  userFavorites,
}: StoreDropdownSheetProps) {
  // ── Compute sections ──────────────────────────────────────────────────────

  const sections = useMemo<ListItem[]>(() => {
    const allStores = getAllStores();
    const favSet = new Set(userFavorites);

    // User stores: preserve the order of userFavorites
    const userStores: StoreInfo[] = [];
    for (const favId of userFavorites) {
      const info = getStoreInfoSafe(favId);
      if (info) {
        userStores.push(info);
      }
    }

    // Other stores: remaining stores (already sorted by market share from getAllStores)
    const otherStores = allStores.filter((s) => !favSet.has(s.id));

    const items: ListItem[] = [];

    if (userStores.length > 0) {
      items.push({ type: "header", title: "YOUR STORES" });
      for (const store of userStores) {
        items.push({ type: "store", store });
      }
    }

    if (otherStores.length > 0) {
      items.push({ type: "header", title: "ALL STORES" });
      for (const store of otherStores) {
        items.push({ type: "store", store });
      }
    }

    return items;
  }, [userFavorites]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (storeId: string) => {
      haptic("light");
      onSelect(storeId);
    },
    [onSelect],
  );

  // ── Key extractor ─────────────────────────────────────────────────────────

  const keyExtractor = useCallback((item: ListItem, index: number) => {
    if (item.type === "header") {
      return `header-${item.title}-${index}`;
    }
    return `store-${item.store.id}`;
  }, []);

  // ── Render item ───────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ListItem>) => {
      if (item.type === "header") {
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{item.title}</Text>
          </View>
        );
      }

      const { store } = item;
      const isSelected = store.id === currentStoreId;

      return (
        <AnimatedPressable
          onPress={() => handleSelect(store.id)}
          enableHaptics={false}
          style={{
            ...styles.storeRow,
            ...(isSelected ? styles.storeRowSelected : undefined),
          }}
        >
          <View style={[styles.brandDot, { backgroundColor: store.color }]} />
          <Text
            style={[styles.storeName, isSelected && styles.storeNameSelected]}
            numberOfLines={1}
          >
            {store.displayName}
          </Text>
          {isSelected && (
            <MaterialCommunityIcons
              name="check"
              size={20}
              color={colors.accent.primary}
            />
          )}
        </AnimatedPressable>
      );
    },
    [currentStoreId, handleSelect],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      animationType="slide"
      position="bottom"
      maxWidth="full"
      statusBarTranslucent
      contentStyle={styles.sheetContent}
    >
      {/* Header row with title and close button */}
      <View style={styles.header}>
        <Text style={styles.title}>Select Store</Text>
        <AnimatedPressable
          onPress={onClose}
          style={styles.closeButton}
          enableHaptics
          hapticStyle="light"
        >
          <MaterialCommunityIcons
            name="close"
            size={22}
            color={colors.text.secondary}
          />
        </AnimatedPressable>
      </View>

      {/* Store list */}
      <FlatList<ListItem>
        data={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      />
    </GlassModal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetContent: {
    maxHeight: "70%",
    paddingBottom: spacing["3xl"],
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionHeaderText: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glass.border,
    backgroundColor: "transparent",
  },
  storeRowSelected: {
    backgroundColor: "rgba(0, 212, 170, 0.08)",
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
  },
  storeName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    flex: 1,
  },
  storeNameSelected: {
    color: colors.accent.primary,
    fontWeight: "600",
  },
});
