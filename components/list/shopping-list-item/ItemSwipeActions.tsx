import React from "react";
import { Text } from "react-native";
import Animated from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "./styles";

interface ItemSwipeActionsProps {
  isShopping: boolean;
  leftActionStyle: Record<string, unknown>;
  rightActionStyle: Record<string, unknown>;
}

export const ItemSwipeActions = ({
  isShopping,
  leftActionStyle,
  rightActionStyle,
}: ItemSwipeActionsProps) => {
  if (isShopping) return null;

  return (
    <>
      <Animated.View style={[styles.swipeAction, styles.swipeActionLeft, leftActionStyle]}>
        <MaterialCommunityIcons name="arrow-up-bold" size={20} color="#fff" />
        <Text style={styles.swipeActionText}>Priority ↑</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeAction, styles.swipeActionRight, rightActionStyle]}>
        <Text style={styles.swipeActionText}>Priority ↓</Text>
        <MaterialCommunityIcons name="arrow-down-bold" size={20} color="#fff" />
      </Animated.View>
    </>
  );
};
