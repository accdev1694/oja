import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography, spacing, borderRadius } from "@/components/ui/glass";

interface SwipeOnboardingOverlayProps {
  onDismiss: () => void;
}

export const SwipeOnboardingOverlay = React.memo(function SwipeOnboardingOverlay({
  onDismiss,
}: SwipeOnboardingOverlayProps) {
  const handX = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 300 });
    handX.value = withRepeat(
      withSequence(
        withTiming(40, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(-40, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const handStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: handX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <Pressable style={styles.backdrop} onPress={onDismiss} />
      <View style={styles.content}>
        <Animated.View style={[styles.handContainer, handStyle]}>
          <MaterialCommunityIcons
            name="gesture-swipe-horizontal"
            size={48}
            color={colors.accent.primary}
          />
        </Animated.View>
        <Text style={styles.title}>Swipe to adjust stock</Text>
        <Text style={styles.subtitle}>
          Swipe any item left or right to change its stock level
        </Text>
        <Pressable style={styles.gotItButton} onPress={onDismiss}>
          <Text style={styles.gotItText}>Got it</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  handContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  gotItButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  gotItText: {
    ...typography.labelLarge,
    color: colors.text.primary,
  },
});
