import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  GlassButton,
  AnimatedSection,
  colors,
  spacing,
  GlassDateRangePicker,
  type DateRange,
} from "@/components/ui/glass";
import { adminStyles as styles } from "./styles";
import { 
  AnalyticsData, 
  RevenueReport, 
  FinancialData, 
  HealthData, 
  AuditLog 
} from "./types";
import { MetricCard } from "./components/MetricCard";
import { useGmvMetrics, useResponsive } from "./hooks";

interface OverviewTabProps {
  /** Permission check function */
  hasPermission: (p: string) => boolean;
}

/**
 * OverviewTab Component
 * Displays high-level system health, analytics, and financial summaries.
 */
export function OverviewTab({ hasPermission }: OverviewTabProps) {
  const { isMobile } = useResponsive();
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshKey, setRefreshKey] = useState(Date.now().toString());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [gmvFilter, setGmvFilter] = useState<"week" | "month" | "year" | "lifetime">("lifetime");

  const canViewLogs = hasPermission("view_audit_logs");

  // Memoize query arguments to prevent unnecessary hook re-runs
  const queryArgs = useMemo(() => ({ 
    refreshKey, 
    dateFrom: dateRange.startDate || undefined, 
    dateTo: dateRange.endDate || undefined 
  }), [refreshKey, dateRange.startDate, dateRange.endDate]);

  const analytics = useQuery(api.admin.getAnalytics, queryArgs) as AnalyticsData | undefined | null;
  const revenue = useQuery(api.admin.getRevenueReport, queryArgs) as RevenueReport | undefined | null;
  const financial = useQuery(api.admin.getFinancialReport, queryArgs) as FinancialData | undefined | null;
  const health = useQuery(api.admin.getSystemHealth, { refreshKey }) as HealthData | undefined | null;
  
  const { results: auditLogs, status: auditStatus, loadMore: loadMoreLogs } = usePaginatedQuery(
    api.admin.getAuditLogs, 
    canViewLogs ? { 
      refreshKey,
      dateFrom: dateRange.startDate || undefined,
      dateTo: dateRange.endDate || undefined
    } : "skip",
    { initialNumItems: 10 }
  );

  // Use specialized hook for memoized GMV calculation
  const displayedGmv = useGmvMetrics(analytics, gmvFilter);

  // Performance: Memoize date picker handlers
  const handleDateChange = useCallback((range: DateRange) => {
    setDateRange(range);
    Haptics.selectionAsync();
  }, []);

  const handleClearDates = useCallback(() => {
    setDateRange({ startDate: null, endDate: null });
    Haptics.selectionAsync();
  }, []);

  const handleGmvFilterChange = useCallback((f: typeof gmvFilter) => {
    setGmvFilter(f);
    Haptics.selectionAsync();
  }, []);

  const handleLoadMoreLogs = useCallback(() => {
    loadMoreLogs(20);
    Haptics.selectionAsync();
  }, [loadMoreLogs]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (autoRefreshEnabled) {
      interval = setInterval(() => {
        setRefreshKey(Date.now().toString());
        setLastUpdated(new Date());
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefreshEnabled]);

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Date Range Picker */}
      <GlassDateRangePicker 
        value={dateRange} 
        onChange={handleDateChange} 
        onClear={handleClearDates}
      />

      {/* Auto-Refresh Toggle */}
      <GlassCard style={[styles.section, styles.refreshCard]}>
        <View style={styles.refreshHeader}>
          <View>
            <Text style={styles.sectionTitle}>Dashboard Status</Text>
            <Text style={styles.lastUpdatedText}>
              {analytics?.computedAt
                ? `Metrics as of: ${new Date(analytics.computedAt).toLocaleString()}${analytics.isPrecomputed ? ' (cached)' : ' (live)'}`
                : `Last refreshed: ${lastUpdated.toLocaleTimeString()}`
              }
            </Text>
          </View>
          <View style={styles.refreshToggle}>
            <Text style={styles.toggleLabel}>Auto-refresh</Text>
            <Switch
              value={autoRefreshEnabled}
              onValueChange={setAutoRefreshEnabled}
              trackColor={{ false: colors.glass.border, true: `${colors.accent.primary}60` }}
              thumbColor={autoRefreshEnabled ? colors.accent.primary : colors.text.tertiary}
            />
          </View>
        </View>
      </GlassCard>

      {/* System Health */}
      {health && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
          <GlassCard style={styles.section}>
            <View style={styles.healthHeader}>
              <View style={[styles.healthDot, { backgroundColor: health.status === "healthy" ? colors.semantic.success : colors.semantic.warning }]} />
              <Text style={styles.sectionTitle}>System: {health.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.metricText}>
              Receipt success rate: {health.receiptProcessing?.successRate ?? 0}%
            </Text>
            <Text style={styles.metricText}>
              Failed: {health.receiptProcessing?.failed ?? 0} | Processing: {health.receiptProcessing?.processing ?? 0}
            </Text>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Analytics */}
      {analytics && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="chart-box" size={24} color={colors.accent.primary} />
              <Text style={styles.sectionTitle}>Analytics</Text>
            </View>
            <View style={styles.metricsGrid}>
              <MetricCard label="Total Users" value={analytics.totalUsers ?? 0} icon="account-group" style={isMobile ? styles.mobileMetricCard : undefined} />
              <MetricCard label="New (Week)" value={analytics.newUsersThisWeek ?? 0} icon="account-plus" trend={12} style={isMobile ? styles.mobileMetricCard : undefined} />
              <MetricCard label="Active (Week)" value={analytics.activeUsersThisWeek ?? 0} icon="account-check" trend={5} style={isMobile ? styles.mobileMetricCard : undefined} />
              <MetricCard label="Total Lists" value={analytics.totalLists ?? 0} icon="clipboard-list" style={isMobile ? styles.mobileMetricCard : undefined} />
              <MetricCard label="Completed" value={analytics.completedLists ?? 0} icon="check-circle" trend={-2} style={isMobile ? styles.mobileMetricCard : undefined} />
              <MetricCard label="Receipts" value={analytics.totalReceipts ?? 0} icon="receipt" trend={8} style={isMobile ? styles.mobileMetricCard : undefined} />
            </View>

            {/* GMV Section with Filters */}
            <View style={styles.gmvSection}>
              <View style={styles.gmvFilterRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gmvLabel}>Gross Volume</Text>
                  <Text style={styles.gmvValueLarge}>
                    £{(displayedGmv ?? 0).toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.gmvPicker}>
                  {(["week", "month", "year", "lifetime"] as const).map((f) => (
                    <Pressable
                      key={f}
                      onPress={() => handleGmvFilterChange(f)}
                      style={[styles.gmvPickerBtn, gmvFilter === f && styles.gridItemActive]}
                    >
                      <Text style={[styles.gmvPickerText, gmvFilter === f && styles.gridLabelActive]}>
                        {f === "lifetime" ? "All" : f === "week" ? "Wk" : f === "month" ? "Mth" : "Yr"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Revenue */}
      {revenue && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={200}>
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.semantic.success} />
              <Text style={styles.sectionTitle}>Revenue</Text>
            </View>
            <View style={[styles.revenueGrid, isMobile && styles.mobileRevenueGrid]}>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueValueLarge}>£{(revenue.mrr ?? 0).toFixed(2)}</Text>
                <Text style={styles.revenueLabel}>MRR (Monthly)</Text>
              </View>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueValueLarge}>£{(revenue.arr ?? 0).toFixed(2)}</Text>
                <Text style={styles.revenueLabel}>ARR (Annual)</Text>
              </View>
            </View>
            <Text style={styles.metricText}>
              {revenue.monthlySubscribers ?? 0} monthly • {revenue.annualSubscribers ?? 0} annual • {revenue.trialsActive ?? 0} trials
            </Text>
            {financial && (
              <View style={[styles.revenueGrid, isMobile && styles.mobileRevenueGrid, { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.glass.border, paddingTop: spacing.md }]}>
                <View style={styles.revenueItem}>
                  <Text style={[styles.revenueValue, { color: colors.accent.primary }]}>£{financial.netRevenue.toFixed(2)}</Text>
                  <Text style={styles.revenueLabel}>Est. Net (MRR)</Text>
                </View>
                <View style={styles.revenueItem}>
                  <Text style={[styles.revenueValue, { color: colors.text.secondary }]}>{financial.margin.toFixed(0)}%</Text>
                  <Text style={styles.revenueLabel}>Margin</Text>
                </View>
              </View>
            )}
            {financial && (
              <Text style={[styles.metricText, { fontSize: 10 }]}>
                Estimated tax (VAT 20%): £{financial.estimatedTax.toFixed(2)} • COGS: £{financial.estimatedCOGS.toFixed(2)}
              </Text>
            )}
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Audit Logs */}
      {canViewLogs && Array.isArray(auditLogs) && auditLogs.length > 0 && (
        <AnimatedSection animation="fadeInDown" duration={400} delay={300}>
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Audit Logs</Text>
            {(auditLogs as AuditLog[]).map((log) => (
              <View key={log._id} style={styles.logRow}>
                <Text style={styles.logAction}>{log.action}</Text>
                <Text style={styles.logDetails}>{log.details || log.targetType}</Text>
                <Text style={styles.logTime}>
                  {new Date(log.createdAt).toLocaleDateString()} by {log.adminName}
                </Text>
              </View>
            ))}
            {auditStatus === "CanLoadMore" && (
              <GlassButton 
                onPress={handleLoadMoreLogs} 
                variant="ghost" 
                size="sm" 
                style={{ marginTop: spacing.sm }}
              >Load More Logs</GlassButton>
            )}
            {auditStatus === "LoadingMore" && (
              <ActivityIndicator color={colors.accent.primary} style={{ marginTop: spacing.sm }} />
            )}
          </GlassCard>
        </AnimatedSection>
      )}

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}
