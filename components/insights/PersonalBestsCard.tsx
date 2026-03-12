import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCollapsible, colors } from "@/components/ui/glass";
import { styles } from "./styles";

interface PersonalBestsCardProps {
  personalBests: {
    biggestSaving: number;
    longestStreak: number;
    mostItemsInTrip: number;
    cheapestTrip: number;
    totalTrips: number;
  } | null | undefined;
  bestsRef: React.RefObject<View | null>;
}

export const PersonalBestsCard = ({ personalBests, bestsRef }: PersonalBestsCardProps) => {
  if (!personalBests) return null;

  return (
    <View style={styles.section} ref={bestsRef}>
      <GlassCollapsible
        title="Personal Bests"
        icon="trophy"
        iconColor={colors.accent.warning}
      >
        <View style={styles.bestsGrid}>
          <BestItem
            icon="cash-minus"
            label="Biggest Saving"
            value={`£${personalBests.biggestSaving.toFixed(2)}`}
            color={colors.accent.success}
          />
          <BestItem
            icon="fire"
            label="Longest Streak"
            value={`${personalBests.longestStreak} days`}
            color={colors.semantic.fire}
          />
          <BestItem
            icon="cart"
            label="Most Items"
            value={`${personalBests.mostItemsInTrip}`}
            color={colors.accent.secondary}
          />
          <BestItem
            icon="tag-outline"
            label="Cheapest Trip"
            value={`£${personalBests.cheapestTrip.toFixed(2)}`}
            color={colors.accent.primary}
          />
        </View>
      </GlassCollapsible>
    </View>
  );
};

const BestItem = React.memo(function BestItem({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.bestItem}>
      <View style={[styles.bestIconCircle, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.bestValue}>{value}</Text>
      <Text style={styles.bestLabel}>{label}</Text>
    </View>
  );
});
