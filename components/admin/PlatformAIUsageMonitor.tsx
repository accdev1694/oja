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

interface PlatformAIUsageMonitorProps {
  data: {
    totalTokens: number;
    tokenQuota: number;
    totalRequests: number;
    requestQuota: number;
    dailyAverageTokens: number;
    weeklyAverageTokens: number;
    daysUntilRenewal: number;
    renewalDate: number;
    activeProvider: string;
    summary: Record<string, { requests: number; tokens: number }>;
    alert?: { level: string; message: string } | null;
  } | undefined;
}

export const PlatformAIUsageMonitor = ({ data }: PlatformAIUsageMonitorProps) => {
  if (!data) return null;

  return (
    <GlassCard variant="bordered" accentColor={colors.accent.primary} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="molecule" size={24} color={colors.accent.primary} />
          <Text style={styles.title}>PLATFORM AI INFRASTRUCTURE</Text>
        </View>
        <View style={styles.providerBadge}>
          <Text style={styles.providerText}>{data.activeProvider}</Text>
        </View>
      </View>

      <View style={styles.usageSection}>
        <View style={styles.usageLabelRow}>
          <Text style={styles.usageLabel}>Token Consumption</Text>
          <Text style={styles.usageValue}>
            {data.totalTokens.toLocaleString()} / {data.tokenQuota.toLocaleString()}
          </Text>
        </View>
        
        <GlassProgressBar 
          progress={data.totalTokens} 
          max={data.tokenQuota}
          size="lg"
          showGlow
        />
        
        <View style={styles.indicesRow}>
          <View style={styles.indexItem}>
            <Text style={styles.indexLabel}>Daily Avg</Text>
            <Text style={styles.indexValue}>{data.dailyAverageTokens.toLocaleString()}</Text>
          </View>
          <View style={styles.indexDivider} />
          <View style={styles.indexItem}>
            <Text style={styles.indexLabel}>Weekly Avg</Text>
            <Text style={styles.indexValue}>{data.weeklyAverageTokens.toLocaleString()}</Text>
          </View>
          <View style={styles.indexDivider} />
          <View style={styles.indexItem}>
            <Text style={styles.indexLabel}>Renewal In</Text>
            <Text style={styles.indexValue}>{data.daysUntilRenewal} Days</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Requests</Text>
          <Text style={styles.statValue}>{data.totalRequests.toLocaleString()}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Voice Traffic</Text>
          <Text style={styles.statValue}>{data.summary.voice.requests.toLocaleString()}</Text>
        </View>
      </View>

      {data.alert && (
        <View style={[
          styles.alertBox, 
          { 
            backgroundColor: data.alert.level === "critical" ? `${colors.semantic.danger}15` : `${colors.semantic.warning}15`,
            borderColor: data.alert.level === "critical" ? colors.semantic.danger : colors.semantic.warning 
          }
        ]}>
          <MaterialCommunityIcons 
            name={data.alert.level === "critical" ? "alert-octagon" : "alert-circle"} 
            size={18} 
            color={data.alert.level === "critical" ? colors.semantic.danger : colors.semantic.warning} 
          />
          <Text style={[
            styles.alertText, 
            { color: data.alert.level === "critical" ? colors.semantic.danger : colors.semantic.warning }
          ]}>
            {data.alert.message}
          </Text>
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
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
  providerBadge: {
    backgroundColor: `${colors.accent.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${colors.accent.primary}40`,
  },
  providerText: {
    ...typography.labelSmall,
    color: colors.accent.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  usageSection: {
    marginBottom: spacing.lg,
  },
  usageLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.sm,
  },
  usageLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "700",
  },
  usageValue: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
  },
  indicesRow: {
    flexDirection: "row",
    marginTop: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  indexItem: {
    flex: 1,
    alignItems: "center",
  },
  indexLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  indexValue: {
    ...typography.labelSmall,
    color: colors.text.primary,
    fontWeight: "700",
  },
  indexDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.glass.border,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  statLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  statValue: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: "800",
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  alertText: {
    ...typography.bodySmall,
    flex: 1,
    fontWeight: "700",
  },
});
