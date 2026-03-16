import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

interface FeatureUsage {
  usage: number;
  limit: number;
  percentage: number;
}

interface FeatureConfig {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const FEATURE_CONFIGS: FeatureConfig[] = [
  { key: "price_estimate", label: "Price Estimates", icon: "tag-outline" },
  { key: "list_suggestions", label: "Smart Suggestions", icon: "lightbulb-outline" },
  { key: "health_analysis", label: "Health Analysis", icon: "heart-pulse" },
  { key: "product_scan", label: "Product Scans", icon: "barcode-scan" },
  { key: "item_variants", label: "Item Variants", icon: "format-list-bulleted" },
  { key: "pantry_seed", label: "Pantry Seeding", icon: "seed-outline" },
  { key: "tts", label: "Text-to-Speech", icon: "volume-high" },
];

interface FeatureUsageCardProps {
  features: Record<string, FeatureUsage>;
  isAdmin: boolean;
}

function getBarColor(percentage: number) {
  if (percentage >= 100) return colors.semantic.danger;
  if (percentage >= 80) return colors.accent.warm;
  if (percentage >= 50) return colors.accent.secondary;
  return colors.accent.primary;
}

export function FeatureUsageCard({ features, isAdmin }: FeatureUsageCardProps) {
  // Filter to features that have actual caps (not 999999 / unlimited)
  const cappedFeatures = FEATURE_CONFIGS.filter((fc) => {
    const data = features[fc.key];
    return data && data.limit < 999999;
  });

  if (cappedFeatures.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AI Feature Limits</Text>
      <GlassCard variant="standard">
        {cappedFeatures.map((fc, idx) => {
          const data = features[fc.key];
          if (!data) return null;
          const barColor = getBarColor(data.percentage);
          const remaining = Math.max(0, data.limit - data.usage);

          return (
            <View key={fc.key}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.featureRow}>
                <MaterialCommunityIcons
                  name={fc.icon}
                  size={18}
                  color={barColor}
                />
                <View style={styles.featureInfo}>
                  <View style={styles.featureLabelRow}>
                    <Text style={styles.featureLabel}>{fc.label}</Text>
                    <Text style={styles.featureCount}>
                      {isAdmin ? (
                        <Text style={{ color: colors.text.tertiary }}>{data.usage} used</Text>
                      ) : (
                        <>
                          <Text style={{ color: barColor }}>{data.usage}</Text>
                          <Text style={{ color: colors.text.tertiary }}> / {data.limit}</Text>
                        </>
                      )}
                    </Text>
                  </View>
                  {!isAdmin && (
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.min(100, data.percentage)}%`,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* Summary footer */}
        {!isAdmin && (
          <View style={styles.footer}>
            <MaterialCommunityIcons
              name="information-outline"
              size={14}
              color={colors.text.tertiary}
            />
            <Text style={styles.footerText}>
              Limits reset monthly. Upgrade to Premium for higher caps.
            </Text>
          </View>
        )}
      </GlassCard>
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
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  featureInfo: {
    flex: 1,
  },
  featureLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  featureLabel: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: "500",
  },
  featureCount: {
    ...typography.labelSmall,
    color: colors.text.secondary,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glass.backgroundStrong,
    overflow: "hidden" as const,
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glass.border,
    marginVertical: spacing.xs,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    flex: 1,
  },
});
