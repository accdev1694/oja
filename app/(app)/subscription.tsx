import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Linking,
} from "react-native";
import { useRouter, type Href} from "expo-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassScreen,
  GlassButton,
  GlassModal,
  SimpleHeader,
  SkeletonCard,
  colors,
  typography,
  spacing,
  useGlassAlert,
} from "@/components/ui/glass";
import { TrialBanner, ExpiredBanner } from "@/components/subscription/SubscriptionBanners";
import { CurrentPlanCard } from "@/components/subscription/CurrentPlanCard";
import { ScanRewardsCard } from "@/components/subscription/ScanRewardsCard";
import {
  PremiumValueProp,
  FeatureComparison,
  PlanOptionsList,
} from "@/components/subscription/PlanOptions";

export default function SubscriptionScreen() {
  const router = useRouter();
  const { alert } = useGlassAlert();
  const subscription = useQuery(api.subscriptions.getCurrentSubscription);
  const plans = useQuery(api.subscriptions.getPlans);
  const pointsBalance = useQuery(api.points.getPointsBalance);

  const cancelSub = useMutation(api.subscriptions.cancelSubscription);
  const createCheckout = useAction(api.stripe.createCheckoutSession);
  const createPortal = useAction(api.stripe.createPortalSession);

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const loading = subscription === undefined;
  const isAdmin = (subscription as { isAdminOverride?: boolean })?.isAdminOverride;
  const isPremium =
    subscription && "isActive" in subscription
      ? (subscription as { isActive?: boolean }).isActive
      : subscription?.plan !== "free";
  const isTrial = !isAdmin && subscription?.status === "trial";
  const isCancelled = !isAdmin && subscription?.status === "cancelled";
  const isExpired = !isAdmin && subscription?.status === "expired";

  // Trial days remaining
  const trialDaysLeft =
    !isAdmin && isTrial && subscription && "trialEndsAt" in subscription
      ? Math.max(
          0,
          Math.ceil(
            (((subscription as { trialEndsAt?: number }).trialEndsAt || 0) - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  // Period end for active subs
  const periodEnd =
    !isAdmin && subscription && "currentPeriodEnd" in subscription
      ? (subscription as { currentPeriodEnd?: number }).currentPeriodEnd
      : null;

  // Handle manage subscription (Stripe portal)
  const handleManageSubscription = useCallback(async () => {
    setPortalLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await createPortal();
      if (result.url) {
        await Linking.openURL(result.url);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      alert("Error", message || "Failed to open portal");
    } finally {
      setPortalLoading(false);
    }
  }, [createPortal]);

  // Handle Stripe checkout
  const handleCheckout = useCallback(
    async (planId: "premium_monthly" | "premium_annual") => {
      // If already premium (and not in trial), redirect to portal instead of checkout
      // to prevent duplicate subscriptions.
      if (isPremium && !isTrial && !isAdmin) {
        alert(
          "Manage Subscription",
          "You already have an active subscription. To switch plans, please use the 'Manage Subscription' portal.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Portal", onPress: handleManageSubscription }
          ]
        );
        return;
      }

      setCheckoutLoading(planId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const result = await createCheckout({ planId });
        if (result.url) {
          await Linking.openURL(result.url);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        alert("Error", message || "Failed to start checkout");
      } finally {
        setCheckoutLoading(null);
      }
    },
    [isPremium, isTrial, isAdmin, alert, handleManageSubscription, createCheckout]
  );

  // Handle cancel subscription
  const handleCancelSubscription = useCallback(async () => {
    setCancelLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await cancelSub();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowCancelModal(false);
      alert(
        "Subscription Cancelled",
        "You'll keep access until the end of your billing period."
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      alert("Error", message || "Failed to cancel");
    } finally {
      setCancelLoading(false);
    }
  }, [cancelSub]);

  if (loading) {
    return (
      <GlassScreen>
        <SimpleHeader title="Premium" showBack onBack={() => router.back()} />
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
      <SimpleHeader
        title="Premium & Rewards"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Trial Banner */}
        {isTrial && <TrialBanner trialDaysLeft={trialDaysLeft} />}

        {/* Expired Banner */}
        {isExpired && <ExpiredBanner />}

        {/* Current Plan Card */}
        <CurrentPlanCard
          isAdmin={isAdmin}
          isPremium={isPremium}
          isTrial={isTrial}
          isCancelled={isCancelled}
          subscription={subscription}
          periodEnd={periodEnd}
          portalLoading={portalLoading}
          onManageSubscription={handleManageSubscription}
          onShowCancelModal={() => setShowCancelModal(true)}
        />

        {/* Scan Rewards */}
        <ScanRewardsCard
          pointsBalance={pointsBalance}
          isAdmin={isAdmin}
          onViewPointsHistory={() => router.push("/(app)/points-history" as Href)}
        />

        {/* Free user value prop -- hide for admins */}
        {!isPremium && !isTrial && !isAdmin && <PremiumValueProp />}

        {/* Feature Comparison */}
        <FeatureComparison />

        {/* Plans -- hide for admins */}
        {plans && !isAdmin && (
          <PlanOptionsList
            plans={plans}
            subscription={subscription}
            isPremium={isPremium}
            checkoutLoading={checkoutLoading}
            onCheckout={handleCheckout}
          />
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <GlassModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        overlayOpacity={0.7}
        contentStyle={styles.modalContent}
      >
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={colors.semantic.warning}
        />
        <Text style={styles.modalTitle}>Cancel Subscription?</Text>
        <Text style={styles.modalBody}>
          You&apos;ll keep all features but go back to 2 lists and 30 pantry items.
          Your scan rewards tier will be kept.
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
      </GlassModal>
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

  // Modal
  modalContent: {
    alignItems: "center",
    gap: spacing.md,
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
