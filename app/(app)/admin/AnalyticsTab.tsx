import React from "react";
import {
  View,
  Text,
  ScrollView,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  GlassButton,
  AnimatedSection,
  colors,
  spacing,
  useGlassAlert,
  SkeletonCard,
} from "@/components/ui/glass";
import { adminStyles as styles } from "./styles";
import { 
  CohortMetric, 
  FunnelStep, 
  ChurnMetric, 
  LTVMetric, 
  UserSegment 
} from "./types";
import { RetentionCell } from "./components/RetentionCell";

interface AnalyticsTabProps {
  hasPermission: (p: string) => boolean;
  handleExportCSV: (type: "users" | "receipts" | "prices" | "analytics") => Promise<void>;
}

export function AnalyticsTab({ 
  hasPermission,
  handleExportCSV
}: AnalyticsTabProps) {
  const cohortMetrics = useQuery(api.admin.getCohortMetrics) as CohortMetric[] | undefined;
  const funnelAnalytics = useQuery(api.admin.getFunnelAnalytics) as FunnelStep[] | undefined;
  const churnMetrics = useQuery(api.admin.getChurnMetrics) as ChurnMetric[] | undefined;
  const ltvMetrics = useQuery(api.admin.getLTVMetrics) as LTVMetric[] | undefined;
  const segmentSummary = useQuery(api.admin.getUserSegmentSummary) as UserSegment[] | undefined;
  
  const { alert: showAlert } = useGlassAlert();

  const loading = !cohortMetrics || !funnelAnalytics || !churnMetrics || !ltvMetrics || !segmentSummary;

  if (loading) {
    return (
      <View style={styles.loading}>
        <SkeletonCard />
        <SkeletonCard style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Funnel Analytics */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={0}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="filter-variant" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Conversion Funnel</Text>
          </View>
          <View style={styles.funnelContainer}>
            {funnelAnalytics.map((step, idx) => (
              <View key={step.step} style={styles.funnelStep}>
                <View style={styles.funnelBarContainer}>
                  <View 
                    style={[
                      styles.funnelBar, 
                      { width: `${step.percentage}%`, backgroundColor: `rgba(0, 212, 170, ${0.4 + (1 - idx/funnelAnalytics.length) * 0.6})` }
                    ]} 
                  />
                  <Text style={styles.funnelCount}>{step.count}</Text>
                </View>
                <View style={styles.funnelLabelRow}>
                  <Text style={styles.funnelLabel}>{step.step.replace(/_/g, " ").toUpperCase()}</Text>
                  <Text style={styles.funnelPercentage}>{step.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </View>
          <GlassButton 
            onPress={() => handleExportCSV("analytics")} 
            variant="ghost" 
            size="sm" 
            icon="download"
            style={{ marginTop: spacing.md }}
          >Export Funnel Data</GlassButton>
        </GlassCard>
      </AnimatedSection>

      {/* User Segments */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={100}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-group" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>User Segments</Text>
          </View>
          <View style={styles.segmentGrid}>
            {segmentSummary.map((seg) => (
              <View key={seg.name} style={styles.segmentCard}>
                <Text style={styles.segmentValue}>{seg.count}</Text>
                <Text style={styles.segmentName}>{seg.name.replace(/_/g, " ")}</Text>
                <Text style={styles.segmentPercent}>{seg.percentage.toFixed(1)}%</Text>
              </View>
            ))}
          </View>
          <GlassButton 
            onPress={() => handleExportCSV("analytics")} 
            variant="ghost" 
            size="sm" 
            icon="download"
            style={{ marginTop: spacing.md }}
          >Export Segment Data</GlassButton>
        </GlassCard>
      </AnimatedSection>

      {/* Cohort Retention */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={200}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.accent.primary} />
            <Text style={styles.sectionTitle}>Cohort Retention (%)</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.retentionTable}>
              <View style={styles.retentionHeader}>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell, { width: 80 }]}>Cohort</Text>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell]}>Users</Text>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell]}>D7</Text>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell]}>D14</Text>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell]}>D30</Text>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell]}>D60</Text>
                <Text style={[styles.retentionCell, styles.retentionHeaderCell]}>D90</Text>
              </View>
              {cohortMetrics.map((row) => (
                <View key={row.cohortMonth} style={styles.retentionRow}>
                  <Text style={[styles.retentionCell, { width: 80, fontWeight: "600" }]}>{row.cohortMonth}</Text>
                  <Text style={styles.retentionCell}>{row.totalUsers}</Text>
                  <RetentionCell value={row.retentionDay7} />
                  <RetentionCell value={row.retentionDay14} />
                  <RetentionCell value={row.retentionDay30} />
                  <RetentionCell value={row.retentionDay60} />
                  <RetentionCell value={row.retentionDay90} />
                </View>
              ))}
            </View>
          </ScrollView>
          <GlassButton 
            onPress={() => handleExportCSV("analytics")} 
            variant="ghost" 
            size="sm" 
            icon="download"
            style={{ marginTop: spacing.md }}
          >Export Retention Table</GlassButton>
        </GlassCard>
      </AnimatedSection>

      {/* LTV Metrics */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={300}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="trending-up" size={24} color={colors.semantic.success} />
            <Text style={styles.sectionTitle}>Lifetime Value (LTV)</Text>
          </View>
          {ltvMetrics.map((ltv) => (
            <View key={ltv.cohortMonth} style={styles.ltvRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{ltv.cohortMonth} Cohort</Text>
                <Text style={styles.userEmail}>
                  {ltv.paidUsers} paid ({ltv.conversionRate.toFixed(1)}% conv.)
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.ltvValue}>£{ltv.avgLTV.toFixed(2)}</Text>
                <Text style={styles.ltvLabel}>Avg LTV</Text>
              </View>
            </View>
          ))}
          <View style={styles.gmvRow}>
            <Text style={styles.gmvLabel}>Total Cohort Revenue</Text>
            <Text style={styles.gmvValue}>£{ltvMetrics.reduce((s, l) => s + l.totalRevenue, 0).toLocaleString()}</Text>
          </View>
          <GlassButton 
            onPress={() => handleExportCSV("analytics")} 
            variant="ghost" 
            size="sm" 
            icon="download"
            style={{ marginTop: spacing.md }}
          >Export LTV Data</GlassButton>
        </GlassCard>
      </AnimatedSection>

      {/* Churn Analytics */}
      <AnimatedSection animation="fadeInDown" duration={400} delay={400}>
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-minus" size={24} color={colors.semantic.danger} />
            <Text style={styles.sectionTitle}>Churn Analytics</Text>
          </View>
          {churnMetrics.map((m) => (
            <View key={m.month} style={styles.churnRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{m.month}</Text>
                <Text style={styles.userEmail}>
                  {m.churnedUsers} churned • {m.atRiskCount} at risk
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.ltvValue, { color: colors.semantic.danger }]}>{m.churnRate.toFixed(1)}%</Text>
                <Text style={styles.ltvLabel}>Churn Rate</Text>
              </View>
            </View>
          ))}
          <GlassButton 
            onPress={() => handleExportCSV("analytics")} 
            variant="ghost" 
            size="sm" 
            icon="download"
            style={{ marginTop: spacing.md }}
          >Export Churn Data</GlassButton>
        </GlassCard>
      </AnimatedSection>

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}
