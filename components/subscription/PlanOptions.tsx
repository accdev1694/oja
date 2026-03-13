import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import {
  GlassCard,
  GlassButton,
  AnimatedSection,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

export function PremiumValueProp() {
  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={200}>
      <GlassCard style={styles.trialCta}>
        <MaterialCommunityIcons
          name="gift-outline"
          size={40}
          color={colors.accent.secondary}
        />
        <Text style={styles.trialCtaTitle}>Premium Pays for Itself</Text>
        <Text style={styles.trialCtaSubtext}>
          Unlock high-value rewards, unlimited storage, and advanced insights. Most users save more than the subscription cost!
        </Text>

        <View style={styles.savingsGrid}>
          <View style={styles.savingsItem}>
            <Text style={styles.savingsValue}>£1.50</Text>
            <Text style={styles.savingsLabel}>Monthly Reward</Text>
          </View>
          <View style={styles.savingsItem}>
            <Text style={styles.savingsValue}>12%</Text>
            <Text style={styles.savingsLabel}>Avg. Savings</Text>
          </View>
        </View>
      </GlassCard>
    </AnimatedSection>
  );
}

export function FeatureComparison() {
  return (
    <AnimatedSection animation="fadeInUp" duration={400} delay={250}>
      <Text style={styles.sectionTitle}>Rewards & Benefits</Text>
      <GlassCard variant="standard" style={styles.featuresCard}>
        {[
          { icon: "camera-burst", text: "Up to 6 point-earning scans/mo", premium: true },
          { icon: "star-shooting", text: "Higher points per scan (Platinum tier)", premium: true },
          { icon: "account-group", text: "Shared lists with family", premium: true },
          { icon: "infinity", text: "Unlimited active lists & items", premium: true },
          { icon: "chart-bell-curve", text: "Advanced price trends & insights", premium: true },
          { icon: "shield-check", text: "Priority support access", premium: true },
        ].map((item, idx) => (
          <View key={idx} style={styles.featureBenefitRow}>
            <MaterialCommunityIcons name={item.icon as ComponentProps<typeof MaterialCommunityIcons>["name"]} size={20} color={colors.accent.primary} />
            <Text style={styles.featureBenefitText}>{item.text}</Text>
            {item.premium && (
              <View style={styles.premiumOnlyBadge}>
                <Text style={styles.premiumOnlyText}>PREMIUM</Text>
              </View>
            )}
          </View>
        ))}
      </GlassCard>
    </AnimatedSection>
  );
}

interface PlanOption {
  id: string;
  name: string;
  price: number;
  period: string;
  savings?: string;
  features: string[];
}

export function PlanOptionsList({
  plans,
  subscription,
  isPremium,
  checkoutLoading,
  onCheckout,
}: {
  plans: PlanOption[];
  subscription: { plan?: string; status?: string } | null | undefined;
  isPremium: boolean;
  checkoutLoading: string | null;
  onCheckout: (planId: "premium_monthly" | "premium_annual") => void;
}) {
  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={300}>
      <Text style={styles.sectionTitle}>
        {isPremium ? "Change Plan" : "Choose a Plan"}
      </Text>
      {plans
        .filter((p) => p.id !== "free")
        .map((plan) => {
          const isCurrentPlan = plan.id === subscription?.plan && subscription?.status === "active";
          const isLoading = checkoutLoading === plan.id;
          return (
            <GlassCard
              key={plan.id}
              style={[
                styles.planOption,
                isCurrentPlan && styles.activePlan,
              ]}
            >
              <View style={styles.planOptionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planOptionName}>{plan.name}</Text>
                  {plan.savings && (
                    <Text style={styles.savingsBadge}>
                      {plan.savings}
                    </Text>
                  )}
                </View>
                <Text style={styles.planPrice}>
                  £{plan.price.toFixed(2)}
                  <Text style={styles.planPeriod}>
                    /{plan.period}
                  </Text>
                </Text>
              </View>
              <View style={styles.featuresList}>
                {plan.features.map((f: string, i: number) => (
                  <View key={i} style={styles.featureRow}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color={colors.semantic.success}
                    />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
              {!isCurrentPlan && (
                <GlassButton
                  variant="primary"
                  size="md"
                  icon="credit-card-outline"
                  onPress={() => onCheckout(plan.id)}
                  loading={isLoading}
                  style={styles.checkoutButton}
                >
                  {isPremium ? "Switch Plan" : "Subscribe"}
                </GlassButton>
              )}
              {isCurrentPlan && (
                <View style={styles.currentBadge}>
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={16}
                    color={colors.accent.primary}
                  />
                  <Text style={styles.currentBadgeText}>
                    Current Plan
                  </Text>
                </View>
              )}
            </GlassCard>
          );
        })}
    </AnimatedSection>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  // Premium Value Prop
  trialCta: {
    alignItems: "center",
    marginBottom: spacing.lg,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  trialCtaTitle: {
    ...typography.headlineMedium,
    color: colors.accent.secondary,
  },
  trialCtaSubtext: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textAlign: "center",
  },
  savingsGrid: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.md,
    width: "100%",
  },
  savingsItem: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  savingsValue: {
    ...typography.headlineSmall,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  savingsLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginTop: 4,
  },

  // Feature Comparison
  featuresCard: {
    padding: 0,
    overflow: "hidden",
  },
  featureBenefitRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    gap: spacing.md,
  },
  featureBenefitText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    flex: 1,
  },
  premiumOnlyBadge: {
    backgroundColor: `${colors.accent.secondary}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: `${colors.accent.secondary}40`,
  },
  premiumOnlyText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.accent.secondary,
  },

  // Plan Options
  planOption: { marginBottom: spacing.md },
  activePlan: {
    borderColor: colors.accent.primary,
    borderWidth: 2,
  },
  planOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  planOptionName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "700",
  },
  planPrice: {
    ...typography.headlineMedium,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  planPeriod: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    fontWeight: "400",
  },
  savingsBadge: {
    ...typography.labelSmall,
    color: colors.semantic.success,
    fontWeight: "700",
    marginTop: 2,
  },
  featuresList: { gap: spacing.xs, marginBottom: spacing.md },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  checkoutButton: { marginTop: spacing.xs },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  currentBadgeText: {
    ...typography.bodyMedium,
    color: colors.accent.primary,
    fontWeight: "600",
  },
});
