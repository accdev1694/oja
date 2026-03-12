import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard, colors } from "@/components/ui/glass";
import { formatPrice } from "@/lib/currency/currencyUtils";
import { styles } from "./styles";

interface ListBudgetCardProps {
  budget: number;
  spent: number;
  remaining: number;
  currency: string;
  onPress: () => void;
}

export const ListBudgetCard = ({
  budget,
  spent,
  remaining,
  currency,
  onPress,
}: ListBudgetCardProps) => {
  return (
    <GlassCard style={styles.budgetCard}>
      <Pressable style={styles.budgetRow} onPress={onPress}>
        <View style={styles.budgetInfo}>
          <Text style={styles.budgetLabel}>Shopping Budget</Text>
          <Text style={styles.budgetValue}>{formatPrice(budget, currency)}</Text>
          
          <View style={styles.budgetStats}>
            <View style={styles.budgetStatItem}>
              <MaterialCommunityIcons name="cart-outline" size={14} color={colors.accent.primary} />
              <Text style={styles.budgetStatText}>Spent: {formatPrice(spent, currency)}</Text>
            </View>
            <View style={styles.budgetStatItem}>
              <MaterialCommunityIcons name="wallet-outline" size={14} color={colors.accent.success} />
              <Text style={styles.budgetStatText}>Left: {formatPrice(remaining, currency)}</Text>
            </View>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text.tertiary} />
      </Pressable>
    </GlassCard>
  );
};
