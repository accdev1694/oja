import React from "react";
import { View, Text } from "react-native";
import { GlassCollapsible, colors } from "@/components/ui/glass";
import { styles } from "./styles";

interface BudgetAdherenceCardProps {
  budgetAdherence: {
    underBudget: number;
    overBudget: number;
    total: number;
  };
}

export const BudgetAdherenceCard = ({ budgetAdherence }: BudgetAdherenceCardProps) => {
  if (!budgetAdherence || budgetAdherence.total === 0) return null;

  return (
    <View style={styles.section}>
      <GlassCollapsible
        title="Budget Adherence"
        icon="target"
        iconColor={colors.accent.info}
      >
        <View style={styles.budgetAdherenceRow}>
          <View style={styles.adherenceStatBox}>
            <Text style={[styles.adherenceNumber, { color: colors.accent.success }]}>
              {budgetAdherence.underBudget}
            </Text>
            <Text style={styles.adherenceLabel}>Under Budget</Text>
          </View>
          <View style={styles.adherenceDivider} />
          <View style={styles.adherenceStatBox}>
            <Text style={[styles.adherenceNumber, { color: colors.accent.error }]}>
              {budgetAdherence.overBudget}
            </Text>
            <Text style={styles.adherenceLabel}>Over Budget</Text>
          </View>
          <View style={styles.adherenceDivider} />
          <View style={styles.adherenceStatBox}>
            <Text
              style={[
                styles.adherenceNumber,
                { color: colors.accent.primary },
              ]}
            >
              {budgetAdherence.total > 0
                ? Math.round(
                    (budgetAdherence.underBudget /
                      budgetAdherence.total) *
                      100
                  )
                : 0}
              %
            </Text>
            <Text style={styles.adherenceLabel}>Success Rate</Text>
          </View>
        </View>
      </GlassCollapsible>
    </View>
  );
};
