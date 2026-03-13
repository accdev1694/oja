import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  AnimatedSection,
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

export function ScanRewardsCard({
  pointsBalance,
  isAdmin,
  onViewPointsHistory,
}: {
  pointsBalance: any;
  isAdmin: boolean;
  onViewPointsHistory: () => void;
}) {
  if (!pointsBalance) return null;

  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={150}>
      <GlassCard style={styles.scanCreditsCard}>
        {/* Tier Header */}
        <View style={styles.sectionHeader}>
          <View style={[styles.tierIconCircle, { backgroundColor: `${tierColors[pointsBalance.tier] || tierColors.bronze}20` }]}>
            <MaterialCommunityIcons
              name={(tierIcons[pointsBalance.tier] || "shield-outline") as any}
              size={24}
              color={tierColors[pointsBalance.tier] || tierColors.bronze}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scanCreditsTitle}>Scan Rewards</Text>
            <Text style={[styles.tierBadge, { color: tierColors[pointsBalance.tier] || tierColors.bronze }]}>
              {pointsBalance.tier.charAt(0).toUpperCase() + pointsBalance.tier.slice(1)} Tier
            </Text>
          </View>
          <View style={styles.lifetimeScansChip}>
            <MaterialCommunityIcons name="cube-scan" size={14} color={colors.text.tertiary} />
            <Text style={styles.lifetimeScansText}>
              {pointsBalance.tierProgress} scanned
            </Text>
          </View>
        </View>

        {/* Tier Progress */}
        {pointsBalance.nextTierInfo?.nextTier && pointsBalance.nextTierInfo.scansToNextTier > 0 && (
          <View style={styles.tierProgress}>
            <View style={styles.tierProgressBar}>
              <View
                style={[
                  styles.tierProgressFill,
                  {
                    width: `${Math.min(100, (pointsBalance.tierProgress / (pointsBalance.tierProgress + pointsBalance.nextTierInfo.scansToNextTier)) * 100)}%`,
                    backgroundColor: tierColors[pointsBalance.tier] || tierColors.bronze,
                  },
                ]}
              />
            </View>
            <Text style={styles.nextTierText}>
              {pointsBalance.nextTierInfo.scansToNextTier} more scan{pointsBalance.nextTierInfo.scansToNextTier !== 1 ? "s" : ""} to{" "}
              {pointsBalance.nextTierInfo.nextTier.charAt(0).toUpperCase() + pointsBalance.nextTierInfo.nextTier.slice(1)}
            </Text>
          </View>
        )}
        {!pointsBalance.nextTierInfo?.nextTier && (
          <View style={styles.scanMaxedRow}>
            <MaterialCommunityIcons name="trophy" size={16} color={tierColors.platinum} />
            <Text style={[styles.scanMaxedText, { color: tierColors.platinum }]}>
              Maximum tier reached!
            </Text>
          </View>
        )}

        {/* Points Progress */}
        <>
          <View style={styles.creditDivider} />

          {/* Scan progress dots */}
          <View style={styles.scanDotsRow}>
            {Array.from({ length: pointsBalance.maxEarningScans > 8 ? 4 : pointsBalance.maxEarningScans }).map((_, i) => {
              const filled = i < (pointsBalance.maxEarningScans > 8
                ? Math.ceil(pointsBalance.earningScansThisMonth / (pointsBalance.maxEarningScans / 4))
                : pointsBalance.earningScansThisMonth);
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

          {/* Points amount */}
          <View style={styles.creditProgressContainer}>
            <View style={styles.creditAmountRow}>
              <Text style={styles.creditEarned}>
                {pointsBalance.availablePoints.toLocaleString()} points available
              </Text>
              <Text style={styles.creditMax}>
                (Value: £{(pointsBalance.availablePoints / 1000).toFixed(2)})
              </Text>
            </View>
          </View>

          {/* Points History Link */}
          <Pressable
            style={{ marginTop: spacing.md, alignSelf: "center" }}
            onPress={onViewPointsHistory}
          >
            <Text style={{ color: colors.accent.primary, ...typography.labelMedium }}>
              View Points History
            </Text>
          </Pressable>

          {/* Encouragement */}
          {pointsBalance.earningScansThisMonth < pointsBalance.maxEarningScans ? (
            <Text style={styles.scanEncouragement}>
              Scan {pointsBalance.maxEarningScans - pointsBalance.earningScansThisMonth} more receipt
              {pointsBalance.maxEarningScans - pointsBalance.earningScansThisMonth !== 1 ? "s" : ""} to
              earn up to {pointsBalance.monthlyEarningCap} more points this month
            </Text>
          ) : (
            <View style={styles.scanMaxedRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color={colors.semantic.success} />
              <Text style={styles.scanMaxedText}>
                Maximum points earning scans reached for this month!
              </Text>
            </View>
          )}
        </>

        {/* Free user CTA */}
        {!pointsBalance.isPremium && !isAdmin && (
          <>
            <View style={styles.creditDivider} />
            <View style={styles.freeUserCta}>
              <MaterialCommunityIcons name="star-circle-outline" size={18} color={colors.accent.primary} />
              <Text style={styles.freeUserCtaText}>
                Upgrade to unlock more earning scans per month and get higher points per scan.
              </Text>
            </View>
          </>
        )}
      </GlassCard>
    </AnimatedSection>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "rgba(255, 255, 255, 0.10)",
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
    backgroundColor: "rgba(255, 255, 255, 0.20)",
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
    backgroundColor: "rgba(255, 255, 255, 0.13)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.26)",
  },
  creditProgressContainer: { marginBottom: spacing.sm },
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
});
