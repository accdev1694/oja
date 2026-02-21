/**
 * GlassCapsuleSwitcher
 *
 * Reusable two-tab capsule switcher with an animated sliding pill.
 * Supports optional leading content (icons or interactive buttons) and badges.
 *
 * The pill's width and translateX are driven by shared values on the UI thread
 * (matching the original inline implementation). The backgroundColor uses
 * interpolateColor with the two tab colors resolved at render time and passed
 * into the worklet as string constants — Reanimated can capture these because
 * they're local primitives, not object-property look-ups on props.
 */

import React, { useCallback, useRef } from "react";
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, typography, spacing, borderRadius } from "@/lib/design/glassTokens";
import { haptic } from "@/lib/haptics/safeHaptics";

// =============================================================================
// TYPES
// =============================================================================

export interface CapsuleTab {
  /** Tab label text */
  label: string;
  /** Color used for label, badge, and pill when this tab is active */
  activeColor: string;
  /** Badge count (rendered as text) */
  badge?: number | string;
  /** Custom badge content — overrides `badge` when provided (e.g., a check icon) */
  badgeCustom?: React.ReactNode;
  /** MaterialCommunityIcons name — rendered inside the tab Pressable */
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Custom leading element — rendered outside the tab Pressable (can be interactive) */
  leading?: React.ReactNode;
}

export interface GlassCapsuleSwitcherProps {
  /** Exactly two tabs */
  tabs: [CapsuleTab, CapsuleTab];
  /** Currently active tab index (0 or 1) */
  activeIndex: number;
  /** Called when a tab is pressed */
  onTabChange: (index: number) => void;
  /** Container style override (margins, etc.) */
  style?: StyleProp<ViewStyle>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function GlassCapsuleSwitcher({
  tabs,
  activeIndex,
  onTabChange,
  style,
}: GlassCapsuleSwitcherProps) {
  // Sliding pill: 0 = left tab, 1 = right tab
  // Both MUST be shared values so the UI thread can read them synchronously.
  const tabProgress = useSharedValue(activeIndex);
  const tabPillWidth = useSharedValue(0);

  const onContainerLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      tabPillWidth.value = (e.nativeEvent.layout.width - 8) / 2;
    },
    [],
  );

  // Resolve colors to local string primitives so the worklet can capture them.
  // (Reanimated worklets can close over local primitives but NOT prop object look-ups.)
  const color0 = `${tabs[0].activeColor}25`;
  const color1 = `${tabs[1].activeColor}25`;

  const slidingPillStyle = useAnimatedStyle(() => {
    return {
      width: tabPillWidth.value,
      transform: [{ translateX: tabProgress.value * tabPillWidth.value }],
      backgroundColor: interpolateColor(
        tabProgress.value,
        [0, 1],
        [color0, color1],
      ),
    };
  });

  // When we initiate the tab change ourselves, skip the external sync so the
  // spring animation isn't killed by a snap-to-target on re-render.
  const isOwnChange = useRef(false);

  const handlePress = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      haptic("light");
      isOwnChange.current = true;
      tabProgress.value = withSpring(index, { damping: 18, stiffness: 180 });
      onTabChange(index);
    },
    [activeIndex, tabProgress, onTabChange],
  );

  // Keep pill in sync when activeIndex changes externally
  // (e.g., reset on modal close) — but NOT after our own press
  if (isOwnChange.current) {
    isOwnChange.current = false;
  } else if (Math.round(tabProgress.value) !== activeIndex) {
    tabProgress.value = activeIndex;
  }

  return (
    <View style={[styles.container, style]} onLayout={onContainerLayout}>
      <Animated.View style={[styles.slidingPill, slidingPillStyle]} />

      {tabs.map((tab, i) => {
        const isActive = activeIndex === i;
        const activeColorStyle = { color: tab.activeColor, fontWeight: "600" as const };
        const activeBadgeBg = { backgroundColor: `${tab.activeColor}30` };

        // When `leading` is provided, split into leading + label Pressable
        // so leading can have its own onPress without triggering tab switch.
        // Otherwise, the whole tab is one Pressable.
        if (tab.leading) {
          return (
            <View key={i} style={styles.tab}>
              {tab.leading}
              <Pressable style={styles.labelArea} onPress={() => handlePress(i)}>
                <Text style={[styles.tabText, isActive && activeColorStyle]}>
                  {tab.label}
                </Text>
                {renderBadge(tab, isActive, activeColorStyle, activeBadgeBg)}
              </Pressable>
            </View>
          );
        }

        return (
          <Pressable key={i} style={styles.tab} onPress={() => handlePress(i)}>
            {tab.icon && (
              <MaterialCommunityIcons
                name={tab.icon}
                size={16}
                color={isActive ? tab.activeColor : colors.text.tertiary}
              />
            )}
            <Text style={[styles.tabText, isActive && activeColorStyle]}>
              {tab.label}
            </Text>
            {renderBadge(tab, isActive, activeColorStyle, activeBadgeBg)}
          </Pressable>
        );
      })}
    </View>
  );
}

// =============================================================================
// BADGE HELPER
// =============================================================================

function renderBadge(
  tab: CapsuleTab,
  isActive: boolean,
  activeTextStyle: { color: string },
  activeBgStyle: { backgroundColor: string },
) {
  if (tab.badgeCustom) {
    return (
      <View style={[styles.badge, isActive && activeBgStyle]}>
        {tab.badgeCustom}
      </View>
    );
  }
  if (tab.badge !== undefined) {
    return (
      <View style={[styles.badge, isActive && activeBgStyle]}>
        <Text style={[styles.badgeText, isActive && activeTextStyle]}>
          {tab.badge}
        </Text>
      </View>
    );
  }
  return null;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: "hidden",
  },
  slidingPill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: borderRadius.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  labelArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tabText: {
    ...typography.labelMedium,
    color: colors.text.tertiary,
    fontSize: 13,
  },
  badge: {
    backgroundColor: colors.glass.backgroundHover,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    minWidth: 22,
    alignItems: "center",
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontSize: 11,
  },
});
