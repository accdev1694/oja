import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";

import {
  GlassScreen,
  GlassCard,
  SimpleHeader,
  SkeletonCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * AI Usage Screen
 * Shows voice usage, receipt scan stats, and AI settings
 */
export default function AIUsageScreen() {
  const router = useRouter();
  const { user: convexUser } = useCurrentUser();
  const usageSummary = useQuery(api.aiUsage.getUsageSummary);
  const scanCredits = useQuery(api.subscriptions.getScanCredits);
  const updateAiSettings = useMutation(api.aiUsage.updateAiSettings);

  const isAdmin = !!convexUser?.isAdmin;

  const handleToggleVoice = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateAiSettings({ voiceEnabled: value });
  };

  const handleToggleAlerts = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateAiSettings({ usageAlerts: value });
  };

  // Loading state
  if (usageSummary === undefined) {
    return (
      <GlassScreen>
        <SimpleHeader
          title="AI Usage"
          subtitle="Loading..."
          showBack
          onBack={() => router.back()}
        />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <SkeletonCard />
          <View style={{ height: spacing.md }} />
          <SkeletonCard />
        </ScrollView>
      </GlassScreen>
    );
  }

  const voice = usageSummary?.voice ?? { usage: 0, limit: 200, percentage: 0 };
  const receipts = usageSummary?.receipts ?? { scansThisPeriod: 0, creditsEarned: 0, lifetimeScans: 0 };
  const settings = usageSummary?.aiSettings ?? { voiceEnabled: true, usageAlerts: true };

  // Determine voice status color
  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return colors.semantic.danger;
    if (percentage >= 80) return colors.accent.warm;
    if (percentage >= 50) return colors.accent.secondary;
    return colors.accent.primary;
  };

  const voiceColor = getStatusColor(voice.percentage);

  return (
    <GlassScreen>
      <SimpleHeader
        title="AI Usage"
        subtitle="This month"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Voice Assistant Usage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Assistant</Text>
          <GlassCard variant="bordered" accentColor={voiceColor}>
            <View style={styles.usageHeader}>
              <View style={styles.usageIconContainer}>
                <MaterialCommunityIcons
                  name="microphone"
                  size={24}
                  color={voiceColor}
                />
              </View>
              <View style={styles.usageInfo}>
                <Text style={styles.usageLabel}>Tobi requests</Text>
                <Text style={styles.usageValue}>
                  <Text style={{ color: voiceColor }}>{voice.usage}</Text>
                  <Text style={styles.usageDivider}> / </Text>
                  <Text>{isAdmin ? "Unlimited" : voice.limit}</Text>
                </Text>
              </View>
              {!isAdmin && (
                <View style={styles.percentageBadge}>
                  <Text style={[styles.percentageText, { color: voiceColor }]}>
                    {voice.percentage}%
                  </Text>
                </View>
              )}
            </View>

            {/* Progress Bar */}
            {!isAdmin && (
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, voice.percentage)}%`,
                        backgroundColor: voiceColor,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressMarkers}>
                  <View style={[styles.marker, voice.percentage >= 50 && styles.markerPassed]} />
                  <View style={[styles.marker, voice.percentage >= 80 && styles.markerPassed]} />
                </View>
              </View>
            )}

            {/* Status Message */}
            <Text style={styles.statusMessage}>
              {isAdmin 
                ? "Admin access: No usage limits applied."
                : voice.percentage >= 100
                  ? "Limit reached. Resets next month."
                  : voice.percentage >= 80
                    ? `${voice.limit - voice.usage} requests left. Almost there!`
                    : voice.percentage >= 50
                      ? `${voice.limit - voice.usage} requests remaining.`
                      : "Plenty of requests available."}
            </Text>
          </GlassCard>
        </View>

        {/* Receipt Scans (Earn Discount) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt Scans</Text>
          <GlassCard variant="standard">
            <View style={styles.receiptRow}>
              <View style={styles.receiptStat}>
                <MaterialCommunityIcons
                  name="camera"
                  size={20}
                  color={colors.accent.primary}
                />
                <View style={styles.receiptStatInfo}>
                  <Text style={styles.receiptStatValue}>{receipts.scansThisPeriod}</Text>
                  <Text style={styles.receiptStatLabel}>this month</Text>
                </View>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptStat}>
                <MaterialCommunityIcons
                  name="star"
                  size={20}
                  color={colors.accent.warm}
                />
                <View style={styles.receiptStatInfo}>
                  <Text style={styles.receiptStatValue}>{receipts.lifetimeScans}</Text>
                  <Text style={styles.receiptStatLabel}>lifetime</Text>
                </View>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptStat}>
                <MaterialCommunityIcons
                  name="cash"
                  size={20}
                  color={colors.semantic.success}
                />
                <View style={styles.receiptStatInfo}>
                  <Text style={[styles.receiptStatValue, { color: colors.semantic.success }]}>
                    £{receipts.creditsEarned.toFixed(2)}
                  </Text>
                  <Text style={styles.receiptStatLabel}>{isAdmin ? "earned" : "saved"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.receiptNote}>
              <MaterialCommunityIcons
                name="information-outline"
                size={14}
                color={colors.text.tertiary}
              />
              <Text style={styles.receiptNoteText}>
                {isAdmin 
                  ? "Scan receipts to earn cashback rewards. Maximum rewards enabled for Admin."
                  : "Scan receipts to earn credits off your subscription. Unlimited for Premium."}
              </Text>
            </View>
          </GlassCard>
        </View>

        {/* Tier Progress */}
        {scanCredits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scan Tier</Text>
            <GlassCard variant="standard">
              <View style={styles.tierRow}>
                <View style={styles.tierBadge}>
                  <MaterialCommunityIcons
                    name="shield-star"
                    size={28}
                    color={
                      scanCredits.tier === "platinum"
                        ? "#E5E4E2"
                        : scanCredits.tier === "gold"
                          ? "#FFD700"
                          : scanCredits.tier === "silver"
                            ? "#C0C0C0"
                            : "#CD7F32"
                    }
                  />
                </View>
                <View style={styles.tierInfo}>
                  <Text style={styles.tierName}>
                    {scanCredits.tier.charAt(0).toUpperCase() + scanCredits.tier.slice(1)} Tier
                  </Text>
                  <Text style={styles.tierSubtitle}>
                    £{scanCredits.tierInfo?.creditPerScan?.toFixed(2) ?? "0.25"} per scan
                  </Text>
                </View>
                {scanCredits.tierInfo?.scansToNextTier && scanCredits.tierInfo.scansToNextTier > 0 && (
                  <View style={styles.nextTierBadge}>
                    <Text style={styles.nextTierText}>
                      {scanCredits.tierInfo.scansToNextTier} to {scanCredits.tierInfo.nextTier}
                    </Text>
                  </View>
                )}
              </View>
            </GlassCard>
          </View>
        )}

        {/* AI Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <GlassCard variant="standard">
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <MaterialCommunityIcons
                  name="microphone"
                  size={20}
                  color={colors.text.secondary}
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Voice Assistant</Text>
                  <Text style={styles.settingDescription}>Enable Tobi voice commands</Text>
                </View>
              </View>
              <Switch
                value={settings.voiceEnabled}
                onValueChange={handleToggleVoice}
                trackColor={{ false: colors.glass.backgroundStrong, true: `${colors.accent.primary}80` }}
                thumbColor={settings.voiceEnabled ? colors.accent.primary : colors.text.tertiary}
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={20}
                  color={colors.text.secondary}
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Usage Alerts</Text>
                  <Text style={styles.settingDescription}>Notify at 50%, 80%, 100%</Text>
                </View>
              </View>
              <Switch
                value={settings.usageAlerts}
                onValueChange={handleToggleAlerts}
                trackColor={{ false: colors.glass.backgroundStrong, true: `${colors.accent.primary}80` }}
                thumbColor={settings.usageAlerts ? colors.accent.primary : colors.text.tertiary}
              />
            </View>
          </GlassCard>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bottomSpacer: {
    height: 100,
  },

  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  // Voice Usage
  usageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  usageIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  usageInfo: {
    flex: 1,
  },
  usageLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  usageValue: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  usageDivider: {
    color: colors.text.tertiary,
  },
  percentageBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.glass.background,
  },
  percentageText: {
    ...typography.labelMedium,
    fontWeight: "700",
  },

  // Progress Bar
  progressContainer: {
    marginTop: spacing.md,
    position: "relative",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.glass.backgroundStrong,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressMarkers: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: "20%",
  },
  marker: {
    width: 2,
    height: 6,
    backgroundColor: colors.glass.border,
  },
  markerPassed: {
    backgroundColor: "transparent",
  },

  // Status Message
  statusMessage: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    textAlign: "center",
  },

  // Receipt Stats
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  receiptStat: {
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  receiptStatInfo: {
    alignItems: "center",
  },
  receiptStatValue: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: "700",
  },
  receiptStatLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  receiptDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.glass.border,
  },
  receiptNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  receiptNoteText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    flex: 1,
  },

  // Tier
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  tierBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "600",
  },
  tierSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  nextTierBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: `${colors.accent.secondary}20`,
  },
  nextTierText: {
    ...typography.labelSmall,
    color: colors.accent.secondary,
  },

  // Settings
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  settingDescription: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.sm,
  },
});
