import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/components/ui/glass";
import { styles } from "./styles";

export const ListEmptyState = () => {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <MaterialCommunityIcons
          name="clipboard-text-outline"
          size={40}
          color={colors.text.tertiary}
        />
      </View>
      <Text style={styles.emptyTitle}>No items yet</Text>
      <Text style={styles.emptySubtitle}>
        Add items above or pull from your stock
      </Text>
    </View>
  );
};
