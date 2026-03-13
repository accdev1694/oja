import React from "react";
import { View, Text } from "react-native";
import { OnboardingItemCard } from "./OnboardingItemCard";
import { styles } from "./styles";

interface OnboardingItem {
  name: string;
  estimatedPrice?: number;
}

interface OnboardingCategorySectionProps {
  category: string;
  categoryItems: OnboardingItem[];
  selectedItems: Set<number>;
  allItems: OnboardingItem[];
  onToggleItem: (index: number) => void;
  accentColor: string;
}

export const OnboardingCategorySection = ({
  category,
  categoryItems,
  selectedItems,
  allItems,
  onToggleItem,
  accentColor,
}: OnboardingCategorySectionProps) => {
  const selectedCount = categoryItems.filter((item) =>
    selectedItems.has(allItems.indexOf(item))
  ).length;

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryDot, { backgroundColor: accentColor }]} />
        <Text style={styles.categoryTitle}>{category}</Text>
        <Text style={styles.categoryCount}>
          {selectedCount}/{categoryItems.length}
        </Text>
      </View>

      <View style={styles.itemGrid}>
        {categoryItems.map((item) => {
          const globalIndex = allItems.indexOf(item);
          return (
            <OnboardingItemCard
              key={globalIndex}
              item={item}
              isSelected={selectedItems.has(globalIndex)}
              onToggle={() => onToggleItem(globalIndex)}
              accentColor={accentColor}
            />
          );
        })}
      </View>
    </View>
  );
};
