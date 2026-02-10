import React from "react";
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { colors, spacing, borderRadius, typography } from "@/components/ui/glass";

interface TipBannerProps {
  context: "pantry" | "lists" | "list_detail" | "scan" | "profile" | "voice";
}

/**
 * Contextual tip banner that shows relevant tips based on user state
 * Dismissible - once dismissed, tip won't show again
 */
export function TipBanner({ context }: TipBannerProps) {
  const tip = useQuery(api.tips.getNextTip, { context });
  const dismissTip = useMutation(api.tips.dismissTip);

  const opacity = useSharedValue(1);
  const measuredHeight = useSharedValue(0);
  const animatedHeight = useSharedValue<number | null>(null);
  const marginBottom = useSharedValue<number>(spacing.md);
  const [isDismissing, setIsDismissing] = React.useState(false);

  const handleLayout = (event: LayoutChangeEvent) => {
    // Capture the natural height on first layout
    if (measuredHeight.value === 0) {
      measuredHeight.value = event.nativeEvent.layout.height;
    }
  };

  const handleDismiss = async () => {
    if (!tip || isDismissing) return;
    setIsDismissing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Start from measured height and animate to 0
    animatedHeight.value = measuredHeight.value;
    animatedHeight.value = withTiming(0, { duration: 250 });
    marginBottom.value = withTiming(0, { duration: 250 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(completeDismiss)();
    });
  };

  const completeDismiss = async () => {
    if (tip) {
      await dismissTip({ tipKey: tip.key }).catch(console.warn);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    marginBottom: marginBottom.value,
    // Only apply height constraint when animating (otherwise let content determine height)
    ...(animatedHeight.value !== null && { height: animatedHeight.value }),
    overflow: "hidden" as const,
  }));

  if (!tip) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]} onLayout={handleLayout}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={colors.accent.warm} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{tip.title}</Text>
        <Text style={styles.body}>{tip.body}</Text>
      </View>

      <Pressable onPress={handleDismiss} style={styles.dismissButton} hitSlop={12}>
        <MaterialCommunityIcons name="close" size={18} color={colors.text.tertiary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${colors.accent.warm}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    // marginBottom is animated via animatedStyle
    borderWidth: 1,
    borderColor: `${colors.accent.warm}30`,
  },
  iconContainer: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 2,
  },
  body: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  dismissButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
