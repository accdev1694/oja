import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "@/components/ui/glass";

interface AddToListButtonProps {
  onPress: () => void;
  size?: "sm" | "md";
}

/**
 * "Add to list" button — teal circle with playlist-plus icon.
 * Used on pantry items and shopping list items to quickly copy an item to another list.
 */
export function AddToListButton({ onPress, size = "md" }: AddToListButtonProps) {
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
        name="playlist-plus"
        size={iconSize}
        color={colors.accent.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
});
