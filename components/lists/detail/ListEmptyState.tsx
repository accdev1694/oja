import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/components/ui/glass";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { styles } from "./styles";

export const ListEmptyState = () => {
  const { firstName } = useCurrentUser();
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
        {firstName ? `${firstName}, add items above or pull from your stock` : "Add items above or pull from your stock"}
      </Text>
    </View>
  );
};
