import { useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isGenericName, isValidName } from "@/lib/names";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  GlassInput,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: convexUser } = useCurrentUser();
  const myAdminPerms = useQuery(api.admin.getMyPermissions, {});
  const updateUser = useMutation(api.users.update);

  const isAdmin = !!convexUser?.isAdmin || !!myAdminPerms;

  // Pre-fill with existing name if it's a real one, otherwise empty
  const existingName = convexUser?.name && !isGenericName(convexUser.name) ? convexUser.name : "";
  const [nameInput, setNameInput] = useState(existingName);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save the name if the user typed a valid one
    const trimmed = nameInput.trim();
    if (isValidName(trimmed) && trimmed !== convexUser?.name) {
      setSaving(true);
      try {
        await updateUser({ name: trimmed });
      } catch {
        // Non-blocking — continue onboarding even if save fails
      } finally {
        setSaving(false);
      }
    }

    if (isAdmin) {
      router.push("/onboarding/admin-setup");
    } else {
      router.push("/onboarding/cuisine-selection");
    }
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

          {/* Name Input */}
          <View style={styles.nameInputWrap}>
            <Text style={styles.nameLabel}>What should we call you?</Text>
            <GlassInput
              placeholder="First name"
              value={nameInput}
              onChangeText={setNameInput}
              autoCapitalize="words"
              autoComplete="given-name"
              iconLeft="account-outline"
            />
          </View>

          {/* Feature Cards */}
          <View style={styles.features}>
            <FeatureCard
              icon="brain"
              title="Learns You"
              description="AI-powered suggestions based on your favourite foods and habits"
            />
            <FeatureCard
              icon="cube-scan"
              title="Scan & Earn"
              description="Snap products or receipts to earn points. 1,000 points = £1.00 off your next bill"
            />
            <FeatureCard
              icon="microphone-outline"
              title="Voice Lists"
              description="Create shopping lists by just speaking naturally"
            />
            <FeatureCard
              icon="star-shooting"
              title="Rewards & Tiers"
              description="Level up from Bronze to Platinum to earn points even faster"
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
            loading={saving}
            disabled={saving}
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
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    lineHeight: 26,
  },
  nameInputWrap: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  nameLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textAlign: "center",
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
