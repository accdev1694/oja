import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/components/ui/glass";
import { styles } from "./styles";

interface AddItemsHeaderProps {
  onClose: () => void;
}

export const AddItemsHeader = ({ onClose }: AddItemsHeaderProps) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>Add Items</Text>
        <Text style={styles.headerSubtitle}>
          Restock From Your Pantry, Add Product Manually, or Scan a Product Label
        </Text>
      </View>
      <Pressable
        style={styles.closeButton}
        onPress={onClose}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons
          name="close"
          size={22}
          color={colors.text.secondary}
        />
      </Pressable>
    </View>
  );
};
