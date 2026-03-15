import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  GlassCard,
  GlassProgressBar
} from "@/components/ui/glass";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FeatureSummary {
  requests: number;
  tokens: number;
  cost: number;
  vision: number;
  fallbacks: number;
}

interface PlatformUsageData {
  totalTokens: number;
  tokenQuota: number;
  totalRequests: number;
  requestQuota: number;
  dailyAverageTokens: number;
  weeklyAverageTokens: number;
  daysUntilRenewal: number;
  renewalDate: number;
  activeProvider: string;
  summary: Record<string, FeatureSummary>;
  totalCost?: number;
  totalVision?: number;
  totalFallbacks?: number;
  fallbackRate?: number;
  alert?: { level: string; message: string } | null;
}

interface TodayRequestData {
  todayRequests: number;
  geminiDailyLimit: number;
  usagePercent: number;
  todayVision: number;
  todayFallback: number;
  fallbackRate: number;
  todayCost: number;
  activeUsers: number;
  zone: string;
  timestamp: number;
}

interface DailyTrendPoint {
  date: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  visionRequests: number;
  fallbackRequests: number;
  uniqueUsers: number;
  fallbackRate: number;
}

interface Projection {
  label: string;
  users: number;
  monthlyCost: number;
}

interface CapacityData {
  dailyTrend: DailyTrendPoint[];
  featureBreakdown: Record<string, { requests: number; cost: number; tokens: number }>;
  averages: {
    requestsPerDay: number;
    costPerDay: number;
    usersPerDay: number;
    costPerUser: number;
  };
  growth: {
    requestGrowthRate: number;
    userGrowthRate: number;
  };
  projections: Projection[];
  scaling: {
    geminiDailyLimit: number;
    daysUntilLimit: number | null;
    recommendation: string;
    fallbackWarning: string | null;
  };
  lookbackDays: number;
  computedAt: number;
}

