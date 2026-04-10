/**
 * PointsTab — points economy dashboard for admins.
 *
 * Canary for the AdminTabShell migration (M5). Previously this file shipped
 * with its own local StyleSheet that diverged from the rest of the admin
 * tabs (different padding, different section headers, different empty
 * state). Now it uses the shared `AdminTabShell` wrapper + `adminStyles`
 * tokens so it matches OverviewTab's rhythm exactly.
 *
 * Props:
 *   - hasPermission: kept for interface consistency with other tabs, even
 *     though PointsTab is permission-gated at the tab-bar level (the tab
 *     only renders if the user passes the `view_analytics` check).
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

import { adminStyles } from "./styles";
import { AdminTabShell } from "./components/AdminTabShell";

interface PointsTabProps {
  hasPermission: (p: string) => boolean;
}

export function PointsTab(_: PointsTabProps) {
  const econ = useQuery(api.admin.getPointsEconomics);

  if (econ === null) {
    return (
      <AdminTabShell
        empty
        emptyMessage="Points economy data unavailable."
        emptyIcon="chart-line-variant"
      />
    );
  }

  return (
    <AdminTabShell loading={econ === undefined}>
      {econ && (
        <>
          <View style={localStyles.header}>
            <Text style={localStyles.title}>Points Economy</Text>
            <Text style={localStyles.lastUpdated}>
              Last updated: {new Date(econ.updatedAt).toLocaleTimeString()}
            </Text>
          </View>

          {/* Main Metrics */}
          <View style={localStyles.metricsGrid}>
            <View style={localStyles.metricsRow}>
              <GlassCard style={localStyles.metricCard}>
                <Text style={localStyles.label}>Outstanding Balance</Text>
                <Text style={localStyles.value}>
                  {econ.totalPointsOutstanding.toLocaleString()}
                </Text>
                <Text style={localStyles.subtext}>
                  pts across {econ.userCount} users
                </Text>
              </GlassCard>

              <GlassCard style={localStyles.metricCard}>
                <Text style={localStyles.label}>Total Liability</Text>
                <Text
                  style={[
                    localStyles.value,
                    { color: colors.semantic.warning },
                  ]}
                >
                  £{econ.liabilityGBP.toFixed(2)}
                </Text>
                <Text style={localStyles.subtext}>at 1,000pts = £1.00</Text>
              </GlassCard>
            </View>

            <View style={localStyles.metricsRow}>
              <GlassCard style={localStyles.metricCard}>
                <Text style={localStyles.label}>Earned (30d)</Text>
                <Text
                  style={[
                    localStyles.value,
                    { color: colors.semantic.success },
                  ]}
                >
                  +{econ.pointsEarned30d.toLocaleString()}
                </Text>
                <Text style={localStyles.subtext}>New points issued</Text>
              </GlassCard>

              <GlassCard style={localStyles.metricCard}>
                <Text style={localStyles.label}>Redeemed (30d)</Text>
                <Text
                  style={[
                    localStyles.value,
                    { color: colors.accent.secondary },
                  ]}
                >
                  -{econ.pointsRedeemed30d.toLocaleString()}
                </Text>
                <Text style={localStyles.subtext}>Points used for credit</Text>
              </GlassCard>
            </View>
          </View>

          <AdminTabShell.Section
            title="Earning Sources (30d)"
            icon="chart-donut"
          >
            {Object.entries(econ.earnDistribution).length === 0 ? (
              <Text style={adminStyles.emptyText}>
                No transactions in the last 30 days
              </Text>
            ) : (
              (Object.entries(econ.earnDistribution) as [string, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([source, amount]) => (
                  <View key={source} style={localStyles.distributionRow}>
                    <View style={localStyles.sourceInfo}>
                      <Text style={localStyles.sourceName}>
                        {source.replace(/_/g, " ")}
                      </Text>
                      <Text style={localStyles.sourceAmount}>
                        {amount.toLocaleString()} pts
                      </Text>
                    </View>
                    <View style={localStyles.barTrack}>
                      <View
                        style={[
                          localStyles.barFill,
                          {
                            width: `${
                              econ.pointsEarned30d > 0
                                ? Math.min(
                                    100,
                                    (amount / econ.pointsEarned30d) * 100
                                  )
                                : 0
                            }%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))
            )}
          </AdminTabShell.Section>

          <GlassCard variant="standard" style={adminStyles.section}>
            <View
              style={{
                flexDirection: "row",
                gap: spacing.md,
                alignItems: "center",
              }}
            >
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={24}
                color={colors.accent.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={localStyles.infoTitle}>Financial Integrity</Text>
                <Text style={localStyles.infoText}>
                  Points are reconciled daily with Stripe invoices.
                  Outstanding liability is tracked as potential future
                  discounts.
                </Text>
              </View>
            </View>
          </GlassCard>
        </>
      )}
    </AdminTabShell>
  );
}

// Only styles that express POINTS-SPECIFIC visual meaning live here: the
// metric grid layout, the distribution bar, and the info-box colors. Scroll
// container, empty states, and section headers are provided by
// AdminTabShell + adminStyles — so this file no longer owns them.
const localStyles = StyleSheet.create({
  header: { marginBottom: spacing.lg },
  title: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: "700",
  },
  lastUpdated: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 4,
  },

  metricsGrid: { gap: spacing.md, marginBottom: spacing.md },
  metricsRow: { flexDirection: "row", gap: spacing.md },
  metricCard: { flex: 1, padding: spacing.md },

  label: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: "uppercase",
  },
  value: {
    ...typography.headlineSmall,
    color: colors.accent.primary,
    marginVertical: 4,
    fontWeight: "700",
  },
  subtext: { ...typography.bodySmall, color: colors.text.tertiary },

  distributionRow: { marginBottom: spacing.md },
  sourceInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sourceName: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    textTransform: "capitalize",
  },
  sourceAmount: { ...typography.bodySmall, color: colors.text.secondary },
  barTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: colors.accent.primary,
    borderRadius: 3,
  },

  infoTitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
  },
  infoText: { ...typography.bodySmall, color: colors.text.secondary },
});
