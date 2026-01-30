import { View, Text, StyleSheet, ScrollView, Alert, Platform, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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

export default function AdminScreen() {
  const router = useRouter();
  const analytics = useQuery(api.admin.getAnalytics);
  const revenue = useQuery(api.admin.getRevenueReport);
  const health = useQuery(api.admin.getSystemHealth);
  const users = useQuery(api.admin.getUsers, { limit: 20 });
  const recentReceipts = useQuery(api.admin.getRecentReceipts, { limit: 10 });
  const auditLogs = useQuery(api.admin.getAuditLogs, { limit: 20 });
  const toggleAdmin = useMutation(api.admin.toggleAdmin);
  const deleteReceipt = useMutation(api.admin.deleteReceipt);

  const loading = analytics === undefined;

  if (analytics === null) {
    return (
      <GlassScreen>
        <GlassHeader title="Admin" showBack onBack={() => router.back()} />
        <View style={styles.accessDenied}>
          <MaterialCommunityIcons name="shield-lock-outline" size={64} color={colors.semantic.danger} />
          <Text style={styles.accessTitle}>Access Denied</Text>
          <Text style={styles.accessSubtext}>Admin privileges required</Text>
        </View>
      </GlassScreen>
    );
  }

  if (loading) {
    return (
      <GlassScreen>
        <GlassHeader title="Admin Dashboard" showBack onBack={() => router.back()} />
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
      <GlassHeader title="Admin Dashboard" subtitle="Platform overview" showBack onBack={() => router.back()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* System Health */}
        {health && (
          <GlassCard style={styles.section}>
            <View style={styles.healthHeader}>
              <View style={[styles.healthDot, { backgroundColor: health.status === "healthy" ? colors.semantic.success : colors.semantic.warning }]} />
              <Text style={styles.sectionTitle}>System: {health.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.metricText}>
              Receipt success rate: {health.receiptProcessing.successRate}%
            </Text>
            <Text style={styles.metricText}>
              Failed: {health.receiptProcessing.failed} | Processing: {health.receiptProcessing.processing}
            </Text>
          </GlassCard>
        )}

        {/* Analytics Overview */}
        {analytics && (
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="chart-box" size={24} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Analytics</Text>
            </View>
            <View style={styles.metricsGrid}>
              <MetricCard label="Total Users" value={analytics.totalUsers} icon="account-group" />
              <MetricCard label="New (Week)" value={analytics.newUsersThisWeek} icon="account-plus" />
              <MetricCard label="Active (Week)" value={analytics.activeUsersThisWeek} icon="account-check" />
              <MetricCard label="Total Lists" value={analytics.totalLists} icon="clipboard-list" />
              <MetricCard label="Completed" value={analytics.completedLists} icon="check-circle" />
              <MetricCard label="Receipts" value={analytics.totalReceipts} icon="receipt" />
            </View>
            <View style={styles.gmvRow}>
              <Text style={styles.gmvLabel}>Total GMV</Text>
              <Text style={styles.gmvValue}>£{analytics.totalGMV.toLocaleString()}</Text>
            </View>
          </GlassCard>
        )}

        {/* Revenue */}
        {revenue && (
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.semantic.success} />
              <Text style={styles.sectionTitle}>Revenue</Text>
            </View>
            <View style={styles.revenueGrid}>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueValue}>£{revenue.mrr.toFixed(2)}</Text>
                <Text style={styles.revenueLabel}>MRR</Text>
              </View>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueValue}>£{revenue.arr.toFixed(2)}</Text>
                <Text style={styles.revenueLabel}>ARR</Text>
              </View>
            </View>
            <Text style={styles.metricText}>
              {revenue.monthlySubscribers} monthly • {revenue.annualSubscribers} annual • {revenue.trialsActive} trials
            </Text>
          </GlassCard>
        )}

        {/* Users */}
        {users && users.length > 0 && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Users</Text>
            {users.slice(0, 10).map((u: any) => (
              <View key={u._id} style={styles.userRow}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>{u.email || "No email"}</Text>
                </View>
                <View style={styles.userActions}>
                  {u.isAdmin && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </GlassCard>
        )}

        {/* Audit Logs */}
        {auditLogs && auditLogs.length > 0 && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Audit Log</Text>
            {auditLogs.map((log: any) => (
              <View key={log._id} style={styles.logRow}>
                <Text style={styles.logAction}>{log.action}</Text>
                <Text style={styles.logDetails}>{log.details || log.targetType}</Text>
                <Text style={styles.logTime}>
                  {new Date(log.createdAt).toLocaleDateString()} by {log.adminName}
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

function MetricCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon as any} size={20} color={colors.accent.primary} />
      <Text style={styles.metricValue}>{value.toLocaleString()}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  accessDenied: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  accessTitle: { ...typography.headlineMedium, color: colors.semantic.danger },
  accessSubtext: { ...typography.bodyMedium, color: colors.text.tertiary },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  section: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { ...typography.headlineSmall, color: colors.text.primary, marginBottom: spacing.sm },
  healthHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  healthDot: { width: 12, height: 12, borderRadius: 6 },
  metricText: { ...typography.bodyMedium, color: colors.text.tertiary, marginTop: 4 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  metricCard: {
    width: "30%",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 4,
  },
  metricValue: { ...typography.headlineSmall, color: colors.text.primary },
  metricLabel: { ...typography.bodySmall, color: colors.text.tertiary, textAlign: "center", fontSize: 10 },
  gmvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.glass.border },
  gmvLabel: { ...typography.bodyLarge, color: colors.text.secondary },
  gmvValue: { ...typography.headlineMedium, color: colors.semantic.success },
  revenueGrid: { flexDirection: "row", gap: spacing.lg, marginBottom: spacing.sm },
  revenueItem: { alignItems: "center" },
  revenueValue: { ...typography.headlineMedium, color: colors.semantic.success },
  revenueLabel: { ...typography.bodySmall, color: colors.text.tertiary },
  userRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  userInfo: { flex: 1 },
  userName: { ...typography.bodyMedium, color: colors.text.primary, fontWeight: "600" },
  userEmail: { ...typography.bodySmall, color: colors.text.tertiary },
  userActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  adminBadge: { backgroundColor: `${colors.accent.primary}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  adminBadgeText: { ...typography.labelSmall, color: colors.accent.primary },
  logRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.glass.border },
  logAction: { ...typography.bodyMedium, color: colors.text.primary, fontWeight: "600" },
  logDetails: { ...typography.bodySmall, color: colors.text.secondary },
  logTime: { ...typography.bodySmall, color: colors.text.tertiary, marginTop: 2 },
});
