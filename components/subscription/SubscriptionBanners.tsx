import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  AnimatedSection,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export function TrialBanner({
  trialDaysLeft,
}: {
  trialDaysLeft: number;
}) {
  if (trialDaysLeft <= 0) return null;

  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
      <GlassCard style={styles.trialBanner}>
        <MaterialCommunityIcons
          name="clock-alert-outline"
          size={24}
          color={colors.accent.secondary}
        />
        <View style={styles.trialBannerText}>
          <Text style={styles.trialBannerTitle}>
            {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left in
            trial
          </Text>
          <Text style={styles.trialBannerSub}>
            Subscribe now to keep all premium features
          </Text>
        </View>
      </GlassCard>
    </AnimatedSection>
  );
}

export function ExpiredBanner() {
  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
      <GlassCard style={styles.expiredBanner}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={24}
          color={colors.semantic.danger}
        />
        <View style={styles.trialBannerText}>
          <Text style={styles.expiredTitle}>
            Your trial has ended
          </Text>
          <Text style={styles.trialBannerSub}>
            You still have all features — upgrade for unlimited lists & pantry
          </Text>
        </View>
      </GlassCard>
    </AnimatedSection>
  );
}

const styles = StyleSheet.create({
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: `${colors.accent.secondary}15`,
    borderColor: colors.accent.secondary,
    borderWidth: 1,
  },
  trialBannerText: { flex: 1 },
  trialBannerTitle: {
    ...typography.bodyLarge,
    color: colors.accent.secondary,
    fontWeight: "700",
  },
  trialBannerSub: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  expiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: `${colors.semantic.danger}15`,
    borderColor: colors.semantic.danger,
    borderWidth: 1,
  },
  expiredTitle: {
    ...typography.bodyLarge,
    color: colors.semantic.danger,
    fontWeight: "700",
  },
});
