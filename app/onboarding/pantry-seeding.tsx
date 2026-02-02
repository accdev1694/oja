import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { SeedItem } from "@/convex/ai";
import { safeHaptics } from "@/lib/utils/safeHaptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export default function PantrySeedingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ country?: string; cuisines?: string }>();

  const generateItems = useAction(api.ai.generateHybridSeedItems);

  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seedItems, setSeedItems] = useState<SeedItem[]>([]);

  // Spinning animation for loading
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    generateSeedItems();
  }, []);

  async function generateSeedItems() {
    setIsGenerating(true);
    setError(null);

    try {
      const country = params.country || "United Kingdom";
      const cuisines = params.cuisines ? params.cuisines.split(",") : ["british"];

      const items = await generateItems({ country, cuisines });

      setSeedItems(items);
      safeHaptics.success();

      setTimeout(() => {
        router.push({
          pathname: "/onboarding/review-items",
          params: { items: JSON.stringify(items) },
        });
      }, 1000);
    } catch (err) {
      console.error("Failed to generate items:", err);
      setError("Failed to generate your pantry. Please try again.");
      safeHaptics.error();
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSkip() {
    safeHaptics.light();
    router.replace("/(app)/(tabs)");
  }

  // Loading state
  if (isGenerating) {
    return (
      <GlassScreen>
        <View style={styles.container}>
          <View style={styles.loadingSection}>
            {/* Animated Icon */}
            <View style={styles.iconWrapper}>
              <Animated.View style={[styles.spinnerIcon, spinStyle]}>
                <MaterialCommunityIcons
                  name="refresh"
                  size={32}
                  color={colors.accent.primary}
                />
              </Animated.View>
              <View style={styles.cartIcon}>
                <MaterialCommunityIcons
                  name="cart"
                  size={48}
                  color={colors.accent.primary}
                />
              </View>
            </View>

            <Text style={styles.loadingTitle}>Creating your pantry...</Text>
            <Text style={styles.loadingSubtitle}>
              Generating personalized items based on your location and cuisine preferences
            </Text>

            {/* Progress indicators */}
            <GlassCard variant="standard" style={styles.progressCard}>
              <ProgressItem
                icon="map-marker"
                label="Location detected"
                status="complete"
              />
              <ProgressItem
                icon="silverware-fork-knife"
                label="Cuisines analyzed"
                status="complete"
              />
              <ProgressItem
                icon="basket"
                label="Generating items"
                status="loading"
              />
            </GlassCard>
          </View>
        </View>
      </GlassScreen>
    );
  }

  // Error state
  if (error) {
    return (
      <GlassScreen>
        <View style={styles.container}>
          <View style={styles.errorSection}>
            <View style={styles.errorIconContainer}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={64}
                color={colors.semantic.danger}
              />
            </View>

            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorMessage}>{error}</Text>

            <View style={styles.errorActions}>
              <GlassButton
                variant="primary"
                size="lg"
                icon="refresh"
                onPress={generateSeedItems}
              >
                Try Again
              </GlassButton>

              <GlassButton
                variant="ghost"
                size="lg"
                onPress={handleSkip}
              >
                Skip & Start Empty
              </GlassButton>
            </View>
          </View>
        </View>
      </GlassScreen>
    );
  }

  // Success state (shown briefly before navigation)
  return (
    <GlassScreen>
      <View style={styles.container}>
        <View style={styles.successSection}>
          <View style={styles.successIconContainer}>
            <MaterialCommunityIcons
              name="check-circle"
              size={80}
              color={colors.accent.primary}
            />
          </View>

          <Text style={styles.successTitle}>Pantry Ready!</Text>
          <Text style={styles.successSubtitle}>
            {seedItems.length} items generated and ready for review
          </Text>
        </View>
      </View>
    </GlassScreen>
  );
}

// =============================================================================
// PROGRESS ITEM COMPONENT
// =============================================================================

interface ProgressItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  status: "pending" | "loading" | "complete";
}

function ProgressItem({ icon, label, status }: ProgressItemProps) {
  return (
    <View style={styles.progressItem}>
      <View
        style={[
          styles.progressIcon,
          status === "complete" && styles.progressIconComplete,
          status === "loading" && styles.progressIconLoading,
        ]}
      >
        {status === "complete" ? (
          <MaterialCommunityIcons
            name="check"
            size={16}
            color={colors.text.primary}
          />
        ) : status === "loading" ? (
          <ActivityIndicator size="small" color={colors.accent.primary} />
        ) : (
          <MaterialCommunityIcons
            name={icon}
            size={16}
            color={colors.text.tertiary}
          />
        )}
      </View>
      <Text
        style={[
          styles.progressLabel,
          status === "complete" && styles.progressLabelComplete,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },

  // Loading State
  loadingSection: {
    alignItems: "center",
    width: "100%",
  },
  iconWrapper: {
    position: "relative",
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  cartIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.accent.primary}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  spinnerIcon: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  loadingTitle: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  loadingSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  progressCard: {
    width: "100%",
    gap: spacing.md,
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glass.backgroundStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  progressIconComplete: {
    backgroundColor: colors.accent.primary,
  },
  progressIconLoading: {
    backgroundColor: `${colors.accent.primary}30`,
  },
  progressLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  progressLabelComplete: {
    color: colors.text.primary,
  },

  // Error State
  errorSection: {
    alignItems: "center",
    width: "100%",
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.semantic.danger}20`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.displaySmall,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  errorActions: {
    width: "100%",
    gap: spacing.sm,
  },

  // Success State
  successSection: {
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.displaySmall,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
  },
});
