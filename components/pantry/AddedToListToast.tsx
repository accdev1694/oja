import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing, borderRadius } from "@/components/ui/glass";

interface AddedToListToastProps {
  itemName: string;
  y: number;
}

export const AddedToListToast = React.memo(function AddedToListToast({
  itemName,
  y,
}: AddedToListToastProps) {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(1);
  const ring = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    ring.value = withTiming(1, { duration: 600 });
    opacity.value = withDelay(1600, withTiming(0, { duration: 400 }));
  }, []);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - ring.value) * opacity.value,
    transform: [{ scaleX: 1 + ring.value * 2 }, { scaleY: 1 + ring.value }],
  }));

  return (
    <View
      style={{
        position: "absolute",
        top: y - 24,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 9999,
        elevation: 9999,
      }}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 100,
            height: 44,
            borderRadius: borderRadius.full,
            borderWidth: 2,
            borderColor: colors.accent.success,
          },
          ringStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.background.primary,
            borderWidth: 1.5,
            borderColor: colors.accent.success,
            borderRadius: borderRadius.full,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.xl,
            gap: spacing.sm,
          },
          pillStyle,
        ]}
      >
        <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent.success} />
        <Text style={{ color: colors.text.primary, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>
          {itemName} added to list
        </Text>
      </Animated.View>
    </View>
  );
});
