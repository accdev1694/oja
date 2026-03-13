import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ImpactFeedbackStyle, impactAsync } from "expo-haptics";
import { colors } from "@/components/ui/glass";
import { stockStyles as styles, ESSENTIALS_SECTION_TITLE } from "./stockStyles";

// =============================================================================
// ESSENTIALS SECTION HEADER
// =============================================================================

interface EssentialsSectionHeaderProps {
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const EssentialsSectionHeader = React.memo(function EssentialsSectionHeader({
  count,
  isCollapsed,
  onToggle,
}: EssentialsSectionHeaderProps) {
  const handlePress = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    onToggle();
  }, [onToggle]);

  return (
    <TouchableOpacity
      style={styles.categoryHeader}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.categoryTitleRow}>
        <MaterialCommunityIcons name="star" size={18} color={colors.accent.primary} />
        <Text style={[styles.categoryTitle, styles.essentialsSectionTitle]}>Essentials</Text>
        <View style={[styles.categoryCountBadge, styles.essentialsCountBadge]}>
          <Text style={[styles.categoryCount, styles.essentialsCount]}>{count}</Text>
        </View>
      </View>
      <MaterialCommunityIcons
        name={isCollapsed ? "chevron-right" : "chevron-down"}
        size={24}
        color={colors.accent.primary}
      />
    </TouchableOpacity>
  );
});

// =============================================================================
// CATEGORY SECTION HEADER (shared between attention + all modes)
// =============================================================================

interface CategoryHeaderProps {
  category: string;
  count: number;
  isCollapsed: boolean;
  onToggle: (category: string) => void;
}

export const CategoryHeader = React.memo(function CategoryHeader({
  category,
  count,
  isCollapsed,
  onToggle,
}: CategoryHeaderProps) {
  const handlePress = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    onToggle(category);
  }, [category, onToggle]);

  return (
    <TouchableOpacity
      style={styles.categoryHeader}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.categoryTitleRow}>
        <Text style={styles.categoryTitle}>{category}</Text>
        <View style={styles.categoryCountBadge}>
          <Text style={styles.categoryCount}>{count}</Text>
        </View>
      </View>
      <MaterialCommunityIcons
        name={isCollapsed ? "chevron-right" : "chevron-down"}
        size={24}
        color={colors.text.tertiary}
      />
    </TouchableOpacity>
  );
});
