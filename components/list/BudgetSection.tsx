/**
 * BudgetSection - Sticky mini budget bar that slides in when the CircularBudgetDial
 * scrolls out of view. Positioned absolutely at the top of the KeyboardAvoidingView.
 *
 * The CircularBudgetDial itself lives in the FlashList ListHeaderComponent and is
 * rendered directly where needed. This component handles only the sticky overlay bar.
 */

import { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";

import { colors, spacing } from "@/components/ui/glass";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StickyBudgetBarProps {
  budget: number;
  /** "planned" or "spent" depending on list mode */
  activeValue: number;
  /** Remaining = budget - activeValue */
  remaining: number;
  /** Label shown under the active value ("planned" or "spent") */
  label: string;
  /** Whether in planning mode (determines accent colour) */
  isPlanning: boolean;
  /** Animated scroll position from the parent FlashList */
  scrollY: SharedValue<number>;
  /** Threshold at which the bar appears */
  scrollThreshold: number;
  /** Tap handler (opens edit budget modal) */
  onPress: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const StickyBudgetBar = memo(function StickyBudgetBar({
  budget,
  activeValue,
  remaining,
  label,
  isPlanning,
  scrollY,
  scrollThreshold,
  onPress,
}: StickyBudgetBarProps) {
  const isOver = activeValue > budget;
  const ratio = budget > 0 ? activeValue / budget : 0;
  const barColor = isOver
    ? colors.semantic.danger
    : ratio > 0.8
      ? colors.semantic.warning
      : colors.semantic.success;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [scrollThreshold - 20, scrollThreshold + 10],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [scrollThreshold - 20, scrollThreshold + 10],
          [-44, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.bar, animatedStyle]}>
      <Pressable onPress={onPress} style={styles.inner}>
        <View style={styles.left}>
          <Text style={styles.label}>Budget</Text>
          <Text style={styles.value}>
            {"\u00A3"}{budget.toFixed(2)}
          </Text>
        </View>
        <View style={styles.center}>
          <Text style={[styles.label, { color: isPlanning ? colors.accent.secondary : barColor }]}>
            {label.charAt(0).toUpperCase() + label.slice(1)}
          </Text>
          <Text style={[styles.value, { color: isPlanning ? colors.accent.secondary : barColor }]}>
            {"\u00A3"}{activeValue.toFixed(2)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.label}>
            {isOver ? "Over" : "Left"}
          </Text>
          <Text style={[styles.value, { color: isOver ? colors.semantic.danger : colors.semantic.success }]}>
            {"\u00A3"}{Math.abs(remaining).toFixed(2)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "rgba(13, 21, 40, 0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  left: {
    alignItems: "flex-start",
  },
  center: {
    alignItems: "center",
  },
  right: {
    alignItems: "flex-end",
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
    marginTop: 1,
  },
});
