/**
 * StoreDropdownSheet - Centered modal dropdown for selecting a store for a shopping list.
 *
 * Renders as a centered overlay modal:
 *  1. User's favourite stores (flat list with header)
 *  2. Collapsible "Other Shops" section for remaining stores
 *
 * Tap outside or select a store to dismiss.
 */

import React, { useMemo, useCallback, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import {
  AnimatedPressable,
  GlassModal,
  colors,
  spacing,
  typography,
  borderRadius,
} from '@/components/ui/glass'
import { haptic } from '@/lib/haptics/safeHaptics'
import { getAllStores, getStoreInfoSafe } from '@/convex/lib/storeNormalizer'
import type { StoreInfo } from '@/convex/lib/storeNormalizer'

// ── Types ────────────────────────────────────────────────────────────────────

export interface StoreDropdownSheetProps {
  /** Whether the dropdown is visible */
  visible: boolean
  /** Called when the user requests close (backdrop tap or selection) */
  onClose: () => void
  /** Called when a store is selected */
  onSelect: (storeId: string) => void
  /** Currently selected store ID (shows checkmark) */
  currentStoreId?: string
  /** User's favourite store IDs (shown at top) */
  userFavorites: string[]
}

// ── Store row sub-component ─────────────────────────────────────────────────

function StoreRow({
  store,
  isSelected,
  onPress,
}: {
  store: StoreInfo
  isSelected: boolean
  onPress: () => void
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
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
          size={18}
          color={colors.accent.primary}
        />
      )}
    </AnimatedPressable>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function StoreDropdownSheet({
  visible,
  onClose,
  onSelect,
  currentStoreId,
  userFavorites,
}: StoreDropdownSheetProps) {
  const [otherExpanded, setOtherExpanded] = useState(false)

  // ── Compute store lists ──────────────────────────────────────────────────

  const { userStores, otherStores } = useMemo(() => {
    const allStores = getAllStores()
    const favSet = new Set(userFavorites)

    const user: StoreInfo[] = []
    for (const favId of userFavorites) {
      const info = getStoreInfoSafe(favId)
      if (info) user.push(info)
    }

    const other = allStores.filter((s) => !favSet.has(s.id))

    return { userStores: user, otherStores: other }
  }, [userFavorites])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (storeId: string) => {
      haptic('light')
      onSelect(storeId)
    },
    [onSelect]
  )

  const toggleOther = useCallback(() => {
    haptic('light')
    setOtherExpanded((prev) => !prev)
  }, [])

  if (!visible) return null

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      overlayOpacity={0.5}
      statusBarTranslucent
      contentStyle={styles.card}
    >
      <View style={styles.dropdownHeader}>
        <Text style={styles.dropdownHeaderText}>Select Store</Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        nestedScrollEnabled
      >
        {/* ── User's stores ──────────────────────────────────── */}
        {userStores.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>YOUR STORES</Text>
            </View>
            {userStores.map((store) => (
              <StoreRow
                key={store.id}
                store={store}
                isSelected={store.id === currentStoreId}
                onPress={() => handleSelect(store.id)}
              />
            ))}
          </>
        )}

        {/* ── Other shops (collapsible) ──────────────────────── */}
        {otherStores.length > 0 && (
          <>
            <Pressable style={styles.otherShopsToggle} onPress={toggleOther}>
              <Text style={styles.otherShopsText}>Other Shops</Text>
              <MaterialCommunityIcons
                name={otherExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.text.tertiary}
              />
            </Pressable>

            {otherExpanded &&
              otherStores.map((store) => (
                <StoreRow
                  key={store.id}
                  store={store}
                  isSelected={store.id === currentStoreId}
                  onPress={() => handleSelect(store.id)}
                />
              ))}
          </>
        )}
      </ScrollView>
    </GlassModal>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    padding: 0,
    maxHeight: 420,
    overflow: 'hidden',
  },
  scrollView: {
    maxHeight: 370,
  },
  scrollContent: {
    paddingVertical: spacing.xs,
  },
  dropdownHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glass.border,
  },
  dropdownHeaderText: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionHeaderText: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
  },
  storeRowSelected: {
    backgroundColor: 'rgba(0, 212, 170, 0.08)',
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
    fontSize: 15,
  },
  storeNameSelected: {
    color: colors.accent.primary,
    fontWeight: '600',
  },
  otherShopsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glass.border,
    marginTop: spacing.xs,
  },
  otherShopsText: {
    ...typography.labelMedium,
    color: colors.text.secondary,
    fontSize: 13,
  },
})
