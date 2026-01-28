import React, { useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface FlyToListAnimationProps {
  visible: boolean;
  itemName: string;
  startPosition: { x: number; y: number };
  onAnimationComplete: () => void;
}

/**
 * FlyToListAnimation - Overlay showing item flying to shopping list
 *
 * Animation sequence:
 * 1. Item appears at start position with pulse effect
 * 2. Item scales down and flies in arc toward bottom tab bar
 * 3. Trail effect follows the item
 * 4. Landing burst effect at destination
 * 5. Callback triggered for toast/notification
 */
export function FlyToListAnimation({
  visible,
  itemName,
  startPosition,
  onAnimationComplete,
}: FlyToListAnimationProps) {
  // Animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const trailOpacity = useSharedValue(0);
  const burstScale = useSharedValue(0);
  const burstOpacity = useSharedValue(0);

  // Target: Lists tab (second tab, roughly 1/4 from left on 4-tab bar)
  const targetX = SCREEN_WIDTH * 0.375 - startPosition.x;
  const targetY = SCREEN_HEIGHT - 80 - startPosition.y;

  const triggerCompletion = useCallback(() => {
    onAnimationComplete();
  }, [onAnimationComplete]);

  useEffect(() => {
    if (visible) {
      // Reset values
      opacity.value = 0;
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      rotation.value = 0;
      trailOpacity.value = 0;
      burstScale.value = 0;
      burstOpacity.value = 0;

      // Haptic pulse at start
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Animation sequence
      // 1. Fade in with pulse
      opacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.9, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );

      // 2. Scale down during flight
      scale.value = withDelay(
        250,
        withTiming(0.4, { duration: 500, easing: Easing.out(Easing.cubic) })
      );

      // 3. Fly to target with arc motion
      translateX.value = withDelay(
        250,
        withTiming(targetX, { duration: 500, easing: Easing.out(Easing.cubic) })
      );

      translateY.value = withDelay(
        250,
        withSequence(
          // Arc up slightly first
          withTiming(-30, { duration: 150 }),
          // Then swoop down to target
          withTiming(targetY, { duration: 350, easing: Easing.in(Easing.cubic) })
        )
      );

      // 4. Slight rotation during flight
      rotation.value = withDelay(
        250,
        withTiming(-15, { duration: 500 })
      );

      // 5. Trail effect
      trailOpacity.value = withDelay(
        300,
        withSequence(
          withTiming(0.6, { duration: 200 }),
          withTiming(0, { duration: 300 })
        )
      );

      // 6. Burst effect at landing
      burstScale.value = withDelay(
        700,
        withSpring(1.5, { damping: 10, stiffness: 200 })
      );

      burstOpacity.value = withDelay(
        700,
        withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 300 })
        )
      );

      // 7. Fade out item and trigger completion
      opacity.value = withDelay(
        750,
        withTiming(0, { duration: 200 }, (finished) => {
          if (finished) {
            // Haptic at landing
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            runOnJS(triggerCompletion)();
          }
        })
      );
    }
  }, [visible]);

  const itemStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const trailStyle = useAnimatedStyle(() => ({
    opacity: trailOpacity.value,
    transform: [
      { translateX: translateX.value * 0.7 },
      { translateY: translateY.value * 0.7 },
      { scale: scale.value * 1.2 },
    ],
  }));

  const burstStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [
      { translateX: targetX },
      { translateY: targetY },
      { scale: burstScale.value },
    ],
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Trail effect */}
      <Animated.View
        style={[
          styles.flyingItem,
          styles.trail,
          { left: startPosition.x, top: startPosition.y },
          trailStyle,
        ]}
      />

      {/* Flying item */}
      <Animated.View
        style={[
          styles.flyingItem,
          { left: startPosition.x, top: startPosition.y },
          itemStyle,
        ]}
      >
        <Text style={styles.flyingEmoji}>📝</Text>
        <Text style={styles.flyingText} numberOfLines={1}>
          {itemName}
        </Text>
      </Animated.View>

      {/* Burst effect at landing */}
      <Animated.View
        style={[
          styles.burst,
          { left: startPosition.x, top: startPosition.y },
          burstStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flyingItem: {
    position: "absolute",
    backgroundColor: "#FF6B35",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  trail: {
    backgroundColor: "rgba(255, 107, 53, 0.3)",
    shadowOpacity: 0,
  },
  flyingEmoji: {
    fontSize: 16,
  },
  flyingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 100,
  },
  burst: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 107, 53, 0.3)",
    marginLeft: -30,
    marginTop: -30,
  },
});
