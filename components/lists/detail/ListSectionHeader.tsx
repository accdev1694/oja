import React from "react";
import { View, Text } from "react-native";
import { styles } from "./styles";

interface ListSectionHeaderProps {
  title: string;
}

export const ListSectionHeader = ({ title }: ListSectionHeaderProps) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.sectionHeaderLine} />
    </View>
  );
};
