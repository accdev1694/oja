import { View, Text, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/onboarding/cuisine-selection");
  };

  return (
    <GlassScreen>
      <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.content}>
          {/* Logo */}
          <Image
            source={require("@/assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Welcome Text */}
          <Text style={styles.title}>Welcome to Oja!</Text>
          <Text style={styles.subtitle}>
            AI-powered shopping that learns what you love and helps you spend smarter.
          </Text>

          {/* Feature Cards */}
          <View style={styles.features}>
            <FeatureCard
              icon="brain"
              title="Learns You"
              description="AI-powered suggestions based on your favourite foods and habits"
            />
            <FeatureCard
              icon="barcode-scan"
              title="Scan It"
              description="Snap a product or receipt and we handle the rest"
            />
            <FeatureCard
              icon="microphone-outline"
              title="Voice Lists"
              description="Create shopping lists by just speaking naturally"
            />
            <FeatureCard
              icon="chart-timeline-variant-shimmer"
              title="Personal Insights"
              description="Spending trends, savings tips, and weekly digests"
            />
          </View>
        </View>

        {/* Bottom Button */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <GlassButton
            variant="primary"
            size="lg"
            icon="arrow-right"
            onPress={handleContinue}
          >
            Get Started
          </GlassButton>
        </View>
      </View>
    </GlassScreen>
  );
}

// =============================================================================
// FEATURE CARD COMPONENT
// =============================================================================

interface FeatureCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <GlassCard variant="standard" style={styles.featureCard}>
      <View style={styles.featureRow}>
        <View style={styles.featureIconContainer}>
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={colors.accent.primary}
          />
        </View>
        <View style={styles.featureText}>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDescription}>{description}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 160,
    height: 112,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.displayMedium,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    lineHeight: 26,
  },
  features: {
    width: "100%",
    gap: spacing.sm,
  },
  featureCard: {
    width: "100%",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.accent.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "600",
    marginBottom: 2,
  },
  featureDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  footer: {
    paddingTop: spacing.lg,
  },
});
