import React, { memo, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography } from "@/lib/design/glassTokens";
import { haptic } from "@/lib/haptics/safeHaptics";

interface DidYouMeanChipProps {
  original: string;
  suggestion: string;
  similarity: number;
  onAccept: () => void;
  onDismiss: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const DidYouMeanChip = memo(function DidYouMeanChip({
  suggestion,
  onAccept,
  onDismiss,
}: DidYouMeanChipProps) {
  const scale = useSharedValue(0.95);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 150 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleAccept = () => {
    haptic("light");
    onAccept();
  };

  const handleDismiss = () => {
    haptic("light");
    onDismiss();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
    >
      <Animated.View style={[styles.container, animatedStyle]}>
        <MaterialCommunityIcons
          name="lightbulb-outline"
          size={16}
          color={colors.accent.warning}
          style={styles.icon}
        />
        <Text style={styles.label}>Did you mean </Text>
        <Pressable onPress={handleAccept}>
          <Text style={styles.suggestion}>&ldquo;{suggestion}&rdquo;</Text>
        </Pressable>
        <Text style={styles.label}>?</Text>

        <View style={styles.actions}>
          <AnimatedPressable
            onPress={handleAccept}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons
              name="check"
              size={16}
              color={colors.accent.success}
            />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={handleDismiss}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons
              name="close"
              size={16}
              color={colors.text.tertiary}
            />
          </AnimatedPressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  suggestion: {
    ...typography.bodySmall,
    color: colors.accent.warning,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    marginLeft: "auto",
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
});
