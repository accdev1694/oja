import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
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
  const height = useSharedValue(1);
  const [isDismissing, setIsDismissing] = React.useState(false);

  const handleDismiss = async () => {
    if (!tip || isDismissing) return;
    setIsDismissing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate out
    opacity.value = withTiming(0, { duration: 200 });
    height.value = withTiming(0, { duration: 300 }, () => {
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
    transform: [{ scaleY: height.value }],
  }));

  if (!tip) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
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
    marginBottom: spacing.md,
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
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  dismissButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
