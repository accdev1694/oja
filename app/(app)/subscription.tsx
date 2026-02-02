import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal,
  Pressable,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
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
  const scanCredits = useQuery(api.subscriptions.getScanCredits);

  const startTrial = useMutation(api.subscriptions.startFreeTrial);
  const cancelSub = useMutation(api.subscriptions.cancelSubscription);
  const createCheckout = useAction(api.stripe.createCheckoutSession);
  const createPortal = useAction(api.stripe.createPortalSession);

  const [trialLoading, setTrialLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const loading = subscription === undefined;
  const isPremium =
    subscription && "isActive" in subscription
      ? (subscription as any).isActive
      : subscription?.plan !== "free";
  const isTrial = subscription?.status === "trial";
  const isCancelled = subscription?.status === "cancelled";
  const isExpired = subscription?.status === "expired";

  // Trial days remaining
  const trialDaysLeft =
    isTrial && subscription && "trialEndsAt" in subscription
      ? Math.max(
          0,
          Math.ceil(
            (((subscription as any).trialEndsAt || 0) - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  // Period end for active subs
  const periodEnd =
    subscription && "currentPeriodEnd" in subscription
      ? (subscription as any).currentPeriodEnd
      : null;

  // Handle Stripe checkout
  const handleCheckout = useCallback(
    async (planId: "premium_monthly" | "premium_annual") => {
      setCheckoutLoading(planId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const result = await createCheckout({ planId });
        if (result.url) {
          await Linking.openURL(result.url);
        }
      } catch (error: any) {
        Alert.alert("Error", error?.message || "Failed to start checkout");
      } finally {
        setCheckoutLoading(null);
      }
    },
    [createCheckout]
  );

  // Handle manage subscription (Stripe portal)
  const handleManageSubscription = useCallback(async () => {
    setPortalLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await createPortal();
      if (result.url) {
        await Linking.openURL(result.url);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to open portal");
    } finally {
      setPortalLoading(false);
    }
  }, [createPortal]);

  // Handle start trial
  const handleStartTrial = useCallback(async () => {
    setTrialLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startTrial();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Trial Started!",
        "Enjoy 7 days of premium features for free!"
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to start trial");
    } finally {
      setTrialLoading(false);
    }
  }, [startTrial]);

  // Handle cancel subscription
  const handleCancelSubscription = useCallback(async () => {
    setCancelLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await cancelSub();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowCancelModal(false);
      Alert.alert(
        "Subscription Cancelled",
        "You'll keep access until the end of your billing period."
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to cancel");
    } finally {
      setCancelLoading(false);
    }
  }, [cancelSub]);

  if (loading) {
    return (
      <GlassScreen>
        <GlassHeader title="Premium" showBack onBack={() => router.back()} />
        <View style={styles.loading}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <GlassHeader
        title="Premium & Rewards"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Trial Banner */}
        {isTrial && trialDaysLeft > 0 && (
          <Animated.View entering={FadeInDown.duration(400)}>
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
          </Animated.View>
        )}

        {/* Expired Banner */}
        {isExpired && (
          <Animated.View entering={FadeInDown.duration(400)}>
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
                  Subscribe to unlock all premium features
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Current Plan Card */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <GlassCard style={styles.planCard}>
            <View style={styles.planHeader}>
              <MaterialCommunityIcons
                name={isPremium ? "crown" : "crown-outline"}
                size={32}
                color={
                  isPremium ? colors.accent.secondary : colors.text.tertiary
                }
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>
                  {isPremium
                    ? subscription?.plan === "premium_annual"
                      ? "Premium Annual"
                      : "Premium Monthly"
                    : "Free Plan"}
                </Text>
                <Text style={styles.planStatus}>
                  {isTrial
                    ? "Trial Active"
                    : isCancelled
                      ? "Cancels at period end"
                      : isPremium
                        ? "Active"
                        : "Upgrade for more features"}
                </Text>
                {isPremium && periodEnd && (
                  <Text style={styles.periodEnd}>
                    {isCancelled ? "Access until" : "Renews"}{" "}
                    {new Date(periodEnd).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>

            {/* Action Buttons for Premium Users */}
            {isPremium && !isTrial && (
              <View style={styles.planActions}>
                <GlassButton
                  variant="secondary"
                  size="sm"
                  icon="cog-outline"
                  onPress={handleManageSubscription}
                  loading={portalLoading}
                >
                  Manage Subscription
                </GlassButton>
                {!isCancelled && (
                  <Pressable
                    onPress={() => setShowCancelModal(true)}
                    style={styles.cancelLink}
                  >
                    <Text style={styles.cancelLinkText}>Cancel</Text>
                  </Pressable>
                )}
              </View>
            )}
          </GlassCard>
        </Animated.View>

        {/* Scan Rewards — unified tier + credits */}
        {scanCredits && (
          <Animated.View entering={FadeInDown.duration(400).delay(150)}>
            <GlassCard style={styles.scanCreditsCard}>
              {/* Tier Header */}
              <View style={styles.sectionHeader}>
                <View style={[styles.tierIconCircle, { backgroundColor: `${tierColors[scanCredits.tier] || tierColors.bronze}20` }]}>
                  <MaterialCommunityIcons
                    name={(tierIcons[scanCredits.tier] || "shield-outline") as any}
                    size={24}
                    color={tierColors[scanCredits.tier] || tierColors.bronze}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scanCreditsTitle}>Scan Rewards</Text>
                  <Text style={[styles.tierBadge, { color: tierColors[scanCredits.tier] || tierColors.bronze }]}>
                    {scanCredits.tier.charAt(0).toUpperCase() + scanCredits.tier.slice(1)} Tier
                  </Text>
                </View>
                <View style={styles.lifetimeScansChip}>
                  <MaterialCommunityIcons name="barcode-scan" size={14} color={colors.text.tertiary} />
                  <Text style={styles.lifetimeScansText}>
                    {scanCredits.lifetimeScans} scanned
                  </Text>
                </View>
              </View>

              {/* Tier Progress */}
              {scanCredits.tierInfo.nextTier && scanCredits.tierInfo.scansToNextTier > 0 && (
                <View style={styles.tierProgress}>
                  <View style={styles.tierProgressBar}>
                    <View
                      style={[
                        styles.tierProgressFill,
                        {
                          width: `${Math.min(100, (scanCredits.lifetimeScans / (scanCredits.lifetimeScans + scanCredits.tierInfo.scansToNextTier)) * 100)}%`,
                          backgroundColor: tierColors[scanCredits.tier] || tierColors.bronze,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.nextTierText}>
                    {scanCredits.tierInfo.scansToNextTier} more scan{scanCredits.tierInfo.scansToNextTier !== 1 ? "s" : ""} to{" "}
                    {scanCredits.tierInfo.nextTier.charAt(0).toUpperCase() + scanCredits.tierInfo.nextTier.slice(1)}
                  </Text>
                </View>
              )}
              {!scanCredits.tierInfo.nextTier && (
                <View style={styles.scanMaxedRow}>
                  <MaterialCommunityIcons name="trophy" size={16} color={tierColors.platinum} />
                  <Text style={[styles.scanMaxedText, { color: tierColors.platinum }]}>
                    Maximum tier reached!
                  </Text>
                </View>
              )}

              {/* Credit Progress (premium only) */}
              {scanCredits.isPremium && (
                <>
                  <View style={styles.creditDivider} />

                  {/* Scan progress dots */}
                  <View style={styles.scanDotsRow}>
                    {Array.from({ length: scanCredits.maxScans > 8 ? 4 : scanCredits.maxScans }).map((_, i) => {
                      const filled = i < (scanCredits.maxScans > 8
                        ? Math.ceil(scanCredits.scansThisPeriod / (scanCredits.maxScans / 4))
                        : scanCredits.scansThisPeriod);
                      return (
                        <View
                          key={i}
                          style={[
                            styles.scanDot,
                            filled ? styles.scanDotFilled : styles.scanDotEmpty,
                          ]}
                        >
                          {filled ? (
                            <MaterialCommunityIcons name="check" size={14} color="#fff" />
                          ) : (
                            <MaterialCommunityIcons name="camera-outline" size={14} color={colors.text.tertiary} />
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Credit progress bar */}
                  <View style={styles.creditProgressContainer}>
                    <View style={styles.creditProgressTrack}>
                      <View
                        style={[
                          styles.creditProgressFill,
                          { width: `${Math.min(100, (scanCredits.creditsEarned / scanCredits.maxCredits) * 100)}%` },
                        ]}
                      />
                    </View>
                    <View style={styles.creditAmountRow}>
                      <Text style={styles.creditEarned}>
                        £{scanCredits.creditsEarned.toFixed(2)} earned
                      </Text>
                      <Text style={styles.creditMax}>
                        of £{scanCredits.maxCredits.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Effective price */}
                  {scanCredits.creditsEarned > 0 && (
                    <View style={styles.effectivePriceRow}>
                      <Text style={styles.effectivePriceLabel}>Next renewal:</Text>
                      <View style={styles.effectivePriceValues}>
                        <Text style={styles.effectivePriceStrike}>
                          £{scanCredits.basePrice.toFixed(2)}
                        </Text>
                        <Text style={styles.effectivePriceValue}>
                          £{scanCredits.effectivePrice.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Encouragement */}
                  {scanCredits.scansThisPeriod < scanCredits.maxScans ? (
                    <Text style={styles.scanEncouragement}>
                      Scan {scanCredits.maxScans - scanCredits.scansThisPeriod} more receipt
                      {scanCredits.maxScans - scanCredits.scansThisPeriod !== 1 ? "s" : ""} to
                      save £{(scanCredits.maxCredits - scanCredits.creditsEarned).toFixed(2)} more
                    </Text>
                  ) : (
                    <View style={styles.scanMaxedRow}>
                      <MaterialCommunityIcons name="check-circle" size={16} color={colors.semantic.success} />
                      <Text style={styles.scanMaxedText}>
                        Maximum credits earned this period!
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Free user CTA */}
              {!scanCredits.isPremium && (
                <>
                  <View style={styles.creditDivider} />
                  <View style={styles.freeUserCta}>
                    <MaterialCommunityIcons name="lock-outline" size={18} color={colors.text.tertiary} />
                    <Text style={styles.freeUserCtaText}>
                      Upgrade to Premium to earn up to £{scanCredits.tierInfo.maxCredits.toFixed(2)}/mo back
                    </Text>
                  </View>
                </>
              )}
            </GlassCard>
          </Animated.View>
        )}

        {/* Free Trial CTA — only for free users who haven't had a subscription */}
        {!isPremium && !isExpired && subscription?.plan === "free" && (
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <GlassCard style={styles.trialCta}>
              <MaterialCommunityIcons
                name="star-shooting"
                size={40}
                color={colors.accent.secondary}
              />
              <Text style={styles.trialCtaTitle}>Try Premium Free</Text>
              <Text style={styles.trialCtaSubtext}>
                7 days of all premium features, no credit card needed
              </Text>
              <GlassButton
                variant="primary"
                size="lg"
                icon="rocket-launch"
                onPress={handleStartTrial}
                loading={trialLoading}
                style={styles.trialCtaButton}
              >
                Start Free Trial
              </GlassButton>
            </GlassCard>
          </Animated.View>
        )}

        {/* Plans */}
        {plans && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Text style={styles.sectionTitle}>
              {isPremium ? "Change Plan" : "Choose a Plan"}
            </Text>
            {plans
              .filter((p: any) => p.id !== "free")
              .map((plan: any) => {
                const isCurrentPlan = plan.id === subscription?.plan;
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
                        onPress={() => handleCheckout(plan.id)}
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
          </Animated.View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={colors.semantic.warning}
            />
            <Text style={styles.modalTitle}>Cancel Subscription?</Text>
            <Text style={styles.modalBody}>
              You'll lose access to premium features at the end of your current
              billing period. Your scan rewards tier will be kept.
            </Text>
            <View style={styles.modalActions}>
              <GlassButton
                variant="secondary"
                size="md"
                onPress={() => setShowCancelModal(false)}
                style={styles.modalButton}
              >
                Keep Subscription
              </GlassButton>
              <GlassButton
                variant="danger"
                size="md"
                onPress={handleCancelSubscription}
                loading={cancelLoading}
                style={styles.modalButton}
              >
                Cancel
              </GlassButton>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  // Trial / Expired Banner
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

  // Current Plan
  planCard: { marginBottom: spacing.md },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  planName: {
    ...typography.headlineMedium,
    color: colors.text.primary,
  },
  planStatus: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
  },
  periodEnd: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  planActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  cancelLink: { padding: spacing.sm },
  cancelLinkText: {
    ...typography.bodyMedium,
    color: colors.semantic.danger,
    fontWeight: "600",
  },

  // Trial CTA
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
  trialCtaButton: { width: "100%", marginTop: spacing.sm },

  // Section
  sectionTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
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

  // Scan Rewards
  scanCreditsCard: { marginBottom: spacing.md },
  scanCreditsTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tierIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tierBadge: {
    ...typography.labelSmall,
    fontWeight: "700",
  },
  lifetimeScansChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${colors.text.tertiary}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lifetimeScansText: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  tierProgress: { marginBottom: spacing.sm },
  tierProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: `${colors.text.tertiary}30`,
    overflow: "hidden",
  },
  tierProgressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.accent.primary,
  },
  nextTierText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  creditDivider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.sm,
  },
  scanDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  scanDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scanDotFilled: {
    backgroundColor: colors.accent.primary,
  },
  scanDotEmpty: {
    backgroundColor: `${colors.text.tertiary}20`,
    borderWidth: 1,
    borderColor: `${colors.text.tertiary}40`,
  },
  creditProgressContainer: { marginBottom: spacing.sm },
  creditProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: `${colors.text.tertiary}20`,
    overflow: "hidden",
  },
  creditProgressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.accent.primary,
  },
  creditAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  creditEarned: {
    ...typography.bodyMedium,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  creditMax: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  effectivePriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: `${colors.semantic.success}10`,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  effectivePriceLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  effectivePriceValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  effectivePriceStrike: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    textDecorationLine: "line-through",
  },
  effectivePriceValue: {
    ...typography.headlineSmall,
    color: colors.semantic.success,
    fontWeight: "700",
  },
  scanEncouragement: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
    fontStyle: "italic",
  },
  scanMaxedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  scanMaxedText: {
    ...typography.bodyMedium,
    color: colors.semantic.success,
    fontWeight: "600",
  },
  freeUserCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  freeUserCtaText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
    fontStyle: "italic",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    width: "100%",
  },
  modalTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    textAlign: "center",
  },
  modalBody: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
    marginTop: spacing.sm,
  },
  modalButton: { flex: 1 },
});
