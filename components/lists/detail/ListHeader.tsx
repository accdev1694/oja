import React from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/components/ui/glass";
import { styles } from "./styles";

interface ListHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  searchTerm: string;
  onSearchChange: (text: string) => void;
  onOpenSettings: () => void;
  onShare: () => void;
}

export const ListHeader = ({
  title,
  subtitle,
  onBack,
  searchTerm,
  onSearchChange,
  onOpenSettings,
  onShare,
}: ListHeaderProps) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Pressable
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text.primary} />
        </Pressable>

        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={onShare}>
            <MaterialCommunityIcons name="share-variant-outline" size={22} color={colors.text.secondary} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={onOpenSettings}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={colors.text.secondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor={colors.text.disabled}
          value={searchTerm}
          onChangeText={onSearchChange}
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  );
};
