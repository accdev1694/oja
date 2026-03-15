import { View, Text, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  GlassCard,
  GlassButton,
  GlassSegmentedControl,
  AnimatedSection,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { PlatformAIUsageMonitor } from "@/components/admin/PlatformAIUsageMonitor";

export function AdminControlCenter({
  adminAnalytics,
  systemHealth,
  platformAIUsage,
  gmvFilter,
  setGmvFilter,
  router,
}: {
  adminAnalytics: {
    totalUsers?: number;
    newUsersThisWeek?: number;
    newUsersThisMonth?: number;
    activeUsersThisWeek?: number;
    totalLists?: number;
    completedLists?: number;
    totalReceipts?: number;
    receiptsThisWeek?: number;
    receiptsThisMonth?: number;
    totalGMV?: number;
    gmvThisWeek?: number;
    gmvThisMonth?: number;
    gmvThisYear?: number;
    computedAt?: number;
    isPrecomputed?: boolean;
  } | undefined;
  systemHealth: {
    status: "healthy" | "degraded" | "down";
    receiptProcessing: {
      total: number;
      failed: number;
      processing: number;
      successRate: number;
    };
    alertCount: number;
    timestamp: number;
  } | undefined;
  platformAIUsage: {
    summary: Record<string, { requests: number; tokens: number; cost: number; vision: number; fallbacks: number }>;
    totalRequests: number;
    totalTokens: number;
    tokenQuota: number;
    requestQuota: number;
    dailyAverageTokens: number;
    weeklyAverageTokens: number;
    daysUntilRenewal: number;
    renewalDate: number;
    activeProvider: string;
    totalCost: number;
    totalVision: number;
    totalFallbacks: number;
    fallbackRate: number;
    alert: { level: "info" | "warning" | "critical"; message: string } | null;
    computedAt: number;
  } | undefined;
  gmvFilter: "week" | "month" | "year" | "lifetime";
  setGmvFilter: (filter: "week" | "month" | "year" | "lifetime") => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
      {/* 1. Platform Vitals (GMV + Health + AI) */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Global Platform Overview (Admin)</Text>
          <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.adminHeroCard}>
            <View style={styles.gmvRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminLabel}>Global GMV</Text>
                <Text style={styles.gmvValueHero}>
                  £{((gmvFilter === "week" ? adminAnalytics?.gmvThisWeek :
                     gmvFilter === "month" ? adminAnalytics?.gmvThisMonth :
                     gmvFilter === "year" ? adminAnalytics?.gmvThisYear :
                     adminAnalytics?.totalGMV) ?? 0).toLocaleString()}
                </Text>
              </View>
              <GlassSegmentedControl
                tabs={[
                  { label: "Wk" },
                  { label: "Mth" },
                  { label: "Yr" },
                  { label: "All" },
                ]}
                activeIndex={
                  gmvFilter === "week" ? 0 :
                  gmvFilter === "month" ? 1 :
                  gmvFilter === "year" ? 2 : 3
                }
                onTabChange={(index) => {
                  const periods = ["week", "month", "year", "lifetime"] as const;
                  setGmvFilter(periods[index]);
                }}
                style={{ width: 160 }}
                activeColor={colors.semantic.success}
              />
            </View>

            <View style={styles.healthDivider} />

            <View style={styles.healthRow}>
              <View style={styles.healthInfo}>
                <View style={[styles.healthDot, { backgroundColor: systemHealth?.status === "healthy" ? colors.semantic.success : colors.semantic.warning }]} />
                <Text style={styles.healthText}>
                  System: {systemHealth?.status?.toUpperCase() || "LOADING..."}
                </Text>
              </View>
              <Text style={styles.healthSubtext}>
                {platformAIUsage?.activeProvider || "Gemini 2.0"}
              </Text>
            </View>

            <View style={styles.healthDivider} />

            <PlatformAIUsageMonitor data={platformAIUsage} />

            {platformAIUsage?.alert && (
              <View style={[styles.adminAlertBox, { backgroundColor: platformAIUsage.alert.level === "critical" ? `${colors.semantic.danger}15` : `${colors.semantic.warning}15`, borderColor: platformAIUsage.alert.level === "critical" ? colors.semantic.danger : colors.semantic.warning }]}>
                <MaterialCommunityIcons
                  name={platformAIUsage.alert.level === "critical" ? "alert-octagon" : "alert-circle"}
                  size={16}
                  color={platformAIUsage.alert.level === "critical" ? colors.semantic.danger : colors.semantic.warning}
                />
                <Text style={[styles.adminAlertText, { color: platformAIUsage.alert.level === "critical" ? colors.semantic.danger : colors.semantic.warning }]}>
                  {platformAIUsage.alert.message}
                </Text>
              </View>
            )}
          </GlassCard>
        </View>
      </AnimatedSection>

      {/* 2. Primary Launchpad */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Launchpad</Text>
          <GlassButton
            variant="primary"
            size="lg"
            icon="shield-crown"
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.push("/(app)/admin"); }}
            style={styles.mainAdminBtn}
          >
            Enter Admin Dashboard
          </GlassButton>

          <View style={styles.quickActionRow}>
            <Pressable
              onPress={() => router.push("/(app)/admin?tab=users")}
              style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.7 }]}
            >
              <MaterialCommunityIcons name="account-search" size={24} color={colors.accent.primary} />
              <Text style={styles.quickActionText}>Search Users</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(app)/admin?tab=receipts")}
              style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.7 }]}
            >
              <MaterialCommunityIcons name="receipt" size={24} color={colors.accent.primary} />
              <Text style={styles.quickActionText}>Review Data</Text>
            </Pressable>
          </View>
        </View>
      </AnimatedSection>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  adminHeroCard: {
    padding: spacing.md,
  },
  gmvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gmvValueHero: {
    ...typography.displaySmall,
    color: colors.semantic.success,
    fontWeight: "800",
    fontSize: 28,
  },
  adminLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  healthDivider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.md,
  },
  healthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  healthInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthText: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: "700",
  },
  healthSubtext: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  mainAdminBtn: {
    marginBottom: spacing.md,
  },
  adminAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  adminAlertText: {
    ...typography.labelSmall,
    flex: 1,
    fontWeight: "700",
  },
  quickActionRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.glass.border}20`,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  quickActionText: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: "700",
  },
});
