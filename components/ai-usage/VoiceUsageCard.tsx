import { View, Text, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

/**
 * Voice Assistant usage card with progress bar and status message.
 * Shows Tobi request count, percentage, and limit status.
 */
export function VoiceUsageCard({ voice, isAdmin }: any) {
  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return colors.semantic.danger;
    if (percentage >= 80) return colors.accent.warm;
    if (percentage >= 50) return colors.accent.secondary;
    return colors.accent.primary;
  };

  const voiceColor = getStatusColor(voice.percentage);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Voice Assistant</Text>
      <GlassCard variant="bordered" accentColor={voiceColor}>
        <View style={styles.usageHeader}>
          <View style={styles.usageIconContainer}>
            <MaterialCommunityIcons
              name="microphone"
              size={24}
              color={voiceColor}
            />
          </View>
          <View style={styles.usageInfo}>
            <Text style={styles.usageLabel}>Tobi requests</Text>
            <Text style={styles.usageValue}>
              <Text style={{ color: voiceColor }}>{voice.usage}</Text>
              <Text style={styles.usageDivider}> / </Text>
              <Text>{isAdmin ? "Unlimited" : voice.limit}</Text>
            </Text>
          </View>
          {!isAdmin && (
            <View style={styles.percentageBadge}>
              <Text style={[styles.percentageText, { color: voiceColor }]}>
                {voice.percentage}%
              </Text>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {!isAdmin && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, voice.percentage)}%`,
                    backgroundColor: voiceColor,
                  },
                ]}
              />
            </View>
            <View style={styles.progressMarkers}>
              <View style={[styles.marker, voice.percentage >= 50 && styles.markerPassed]} />
              <View style={[styles.marker, voice.percentage >= 80 && styles.markerPassed]} />
            </View>
          </View>
        )}

        {/* Status Message */}
        <Text style={styles.statusMessage}>
          {isAdmin
            ? "Admin access: No usage limits applied."
            : voice.percentage >= 100
              ? "Limit reached. Resets next month."
              : voice.percentage >= 80
                ? `${voice.limit - voice.usage} requests left. Almost there!`
                : voice.percentage >= 50
                  ? `${voice.limit - voice.usage} requests remaining.`
                  : "Plenty of requests available."}
        </Text>
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
  usageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  usageIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  usageInfo: {
    flex: 1,
  },
  usageLabel: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  usageValue: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  usageDivider: {
    color: colors.text.tertiary,
  },
  percentageBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.glass.background,
  },
  percentageText: {
    ...typography.labelMedium,
    fontWeight: "700",
  },
  progressContainer: {
    marginTop: spacing.md,
    position: "relative",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.glass.backgroundStrong,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressMarkers: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingHorizontal: "20%",
  },
  marker: {
    width: 2,
    height: 6,
    backgroundColor: colors.glass.border,
  },
  markerPassed: {
    backgroundColor: "transparent",
  },
  statusMessage: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
