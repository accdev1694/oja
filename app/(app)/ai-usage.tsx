import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
import { VoiceUsageCard } from "@/components/ai-usage/VoiceUsageCard";
import { ReceiptScansCard } from "@/components/ai-usage/ReceiptScansCard";

/**
 * AI Usage Screen
 * Shows voice usage, receipt scan stats, and AI settings
 */
export default function AIUsageScreen() {
  const router = useRouter();
  const { user: convexUser } = useCurrentUser();
  const usageSummary = useQuery(api.aiUsage.getUsageSummary);
  const pointsBalance = useQuery(api.points.getPointsBalance);
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
        <VoiceUsageCard voice={voice} isAdmin={isAdmin} />

        {/* Receipt Scans */}
        <ReceiptScansCard receipts={receipts} isAdmin={isAdmin} />

        {/* Tier Progress */}
        {pointsBalance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scan Tier</Text>
            <GlassCard variant="standard">
              <View style={styles.tierRow}>
                <View style={styles.tierBadge}>
                  <MaterialCommunityIcons
                    name="shield-star"
                    size={28}
                    color={
                      pointsBalance.tier === "platinum"
                        ? "#E5E4E2"
                        : pointsBalance.tier === "gold"
                          ? "#FFD700"
                          : pointsBalance.tier === "silver"
                            ? "#C0C0C0"
                            : "#CD7F32"
                    }
                  />
                </View>
                <View style={styles.tierInfo}>
                  <Text style={styles.tierName}>
                    {pointsBalance.tier.charAt(0).toUpperCase() + pointsBalance.tier.slice(1)} Tier
                  </Text>
                  <Text style={styles.tierSubtitle}>
                    Earn up to {pointsBalance.monthlyEarningCap} pts/mo
                  </Text>
                </View>
                {pointsBalance.nextTierInfo?.scansToNextTier && pointsBalance.nextTierInfo.scansToNextTier > 0 && (
                  <View style={styles.nextTierBadge}>
                    <Text style={styles.nextTierText}>
                      {pointsBalance.nextTierInfo.scansToNextTier} to {pointsBalance.nextTierInfo.nextTier}
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
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
