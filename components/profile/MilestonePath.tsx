import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassCard,
  AnimatedSection,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export function MilestonePath({
  pantryItems,
  allLists,
  receipts,
  pointsBalance,
  isAdmin,
}: any) {
  if (isAdmin) return null;

  const milestones = [
    { icon: "package-variant" as const, text: "Add items to your stock", done: pantryItems.length > 0 },
    { icon: "clipboard-list-outline" as const, text: "Create your first list", done: allLists.length > 0 },
    { icon: "camera" as const, text: "Scan a receipt", done: (receipts?.filter((r: any) => r.processingStatus === "completed").length ?? 0) > 0 },
    { icon: "trophy-outline" as const, text: "Earn your first points", done: (pointsBalance?.totalPoints ?? 0) > 0 },
  ];
  const allDone = milestones.every((m: any) => m.done);
  if (allDone) return null;

  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={50}>
      <View style={styles.section}>
        <GlassCard variant="standard" style={styles.milestonePath}>
          <Text style={styles.milestoneTitle}>Your journey starts here</Text>
          <Text style={styles.milestoneSubtitle}>
            Most shoppers save £30+ in their first month. Here&apos;s how to get there:
          </Text>
          <View style={styles.milestoneSteps}>
            {milestones.map((step: any) => (
              <View key={step.text} style={styles.milestoneStep}>
                <MaterialCommunityIcons
                  name={step.done ? "check-circle" : step.icon}
                  size={18}
                  color={step.done ? colors.accent.primary : colors.text.tertiary}
                />
                <Text style={[styles.milestoneStepText, step.done && styles.milestoneStepDone]}>
                  {step.text}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>
      </View>
    </AnimatedSection>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  milestonePath: {
    marginBottom: spacing.md,
  },
  milestoneTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: 4,
  },
  milestoneSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  milestoneSteps: {
    gap: spacing.sm,
  },
  milestoneStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  milestoneStepText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
  },
  milestoneStepDone: {
    color: colors.accent.primary,
    textDecorationLine: "line-through",
  },
});
