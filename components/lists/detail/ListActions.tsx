import React from "react";
import { View, Text, Pressable } from "react-native";
import { GlassSegmentedControl, colors, spacing } from "@/components/ui/glass";
import { styles } from "./styles";

interface ListActionsProps {
  showCheckedItems: boolean;
  onToggleCheckedItems: (show: boolean) => void;
  itemCount: number;
}

export const ListActions = ({
  showCheckedItems,
  onToggleCheckedItems,
  itemCount,
}: ListActionsProps) => {
  if (itemCount === 0) return null;

  return (
    <View style={styles.toggleContainer}>
      <GlassSegmentedControl
        tabs={[
          { label: "Show Checked", icon: "eye-outline" },
          { label: "Hide Checked", icon: "eye-off-outline" },
        ]}
        activeIndex={showCheckedItems ? 0 : 1}
        onTabChange={(index) => onToggleCheckedItems(index === 0)}
      />
    </View>
  );
};
