/**
 * OfflineBanner - Shows connection status when offline or syncing
 *
 * A minimal, non-intrusive banner that appears at the top of the screen
 * when the app loses connection to Convex backend.
 *
 * Features:
 * - Shows "Offline" status with cloud-off icon
 * - Shows pending mutation count when offline
 * - Shows "Syncing" status when reconnecting with pending changes
 * - Smooth enter/exit animations
 * - Glass UI styling consistent with design system
 *
 * Convex handles all the actual offline queuing - this is purely UI feedback.
 */

import React, { memo, useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  SlideInUp,
  SlideOutUp,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNetworkStatus } from "@/lib/network/useNetworkStatus";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/lib/design/glassTokens";

export interface OfflineBannerProps {
  /** Additional top offset (e.g., for headers) */
  topOffset?: number;
}

export const OfflineBanner = memo(function OfflineBanner({
  topOffset = 0,
}: OfflineBannerProps) {
  const insets = useSafeAreaInsets();
  const { isConnected, hasPendingMutations, pendingMutationCount, statusMessage } =
    useNetworkStatus();

  // Only show when offline OR when syncing pending mutations
  const shouldShow = !isConnected || (hasPendingMutations && !isConnected);

  // Animation for the sync icon rotation
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (hasPendingMutations && isConnected) {
      // Rotate continuously while syncing
      const interval = setInterval(() => {
        rotation.value = withTiming(rotation.value + 360, { duration: 1000 });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [hasPendingMutations, isConnected, rotation]);

  const syncIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!shouldShow) {
    return null;
  }

  // Determine icon and color based on state
  const iconName = isConnected ? "cloud-sync" : "cloud-off-outline";
  const iconColor = isConnected ? colors.accent.primary : colors.accent.warning;
  const backgroundColor = isConnected
    ? "rgba(0, 212, 170, 0.15)"
    : "rgba(245, 158, 11, 0.15)";
  const borderColor = isConnected
    ? "rgba(0, 212, 170, 0.3)"
    : "rgba(245, 158, 11, 0.3)";

  return (
    <Animated.View
      entering={SlideInUp.duration(300).springify()}
      exiting={SlideOutUp.duration(200)}
      style={[
        styles.container,
        {
          top: insets.top + topOffset,
          backgroundColor,
          borderColor,
        },
      ]}
    >
      <Animated.View style={hasPendingMutations && isConnected ? syncIconStyle : undefined}>
        <MaterialCommunityIcons
          name={iconName as any}
          size={18}
          color={iconColor}
        />
      </Animated.View>
      <Text style={[styles.text, { color: iconColor }]}>
        {statusMessage}
      </Text>
      {hasPendingMutations && (
        <View style={[styles.badge, { backgroundColor: iconColor }]}>
          <Text style={styles.badgeText}>{pendingMutationCount}</Text>
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    zIndex: 9998,
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  text: {
    ...typography.labelMedium,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.text.inverse,
    fontSize: 11,
  },
});

export default OfflineBanner;
