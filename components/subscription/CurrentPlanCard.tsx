import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  GlassButton,
  AnimatedSection,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export function CurrentPlanCard({
  isAdmin,
  isPremium,
  isTrial,
  isCancelled,
  subscription,
  periodEnd,
  portalLoading,
  onManageSubscription,
  onShowCancelModal,
}: {
  isAdmin: boolean;
  isPremium: boolean;
  isTrial: boolean;
  isCancelled: boolean;
  subscription: any;
  periodEnd: number | null;
  portalLoading: boolean;
  onManageSubscription: () => void;
  onShowCancelModal: () => void;
}) {
  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
      <GlassCard style={styles.planCard}>
        <View style={styles.planHeader}>
          <MaterialCommunityIcons
            name={isAdmin ? "shield-crown" : isPremium ? "crown" : "crown-outline"}
            size={32}
            color={
              isAdmin ? colors.semantic.danger : isPremium ? colors.accent.secondary : colors.text.tertiary
            }
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>
              {isAdmin
                ? "Admin Access"
                : isPremium
                  ? subscription?.plan === "premium_annual"
                    ? "Premium Annual"
                    : "Premium Monthly"
                  : "Free Plan"}
            </Text>
            <Text style={styles.planStatus}>
              {isAdmin
                ? "Full platform access enabled"
                : isTrial
                  ? "Trial Active"
                  : isCancelled
                    ? "Cancels at period end"
                    : isPremium
                      ? "Active"
                      : "Upgrade for unlimited lists & pantry"}
            </Text>
            {isPremium && periodEnd && !isAdmin && (
              <Text style={styles.periodEnd}>
                {isCancelled ? "Access until" : "Renews"}{" "}
                {new Date(periodEnd).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons for Premium Users */}
        {isPremium && !isTrial && !isAdmin && (
          <View style={styles.planActions}>
            <GlassButton
              variant="secondary"
              size="sm"
              icon="cog-outline"
              onPress={onManageSubscription}
              loading={portalLoading}
            >
              Manage Subscription
            </GlassButton>
            {!isCancelled && (
              <Pressable
                onPress={onShowCancelModal}
                style={styles.cancelLink}
              >
                <Text style={styles.cancelLinkText}>Cancel</Text>
              </Pressable>
            )}
          </View>
        )}
      </GlassCard>
    </AnimatedSection>
  );
}

const styles = StyleSheet.create({
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
});
