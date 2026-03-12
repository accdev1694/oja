import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "./styles";

interface OnboardingItemCardProps {
  item: {
    name: string;
    estimatedPrice?: number;
  };
  isSelected: boolean;
  onToggle: () => void;
  accentColor: string;
}

export const OnboardingItemCard = ({
  item,
  isSelected,
  onToggle,
  accentColor,
}: OnboardingItemCardProps) => {
  return (
    <TouchableOpacity
      style={[
        styles.itemCard,
        isSelected && { borderColor: accentColor },
        !isSelected && styles.itemCardDeselected,
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <Text
          style={[
            styles.itemName,
            !isSelected && styles.itemNameDeselected,
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        {item.estimatedPrice != null && (
          <Text
            style={[
              styles.itemPrice,
              !isSelected && styles.itemPriceDeselected,
            ]}
          >
            ~£{item.estimatedPrice.toFixed(2)}
          </Text>
        )}

        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: accentColor }]}>
            <MaterialCommunityIcons name="check" size={12} color="#fff" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
