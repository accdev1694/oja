import { View, Text, StyleSheet, ScrollView, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassHeader,
  SkeletonCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

const tierColors: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
};

const tierIcons: Record<string, string> = {
  bronze: "shield-outline",
  silver: "shield-half-full",
  gold: "shield",
  platinum: "shield-star",
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const subscription = useQuery(api.subscriptions.getCurrentSubscription);
  const plans = useQuery(api.subscriptions.getPlans);
  const loyalty = useQuery(api.subscriptions.getLoyaltyPoints);
  const pointHistory = useQuery(api.subscriptions.getPointHistory);
  const startTrial = useMutation(api.subscriptions.startFreeTrial);
  const [trialLoading, setTrialLoading] = useState(false);

  async function handleStartTrial() {
    setTrialLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startTrial();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === "web") {
        window.alert("Premium trial started! Enjoy 7 days of all features.");
      } else {
        Alert.alert("Trial Started!", "Enjoy 7 days of premium features for free!");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to start trial");
    } finally {
      setTrialLoading(false);
    }
  }

  const loading = subscription === undefined;

  if (loading) {
    return (
      <GlassScreen>
        <GlassHeader title="Premium" showBack onBack={() => router.back()} />
        <View style={styles.loading}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </GlassScreen>
    );
  }

  const isPremium = ("isActive" in (subscription || {})) ? (subscription as any)?.isActive : subscription?.plan !== "free";

  return (
    <GlassScreen>
      <GlassHeader title="Premium & Rewards" showBack onBack={() => router.back()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Current Plan */}
        <GlassCard style={styles.planCard}>
          <View style={styles.planHeader}>
            <MaterialCommunityIcons
              name={isPremium ? "crown" : "crown-outline"}
              size={32}
              color={isPremium ? colors.accent.secondary : colors.text.tertiary}
            />
            <View>
              <Text style={styles.planName}>
                {isPremium ? "Premium" : "Free Plan"}
              </Text>
              <Text style={styles.planStatus}>
                {subscription?.status === "trial"
                  ? "Trial Active"
                  : isPremium
                  ? "Active"
                  : "Upgrade for more features"}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Free Trial CTA */}
        {!isPremium && (
          <GlassCard style={styles.trialCard}>
            <MaterialCommunityIcons name="star-shooting" size={40} color={colors.accent.secondary} />
            <Text style={styles.trialTitle}>Try Premium Free</Text>
            <Text style={styles.trialSubtext}>7 days of all premium features, no credit card needed</Text>
            <GlassButton
              variant="primary"
              size="lg"
              icon="rocket-launch"
              onPress={handleStartTrial}
              loading={trialLoading}
              style={styles.trialButton}
            >
              Start Free Trial
            </GlassButton>
          </GlassCard>
        )}

        {/* Plans */}
        {plans && (
          <View>
            <Text style={styles.sectionTitle}>Plans</Text>
            {plans.map((plan: any) => (
              <GlassCard key={plan.id} style={[styles.planOption, plan.id === subscription?.plan && styles.activePlan]}>
                <View style={styles.planOptionHeader}>
                  <Text style={styles.planOptionName}>{plan.name}</Text>
                  {plan.price > 0 && (
                    <Text style={styles.planPrice}>
                      £{plan.price.toFixed(2)}{plan.period ? `/${plan.period}` : ""}
                    </Text>
                  )}
                  {plan.savings && <Text style={styles.savingsBadge}>{plan.savings}</Text>}
                </View>
                <View style={styles.featuresList}>
                  {plan.features.map((f: string, i: number) => (
                    <View key={i} style={styles.featureRow}>
                      <MaterialCommunityIcons name="check" size={16} color={colors.semantic.success} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Loyalty Points */}
        {loyalty && (
          <GlassCard style={styles.loyaltyCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name={(tierIcons[loyalty.tier] || "shield-outline") as any}
                size={28}
                color={tierColors[loyalty.tier] || colors.accent.primary}
              />
              <View>
                <Text style={styles.sectionTitle}>Loyalty Points</Text>
                <Text style={[styles.tierBadge, { color: tierColors[loyalty.tier] }]}>
                  {loyalty.tier.toUpperCase()} Tier
                </Text>
              </View>
            </View>

            <View style={styles.pointsDisplay}>
              <Text style={styles.pointsNumber}>{loyalty.points.toLocaleString()}</Text>
              <Text style={styles.pointsLabel}>points available</Text>
            </View>

            {loyalty.discount > 0 && (
              <View style={styles.discountBadge}>
                <MaterialCommunityIcons name="percent" size={16} color={colors.semantic.success} />
                <Text style={styles.discountText}>{loyalty.discount}% discount on premium</Text>
              </View>
            )}

            {loyalty.nextTier && loyalty.pointsToNextTier > 0 && (
              <Text style={styles.nextTierText}>
                {loyalty.pointsToNextTier} points to {loyalty.nextTier}
              </Text>
            )}
          </GlassCard>
        )}

        {/* Point History */}
        {pointHistory && pointHistory.length > 0 && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Points</Text>
            {pointHistory.slice(0, 10).map((t: any) => (
              <View key={t._id} style={styles.transRow}>
                <View>
                  <Text style={styles.transDesc}>{t.description}</Text>
                  <Text style={styles.transSource}>{t.source}</Text>
                </View>
                <Text style={[styles.transAmount, { color: t.amount > 0 ? colors.semantic.success : colors.semantic.danger }]}>
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </Text>
              </View>
            ))}
          </GlassCard>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  planCard: { marginBottom: spacing.md },
  planHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  planName: { ...typography.headlineMedium, color: colors.text.primary },
  planStatus: { ...typography.bodyMedium, color: colors.text.tertiary },
  trialCard: { alignItems: "center", marginBottom: spacing.lg, gap: spacing.sm, padding: spacing.xl },
  trialTitle: { ...typography.headlineMedium, color: colors.accent.secondary },
  trialSubtext: { ...typography.bodyMedium, color: colors.text.tertiary, textAlign: "center" },
  trialButton: { width: "100%", marginTop: spacing.sm },
  sectionTitle: { ...typography.headlineSmall, color: colors.text.primary, marginBottom: spacing.md, marginTop: spacing.sm },
  planOption: { marginBottom: spacing.sm },
  activePlan: { borderColor: colors.accent.primary, borderWidth: 2 },
  planOptionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm, flexWrap: "wrap" },
  planOptionName: { ...typography.bodyLarge, color: colors.text.primary, fontWeight: "700" },
  planPrice: { ...typography.bodyLarge, color: colors.accent.primary, fontWeight: "600" },
  savingsBadge: { ...typography.labelSmall, color: colors.semantic.success, backgroundColor: `${colors.semantic.success}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: "hidden" },
  featuresList: { gap: spacing.xs },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  featureText: { ...typography.bodyMedium, color: colors.text.secondary },
  loyaltyCard: { marginBottom: spacing.md, marginTop: spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  tierBadge: { ...typography.labelSmall, fontWeight: "700" },
  pointsDisplay: { alignItems: "center", paddingVertical: spacing.md },
  pointsNumber: { fontSize: 48, fontWeight: "800", color: colors.accent.primary },
  pointsLabel: { ...typography.bodyMedium, color: colors.text.tertiary },
  discountBadge: { flexDirection: "row", alignItems: "center", gap: spacing.xs, justifyContent: "center", backgroundColor: `${colors.semantic.success}15`, padding: spacing.sm, borderRadius: 8, marginTop: spacing.sm },
  discountText: { ...typography.bodyMedium, color: colors.semantic.success, fontWeight: "600" },
  nextTierText: { ...typography.bodySmall, color: colors.text.tertiary, textAlign: "center", marginTop: spacing.sm },
  section: { marginBottom: spacing.md },
  transRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  transDesc: { ...typography.bodyMedium, color: colors.text.primary },
  transSource: { ...typography.bodySmall, color: colors.text.tertiary },
  transAmount: { ...typography.bodyLarge, fontWeight: "700" },
});
