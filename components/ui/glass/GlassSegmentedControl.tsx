/**
 * GlassSegmentedControl
 *
 * A multi-tab version of the animated pill switcher.
 * Handles an arbitrary number of tabs with a sliding background pill.
 */

import React, { useCallback, useRef, useEffect } from "react";
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

export interface SegmentedControlTab {
  /** Tab label text */
  label: string;
  /** MaterialCommunityIcons name */
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

export interface GlassSegmentedControlProps {
  /** List of tabs */
  tabs: SegmentedControlTab[];
  /** Currently active tab index */
  activeIndex: number;
  /** Called when a tab is pressed */
  onTabChange: (index: number) => void;
  /** Color for the active pill. Defaults to accent.primary */
  activeColor?: string;
  /** Container style override */
  style?: StyleProp<ViewStyle>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function GlassSegmentedControl({
  tabs,
  activeIndex,
  onTabChange,
  activeColor = colors.accent.primary,
  style,
}: GlassSegmentedControlProps) {
  const tabCount = tabs.length;
  const tabProgress = useSharedValue(activeIndex);
  const containerWidth = useSharedValue(0);

  const onContainerLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      containerWidth.value = e.nativeEvent.layout.width;
    },
    [containerWidth],
  );

  const slidingPillStyle = useAnimatedStyle(() => {
    const pillWidth = (containerWidth.value - 8) / tabCount;
    return {
      width: pillWidth,
      transform: [{ translateX: tabProgress.value * pillWidth }],
      backgroundColor: `${activeColor}25`,
    };
  });

  const isOwnChange = useRef(false);

  const handlePress = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      haptic("light");
      isOwnChange.current = true;
      tabProgress.value = withSpring(index, { damping: 20, stiffness: 200 });
      onTabChange(index);
    },
    [activeIndex, tabProgress, onTabChange],
  );

  // Synchronize animation when activeIndex changes externally
  useEffect(() => {
    if (!isOwnChange.current) {
      tabProgress.value = withSpring(activeIndex, { damping: 20, stiffness: 200 });
    }
    isOwnChange.current = false;
  }, [activeIndex, tabProgress]);

  return (
    <View style={[styles.container, style]} onLayout={onContainerLayout}>
      <Animated.View style={[styles.slidingPill, slidingPillStyle]} />

      {tabs.map((tab, i) => {
        const isActive = activeIndex === i;
        const colorStyle = {
          color: isActive ? activeColor : colors.text.tertiary,
          fontWeight: (isActive ? "700" : "600") as any,
        };

        return (
          <Pressable key={i} style={styles.tab} onPress={() => handlePress(i)}>
            {tab.icon && (
              <MaterialCommunityIcons
                name={tab.icon}
                size={14}
                color={isActive ? activeColor : colors.text.tertiary}
              />
            )}
            <Text 
              style={[styles.tabText, colorStyle]} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
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
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: borderRadius.md,
    zIndex: 1,
    overflow: "hidden",
  },
  tabText: {
    ...typography.labelSmall,
    flexShrink: 1,
  },
});