interface PlatformAIUsageMonitorProps {
  data: PlatformUsageData | undefined;
  todayData?: TodayRequestData | undefined;
  capacityData?: CapacityData | undefined;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCost(usd: number) {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const ZONE_COLORS = {
  green: colors.semantic.success,
  yellow: colors.semantic.warning,
  red: colors.semantic.danger,
};

const FEATURE_LABELS: Record<string, string> = {
  voice: "Voice (Tobi)",
  receipt_scan: "Receipt Scan",
  product_scan: "Product Scan",
  health_analysis: "Health Analysis",
  price_estimate: "Price Estimate",
  item_variants: "Item Variants",
  list_suggestions: "Suggestions",
  pantry_seed: "Pantry Seed",
  tts: "Text-to-Speech",
};

// ─── Component ──────────────────────────────────────────────────────────────

export const PlatformAIUsageMonitor = ({ data, todayData, capacityData }: PlatformAIUsageMonitorProps) => {
  if (!data) return null;

  const zoneColor = todayData ? ZONE_COLORS[todayData.zone as keyof typeof ZONE_COLORS] ?? colors.text.tertiary : colors.text.tertiary;

  return (
    <View style={styles.wrapper}>
      {/* ═══ Section A: Provider Quota Status (Real-time) ═══ */}
      <GlassCard variant="bordered" accentColor={zoneColor} style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <MaterialCommunityIcons name="molecule" size={22} color={colors.accent.primary} />
            <Text style={styles.title}>AI CAPACITY MONITOR</Text>
          </View>
          <View style={[styles.zoneBadge, { backgroundColor: `${zoneColor}20`, borderColor: `${zoneColor}40` }]}>
            <View style={[styles.zoneDot, { backgroundColor: zoneColor }]} />
            <Text style={[styles.zoneText, { color: zoneColor }]}>
              {todayData?.zone?.toUpperCase() ?? "N/A"}
            </Text>
          </View>
        </View>

        {/* Gemini RPD Meter */}
        {todayData && (
          <View style={styles.meterBlock}>
            <View style={styles.meterLabelRow}>
              <Text style={styles.meterLabel}>Gemini Requests Today</Text>
              <Text style={[styles.meterValue, { color: zoneColor }]}>
                {todayData.todayRequests.toLocaleString()} / {todayData.geminiDailyLimit.toLocaleString()}
              </Text>
            </View>
            <GlassProgressBar
              progress={todayData.todayRequests}
              max={todayData.geminiDailyLimit}
              size="lg"
              showGlow
              gradientColors={
                todayData.zone === "red" ? [colors.semantic.danger, "#FF4444"] as const :
                todayData.zone === "yellow" ? [colors.semantic.warning, "#FFAA00"] as const :
                [colors.semantic.success, colors.accent.primary] as const
              }
            />
            <View style={styles.meterSubRow}>
              <Text style={styles.meterSub}>{todayData.usagePercent}% of daily limit</Text>
              <Text style={styles.meterSub}>{todayData.activeUsers} active users</Text>
            </View>
          </View>
        )}

        {/* Provider breakdown row */}
        <View style={styles.quotaGrid}>
          <View style={styles.quotaBox}>
            <MaterialCommunityIcons name="google" size={16} color="#4285F4" />
            <Text style={styles.quotaLabel}>Gemini (Primary)</Text>
            <Text style={styles.quotaValue}>{data.totalRequests - (data.totalFallbacks ?? 0)} reqs</Text>
            <Text style={styles.quotaMeta}>15 RPM / 1,500 RPD</Text>
          </View>
          <View style={styles.quotaBox}>
            <MaterialCommunityIcons name="robot-outline" size={16} color="#10A37F" />
            <Text style={styles.quotaLabel}>OpenAI (Fallback)</Text>
            <Text style={styles.quotaValue}>{data.totalFallbacks ?? 0} reqs</Text>
            <Text style={styles.quotaMeta}>{data.fallbackRate ?? 0}% fallback rate</Text>
          </View>
          <View style={styles.quotaBox}>
            <MaterialCommunityIcons name="microsoft-azure" size={16} color="#0089D6" />
            <Text style={styles.quotaLabel}>Azure TTS</Text>
            <Text style={styles.quotaValue}>{data.summary.tts?.requests ?? 0} calls</Text>
            <Text style={styles.quotaMeta}>500K chars/mo free</Text>
          </View>
        </View>
      </GlassCard>

      {/* ═══ Section B: Cost Breakdown ═══ */}
      <GlassCard variant="bordered" style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="currency-usd" size={20} color={colors.accent.warm} />
          <Text style={styles.sectionTitle}>COST BREAKDOWN</Text>
          <Text style={styles.sectionMeta}>This Month</Text>
        </View>

        <Text style={styles.costDisclaimer}>Projected at paid-tier pricing (currently on free tier)</Text>

        <View style={styles.costSummaryRow}>
          <View style={styles.costHero}>
            <Text style={styles.costHeroValue}>{formatCost(data.totalCost ?? 0)}</Text>
            <Text style={styles.costHeroLabel}>Total Est. Cost</Text>
          </View>
          <View style={styles.costDivider} />
          <View style={styles.costHero}>
            <Text style={styles.costHeroValue}>
              {formatCost((data.totalCost ?? 0) / Math.max(data.daysUntilRenewal > 0 ? (30 - data.daysUntilRenewal) : 1, 1))}
            </Text>
            <Text style={styles.costHeroLabel}>Avg Per Day</Text>
          </View>
          <View style={styles.costDivider} />
          <View style={styles.costHero}>
            <Text style={styles.costHeroValue}>{data.totalRequests.toLocaleString()}</Text>
            <Text style={styles.costHeroLabel}>Total Requests</Text>
          </View>
        </View>

        {/* Feature cost bars */}
        <View style={styles.featureList}>
          {Object.entries(data.summary)
            .filter(([, v]) => v.requests > 0)
            .sort(([, a], [, b]) => b.requests - a.requests)
            .map(([feature, info]) => {
              const pct = data.totalRequests > 0 ? (info.requests / data.totalRequests) * 100 : 0;
              return (
                <View key={feature} style={styles.featureRow}>
                  <View style={styles.featureLabel}>
                    <Text style={styles.featureName}>{FEATURE_LABELS[feature] ?? feature}</Text>
                    <Text style={styles.featureCount}>{info.requests} reqs</Text>
                  </View>
                  <View style={styles.featureBarTrack}>
                    <View style={[styles.featureBarFill, { width: `${Math.min(pct, 100)}%` }]} />
                  </View>
                  <Text style={styles.featureCost}>{formatCost(info.cost)}</Text>
                </View>
              );
            })}
        </View>
      </GlassCard>

      {/* ═══ Section C: Growth Projections ═══ */}
      {capacityData && (
        <GlassCard variant="bordered" style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={20} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>GROWTH & PROJECTIONS</Text>
            <Text style={styles.sectionMeta}>{capacityData.lookbackDays}d</Text>
          </View>

          {/* Growth metrics */}
          <View style={styles.growthGrid}>
            <View style={styles.growthBox}>
              <Text style={styles.growthValue}>{capacityData.averages.requestsPerDay}</Text>
              <Text style={styles.growthLabel}>Avg RPD</Text>
            </View>
            <View style={styles.growthBox}>
              <Text style={[
                styles.growthValue,
                { color: capacityData.growth.requestGrowthRate > 0 ? colors.semantic.success : colors.text.primary }
              ]}>
                {capacityData.growth.requestGrowthRate > 0 ? "+" : ""}{capacityData.growth.requestGrowthRate}%
              </Text>
              <Text style={styles.growthLabel}>Request Growth</Text>
            </View>
            <View style={styles.growthBox}>
              <Text style={[
                styles.growthValue,
                { color: capacityData.growth.userGrowthRate > 0 ? colors.semantic.success : colors.text.primary }
              ]}>
                {capacityData.growth.userGrowthRate > 0 ? "+" : ""}{capacityData.growth.userGrowthRate}%
              </Text>
              <Text style={styles.growthLabel}>User Growth</Text>
            </View>
            <View style={styles.growthBox}>
              <Text style={styles.growthValue}>{formatCost(capacityData.averages.costPerUser)}</Text>
              <Text style={styles.growthLabel}>Cost/User</Text>
            </View>
          </View>

          {/* Daily trend sparkline (text-based) */}
          {capacityData.dailyTrend.length > 0 && (
            <View style={styles.trendBlock}>
              <Text style={styles.trendTitle}>Daily Requests (last {capacityData.dailyTrend.length} days)</Text>
              <View style={styles.trendChart}>
                {capacityData.dailyTrend.slice(-14).map((day, i) => {
                  const maxReqs = Math.max(...capacityData.dailyTrend.slice(-14).map(d => d.requests), 1);
                  const barHeight = Math.max((day.requests / maxReqs) * 40, 2);
                  const barColor = day.requests > 1400 ? colors.semantic.danger :
                    day.requests > 1000 ? colors.semantic.warning : colors.accent.primary;
                  return (
                    <View key={day.date} style={styles.trendBarWrapper}>
                      <View style={[styles.trendBar, { height: barHeight, backgroundColor: barColor }]} />
                      {i % 3 === 0 && (
                        <Text style={styles.trendBarLabel}>{day.date.slice(5)}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
              {/* Threshold lines legend */}
              <View style={styles.thresholdLegend}>
                <View style={styles.thresholdItem}>
                  <View style={[styles.thresholdDot, { backgroundColor: colors.accent.primary }]} />
                  <Text style={styles.thresholdText}>&lt;1,000 Safe</Text>
                </View>
                <View style={styles.thresholdItem}>
                  <View style={[styles.thresholdDot, { backgroundColor: colors.semantic.warning }]} />
                  <Text style={styles.thresholdText}>1,000-1,400 Caution</Text>
                </View>
                <View style={styles.thresholdItem}>
                  <View style={[styles.thresholdDot, { backgroundColor: colors.semantic.danger }]} />
                  <Text style={styles.thresholdText}>&gt;1,400 Critical</Text>
                </View>
              </View>
            </View>
          )}

          {/* Scale projections table */}
          {capacityData.projections.length > 0 && (
            <View style={styles.projectionsBlock}>
              <Text style={styles.trendTitle}>Cost Projections at Scale</Text>
              {capacityData.projections.map((p) => (
                <View key={p.label} style={styles.projectionRow}>
                  <Text style={styles.projectionLabel}>{p.label}</Text>
                  <Text style={styles.projectionUsers}>{formatNumber(p.users)} users</Text>
                  <Text style={styles.projectionCost}>{formatCost(p.monthlyCost)}/mo</Text>
                </View>
              ))}
            </View>
          )}
        </GlassCard>
      )}

      {/* ═══ Section D: Scaling Recommendations ═══ */}
      {capacityData && (
        <GlassCard variant="bordered" style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={colors.semantic.warning} />
            <Text style={styles.sectionTitle}>SCALING GUIDANCE</Text>
          </View>

          {/* Days until limit */}
          {capacityData.scaling.daysUntilLimit !== null && (
            <View style={[styles.alertBox, {
              backgroundColor: capacityData.scaling.daysUntilLimit < 30 ? `${colors.semantic.danger}15` : `${colors.semantic.warning}15`,
              borderColor: capacityData.scaling.daysUntilLimit < 30 ? colors.semantic.danger : colors.semantic.warning,
            }]}>
              <MaterialCommunityIcons
                name="clock-alert-outline"
                size={20}
                color={capacityData.scaling.daysUntilLimit < 30 ? colors.semantic.danger : colors.semantic.warning}
              />
              <Text style={[styles.alertText, {
                color: capacityData.scaling.daysUntilLimit < 30 ? colors.semantic.danger : colors.semantic.warning,
              }]}>
                Gemini free tier limit in ~{capacityData.scaling.daysUntilLimit} days
              </Text>
            </View>
          )}

          {/* Recommendation */}
          <View style={styles.recBox}>
            <Text style={styles.recText}>{capacityData.scaling.recommendation}</Text>
          </View>

          {/* Fallback warning */}
          {capacityData.scaling.fallbackWarning && (
            <View style={[styles.alertBox, { backgroundColor: `${colors.semantic.warning}15`, borderColor: colors.semantic.warning }]}>
              <MaterialCommunityIcons name="swap-horizontal" size={18} color={colors.semantic.warning} />
              <Text style={[styles.alertText, { color: colors.semantic.warning }]}>
                {capacityData.scaling.fallbackWarning}
              </Text>
            </View>
          )}

          {/* Decision matrix summary */}
          <View style={styles.matrixBlock}>
            <Text style={styles.matrixTitle}>When to Upgrade</Text>
            <View style={styles.matrixRow}>
              <Text style={styles.matrixSignal}>Daily Gemini RPD &gt; 1,000</Text>
              <Text style={styles.matrixAction}>Plan Vertex AI migration</Text>
            </View>
            <View style={styles.matrixRow}>
              <Text style={styles.matrixSignal}>Fallback rate &gt; 5%</Text>
              <Text style={styles.matrixAction}>Gemini throttling - upgrade RPM</Text>
            </View>
            <View style={styles.matrixRow}>
              <Text style={styles.matrixSignal}>OpenAI spend &gt; $10/mo</Text>
              <Text style={styles.matrixAction}>Review fallback efficiency</Text>
            </View>
            <View style={styles.matrixRow}>
              <Text style={styles.matrixSignal}>Cost/user &gt; $0.05/mo</Text>
              <Text style={styles.matrixAction}>Optimize AI call patterns</Text>
            </View>
          </View>
        </GlassCard>
      )}

      {/* ═══ Legacy Alert ═══ */}
      {data.alert && (
        <View style={[styles.alertBox, {
          backgroundColor: data.alert.level === "critical" ? `${colors.semantic.danger}15` : `${colors.semantic.warning}15`,
          borderColor: data.alert.level === "critical" ? colors.semantic.danger : colors.semantic.warning,
        }]}>
          <MaterialCommunityIcons
            name={data.alert.level === "critical" ? "alert-octagon" : "alert-circle"}
            size={18}
            color={data.alert.level === "critical" ? colors.semantic.danger : colors.semantic.warning}
          />
          <Text style={[styles.alertText, {
            color: data.alert.level === "critical" ? colors.semantic.danger : colors.semantic.warning,
          }]}>
            {data.alert.message}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontWeight: "800",
    letterSpacing: 1,
  },
  zoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneText: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  // Meter
  meterBlock: {
    marginBottom: spacing.lg,
  },
  meterLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.sm,
  },
  meterLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "700",
  },
  meterValue: {
    ...typography.headlineSmall,
    fontWeight: "800",
  },
  meterSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  meterSub: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  // Quota grid
  quotaGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quotaBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: "center",
    gap: 3,
  },
  quotaLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    textAlign: "center",
    fontWeight: "600",
  },
  quotaValue: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: "800",
  },
  quotaMeta: {
    fontSize: 8,
    color: colors.text.disabled,
    textAlign: "center",
  },
  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    fontWeight: "800",
    letterSpacing: 1,
    flex: 1,
  },
  sectionMeta: {
    ...typography.labelSmall,
    color: colors.text.disabled,
    fontSize: 10,
  },
  // Cost summary
  costSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  costHero: {
    flex: 1,
    alignItems: "center",
  },
  costHeroValue: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: "800",
  },
  costHeroLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    marginTop: 2,
  },
  costDisclaimer: {
    fontSize: 9,
    color: colors.text.disabled,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
  costDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.glass.border,
  },
  // Feature list
  featureList: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureLabel: {
    width: 100,
  },
  featureName: {
    fontSize: 10,
    color: colors.text.primary,
    fontWeight: "600",
  },
  featureCount: {
    fontSize: 8,
    color: colors.text.disabled,
  },
  featureBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  featureBarFill: {
    height: "100%",
    backgroundColor: colors.accent.primary,
    borderRadius: 3,
  },
  featureCost: {
    width: 55,
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: "700",
    textAlign: "right",
  },
  // Growth grid
  growthGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  growthBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: "center",
  },
  growthValue: {
    ...typography.labelMedium,
    color: colors.text.primary,
    fontWeight: "800",
  },
  growthLabel: {
    fontSize: 8,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    marginTop: 2,
    textAlign: "center",
  },
  // Trend chart
  trendBlock: {
    marginBottom: spacing.md,
  },
  trendTitle: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  trendChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 52,
    paddingBottom: 12,
  },
  trendBarWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  trendBar: {
    width: "80%",
    borderRadius: 2,
    minHeight: 2,
  },
  trendBarLabel: {
    fontSize: 7,
    color: colors.text.disabled,
    position: "absolute",
    bottom: -10,
  },
  thresholdLegend: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  thresholdItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  thresholdDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  thresholdText: {
    fontSize: 8,
    color: colors.text.disabled,
  },
  // Projections
  projectionsBlock: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  projectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  projectionLabel: {
    flex: 1,
    fontSize: 11,
    color: colors.text.primary,
    fontWeight: "700",
  },
  projectionUsers: {
    width: 80,
    fontSize: 10,
    color: colors.text.tertiary,
    textAlign: "center",
  },
  projectionCost: {
    width: 70,
    fontSize: 11,
    color: colors.accent.primary,
    fontWeight: "800",
    textAlign: "right",
  },
  // Recommendation
  recBox: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
  },
  recText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  // Decision matrix
  matrixBlock: {
    marginTop: spacing.sm,
  },
  matrixTitle: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  matrixRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  matrixSignal: {
    flex: 1,
    fontSize: 10,
    color: colors.text.primary,
    fontWeight: "600",
  },
  matrixAction: {
    flex: 1,
    fontSize: 10,
    color: colors.text.tertiary,
  },
  // Alerts
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  alertText: {
    ...typography.bodySmall,
    flex: 1,
    fontWeight: "700",
  },
});
