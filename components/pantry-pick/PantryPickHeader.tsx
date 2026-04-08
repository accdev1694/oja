import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "@/components/ui/glass";
import { styles } from "./styles";

export function PantryPickHeader() {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Add from Stock</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}
