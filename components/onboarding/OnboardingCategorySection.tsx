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
  itemIndexMap?: Map<OnboardingItem, number>;
  onToggleItem: (index: number) => void;
  accentColor: string;
}

export const OnboardingCategorySection = ({
  category,
  categoryItems,
  selectedItems,
  allItems,
  itemIndexMap,
  onToggleItem,
  accentColor,
}: OnboardingCategorySectionProps) => {
  const getIndex = (item: OnboardingItem) => itemIndexMap?.get(item) ?? allItems.indexOf(item);
  const selectedCount = categoryItems.filter((item) =>
    selectedItems.has(getIndex(item))
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
          const globalIndex = getIndex(item);
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
