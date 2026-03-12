import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard, GlassProgressBar, colors } from "@/components/ui/glass";
import { styles } from "./styles";

interface SavingsJarCardProps {
  savingsJar: {
    totalSaved: number;
    tripsCount: number;
    averageSaved: number;
    nextMilestone: number;
    milestoneProgress: number;
  };
}

export const SavingsJarCard = ({ savingsJar }: SavingsJarCardProps) => {
  return (
    <GlassCard style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="piggy-bank"
          size={22}
          color={colors.accent.success}
        />
        <Text style={styles.sectionTitle}>Savings Jar</Text>
      </View>

      <View style={styles.savingsContent}>
        <Text style={styles.savingsBigNumber}>
          £{savingsJar.totalSaved.toFixed(2)}
        </Text>
        {savingsJar.totalSaved === 0 ? (
          <Text style={styles.savingsSubtext}>
            Your first savings are just one trip away. Create a list with a budget and we&apos;ll track the difference.
          </Text>
        ) : (
          <Text style={styles.savingsSubtext}>
            {savingsJar.totalSaved >= 100
              ? "Triple digits! You&apos;re a budgeting pro."
              : savingsJar.totalSaved >= 50
                ? "Halfway to £100 — keep the momentum going!"
                : savingsJar.totalSaved >= 25
                  ? "Solid progress. Every shop adds up."
                  : "Great start! Consistency is the key."}
            {" "}Saved across {savingsJar.tripsCount} trip
            {savingsJar.tripsCount !== 1 ? "s" : ""}
            {savingsJar.averageSaved > 0 &&
              ` · £${savingsJar.averageSaved.toFixed(2)} avg`}
          </Text>
        )}

        {/* Milestone progress */}
        <View style={styles.milestoneRow}>
          <Text style={styles.milestoneLabel}>
            Next milestone: £{savingsJar.nextMilestone}
          </Text>
          <Text style={styles.milestonePercent}>
            {savingsJar.milestoneProgress}%
          </Text>
        </View>
        <GlassProgressBar
          progress={savingsJar.milestoneProgress}
          size="sm"
        />
      </View>
    </GlassCard>
  );
};
