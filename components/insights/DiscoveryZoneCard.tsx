import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard, colors } from "@/components/ui/glass";
import { styles } from "./styles";

const SHOPPING_TIPS = [
  "The average UK household throws away £60 of food per month. Tracking your stock levels helps reduce waste.",
  "Shopping with a list reduces impulse purchases by up to 30%. You're already ahead of the curve.",
  "Buying seasonal produce can save 20-40% compared to out-of-season imports.",
  "Store-brand items are typically 30% cheaper than branded equivalents for identical quality.",
  "The most expensive items are usually placed at eye level. Check the top and bottom shelves.",
  "Frozen fruit and veg retain more nutrients than 'fresh' items that have been on shelves for days.",
  "Meal planning for just 3 days a week can reduce your weekly food bill by 20%.",
  "Yellow sticker bargains are typically available 2-3 hours before closing time.",
  "Buying in bulk only saves money if you actually use everything before it expires.",
  "The UK wastes 9.5 million tonnes of food annually. Every item you track helps.",
];

export const DiscoveryZoneCard = () => {
  const seasonalTip = useMemo(() => {
    // Rotate tips daily based on day of year
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return SHOPPING_TIPS[dayOfYear % SHOPPING_TIPS.length];
  }, []);

  return (
    <GlassCard style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="lightbulb-on-outline"
          size={22}
          color={colors.accent.warning}
        />
        <Text style={styles.sectionTitle}>Did You Know?</Text>
      </View>
      <Text style={styles.discoveryTip}>
        {seasonalTip}
      </Text>
    </GlassCard>
  );
};
