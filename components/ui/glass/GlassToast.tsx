/**
 * GlassToast - Animated toast notification with glassmorphism styling
 */
import React, { useEffect } from "react";
import { Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  FadeInUp,
  FadeOutUp,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, typography, spacing } from "@/lib/design/glassTokens";

export interface GlassToastProps {
  message: string;
  icon?: string;
  iconColor?: string;
  visible: boolean;
  duration?: number;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
}

export function GlassToast({
  message,
  icon,
  iconColor = colors.accent.primary,
  visible,
  duration = 3000,
  onDismiss,
  style,
}: GlassToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(300)}
      style={[styles.container, style]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={iconColor}
          style={styles.icon}
        />
      )}
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: "rgba(20, 30, 55, 0.92)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glass.border,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    marginRight: spacing.sm,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
});

export default GlassToast;
