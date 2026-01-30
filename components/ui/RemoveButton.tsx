import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "@/components/ui/glass";

interface RemoveButtonProps {
  onPress: () => void;
  size?: "sm" | "md";
}

/**
 * Consistent delete/remove button used across Stock and List pages.
 * Soft red circle with a trash icon — unmistakable intent.
 */
export function RemoveButton({ onPress, size = "md" }: RemoveButtonProps) {
  const dim = size === "sm" ? 28 : 32;
  const iconSize = size === "sm" ? 15 : 17;

  return (
    <Pressable
      style={[styles.button, { width: dim, height: dim, borderRadius: dim / 2 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <MaterialCommunityIcons
        name="trash-can-outline"
        size={iconSize}
        color={colors.semantic.danger}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: `${colors.semantic.danger}15`,
    justifyContent: "center",
    alignItems: "center",
  },
});
