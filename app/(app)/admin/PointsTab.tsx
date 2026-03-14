import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  GlassCard,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

interface PointsTabProps {
  hasPermission: (p: string) => boolean;
}

export function PointsTab({ hasPermission }: PointsTabProps) {
  const econ = useQuery(api.admin.getPointsEconomics);

  if (econ === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (econ === null) return null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Points Economy</Text>
        <Text style={styles.lastUpdated}>
          Last updated: {new Date(econ.updatedAt).toLocaleTimeString()}
        </Text>
      </View>

      {/* Main Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricsRow}>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.label}>Outstanding Balance</Text>
            <Text style={styles.value}>{econ.totalPointsOutstanding.toLocaleString()}</Text>
            <Text style={styles.subtext}>pts across {econ.userCount} users</Text>
          </GlassCard>
          
          <GlassCard style={styles.metricCard}>
            <Text style={styles.label}>Total Liability</Text>
            <Text style={[styles.value, { color: colors.semantic.warning }]}>
              £{econ.liabilityGBP.toFixed(2)}
            </Text>
            <Text style={styles.subtext}>at 1,000pts = £1.00</Text>
          </GlassCard>
        </View>

        <View style={styles.metricsRow}>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.label}>Earned (30d)</Text>
            <Text style={[styles.value, { color: colors.semantic.success }]}>
              +{econ.pointsEarned30d.toLocaleString()}
            </Text>
            <Text style={styles.subtext}>New points issued</Text>
          </GlassCard>
          
          <GlassCard style={styles.metricCard}>
            <Text style={styles.label}>Redeemed (30d)</Text>
            <Text style={[styles.value, { color: colors.accent.secondary }]}>
              -{econ.pointsRedeemed30d.toLocaleString()}
            </Text>
            <Text style={styles.subtext}>Points used for credit</Text>
          </GlassCard>
        </View>
      </View>

      {/* Distribution Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Earning Sources (30d)</Text>
      </View>
      
      <GlassCard style={styles.distributionCard}>
        {Object.entries(econ.earnDistribution).length === 0 ? (
          <Text style={styles.emptyText}>No transactions in the last 30 days</Text>
        ) : (
          (Object.entries(econ.earnDistribution) as [string, number][])
            .sort((a, b) => b[1] - a[1])
            .map(([source, amount]) => (
              <View key={source} style={styles.distributionRow}>
                <View style={styles.sourceInfo}>
                  <Text style={styles.sourceName}>{source.replace(/_/g, " ")}</Text>
                  <Text style={styles.sourceAmount}>{amount.toLocaleString()} pts</Text>
                </View>
                <View style={styles.barTrack}>
                  <View 
                    style={[
                      styles.barFill, 
                      { width: `${Math.min(100, (amount / econ.pointsEarned30d) * 100)}%` }
                    ]} 
                  />
                </View>
              </View>
            ))
        )}
      </GlassCard>

      {/* Audit Note */}
      <GlassCard variant="standard" style={styles.infoBox}>
        <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
          <MaterialCommunityIcons name="shield-check-outline" size={24} color={colors.accent.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Financial Integrity</Text>
            <Text style={styles.infoText}>
              Points are reconciled daily with Stripe invoices. Outstanding liability is tracked as potential future discounts.
            </Text>
          </View>
        </View>
      </GlassCard>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { marginBottom: spacing.lg },
  title: { ...typography.headlineSmall, color: colors.text.primary, fontWeight: "700" },
  lastUpdated: { ...typography.bodySmall, color: colors.text.tertiary, marginTop: 4 },
  
  metricsGrid: { gap: spacing.md, marginBottom: spacing.md },
  metricsRow: { flexDirection: "row", gap: spacing.md },
  metricCard: { flex: 1, padding: spacing.md },
  
  label: { ...typography.labelSmall, color: colors.text.tertiary, textTransform: "uppercase" },
  value: { ...typography.headlineSmall, color: colors.accent.primary, marginVertical: 4, fontWeight: "700" },
  subtext: { ...typography.bodySmall, color: colors.text.tertiary },
  
  sectionHeader: { marginTop: spacing.md, marginBottom: spacing.md },
  sectionTitle: { ...typography.labelLarge, color: colors.text.primary, fontWeight: "600" },
  
  distributionCard: { padding: spacing.md },
  distributionRow: { marginBottom: spacing.md },
  sourceInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  sourceName: { ...typography.bodyMedium, color: colors.text.primary, textTransform: "capitalize" },
  sourceAmount: { ...typography.bodySmall, color: colors.text.secondary },
  barTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.accent.primary, borderRadius: 3 },
  emptyText: { ...typography.bodyMedium, color: colors.text.tertiary, textAlign: "center", padding: spacing.md },
  
  infoBox: { marginTop: spacing.lg, padding: spacing.md },
  infoTitle: { ...typography.bodyMedium, color: colors.text.primary, fontWeight: "600" },
  infoText: { ...typography.bodySmall, color: colors.text.secondary },
});
