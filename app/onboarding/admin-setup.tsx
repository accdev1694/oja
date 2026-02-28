import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  AnimatedSection,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Admin Setup Screen
 * Specialized onboarding for users with admin privileges.
 * Bypasses regular consumer onboarding (cuisine, pantry, stores).
 */
export default function AdminSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: convexUser } = useCurrentUser();
  const myAdminPerms = useQuery(api.admin.getMyPermissions, {});
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const isAdmin = !!convexUser?.isAdmin || !!myAdminPerms;
  const isSuperAdmin = myAdminPerms?.role === "super_admin";

  const handleLaunchDashboard = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Mark onboarding as complete in the background so they don't see it again
    try {
      await completeOnboarding();
    } catch (e) {
      console.warn("Failed to mark admin onboarding complete:", e);
    }

    // Redirect to Admin Dashboard
    router.replace("/(app)/admin" as any);
  };

  const handleLaunchApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Mark onboarding as complete
    try {
      await completeOnboarding();
    } catch (e) {
      console.warn("Failed to mark admin onboarding complete:", e);
    }

    // Redirect to Main App (Pantry)
    router.replace("/(app)/(tabs)/" as any);
  };

  // If somehow a non-admin gets here, send them back to regular onboarding
  useEffect(() => {
    if (convexUser !== undefined && !isAdmin) {
      router.replace("/onboarding/cuisine-selection");
    }
  }, [convexUser, isAdmin]);

  if (!convexUser || !myAdminPerms) {
    return (
      <GlassScreen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Verifying Admin Credentials...</Text>
        </View>
      </GlassScreen>
    );
  }

  return (
    <GlassScreen>
      <SimpleHeader 
        title="Admin Control Plane" 
        subtitle={`Welcome, ${convexUser.name || "Administrator"}`}
      />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <AnimatedSection animation="fadeInDown" delay={0}>
          <GlassCard variant="bordered" accentColor={isSuperAdmin ? colors.semantic.danger : colors.accent.primary} style={styles.roleCard}>
            <View style={styles.roleRow}>
              <View style={[styles.roleIconContainer, { backgroundColor: isSuperAdmin ? `${colors.semantic.danger}20` : `${colors.accent.primary}20` }]}>
                <MaterialCommunityIcons 
                  name={isSuperAdmin ? "shield-crown" : "shield-check"} 
                  size={32} 
                  color={isSuperAdmin ? colors.semantic.danger : colors.accent.primary} 
                />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleLabel}>Assigned Role</Text>
                <Text style={styles.roleName}>{myAdminPerms.displayName || "Administrator"}</Text>
              </View>
            </View>
          </GlassCard>
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" delay={100}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security & Audit Policy</Text>
            <GlassCard variant="standard" style={styles.policyCard}>
              <SecurityItem 
                icon="eye-outline" 
                text="All admin actions are permanently logged in the audit trail." 
              />
              <SecurityItem 
                icon="shield-lock-outline" 
                text="Account security (MFA) is highly recommended for all admins." 
              />
              <SecurityItem 
                icon="account-group-outline" 
                text="Respect user privacy. Access sensitive data only when required for support." 
              />
            </GlassCard>
          </View>
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" delay={200}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Start</Text>
            <View style={styles.buttonRow}>
              <PressableCard 
                title="Admin Dashboard" 
                subtitle="Manage platform, users, and data"
                icon="view-dashboard"
                color={colors.accent.primary}
                onPress={handleLaunchDashboard}
              />
              <PressableCard 
                title="Go to App" 
                subtitle="Browse the pantry and shopping lists"
                icon="home-outline"
                color={colors.accent.secondary}
                onPress={handleLaunchApp}
              />
            </View>
          </View>
        </AnimatedSection>

        <AnimatedSection animation="fadeInDown" delay={300}>
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={20} color={colors.text.tertiary} />
            <Text style={styles.infoText}>
              Regular onboarding (cuisine and pantry setup) has been bypassed for your account. You can configure personal preferences in your profile later.
            </Text>
          </View>
        </AnimatedSection>
      </ScrollView>
    </GlassScreen>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function SecurityItem({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.securityItem}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.text.secondary} />
      <Text style={styles.securityText}>{text}</Text>
    </View>
  );
}

function PressableCard({ title, subtitle, icon, color, onPress }: any) {
  return (
    <GlassCard variant="standard" style={styles.pressableCard}>
      <View style={styles.pressableContent}>
        <View style={[styles.pressableIcon, { backgroundColor: `${color}15` }]}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.pressableTitle}>{title}</Text>
        <Text style={styles.pressableSubtitle}>{subtitle}</Text>
        <GlassButton 
          variant="ghost" 
          size="sm" 
          onPress={onPress}
          style={styles.pressableBtn}
        >
          Launch
        </GlassButton>
      </View>
    </GlassCard>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  roleCard: {
    marginBottom: spacing.md,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  roleIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    textTransform: "uppercase",
  },
  roleName: {
    ...typography.headlineSmall,
    color: colors.text.primary,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  policyCard: {
    gap: spacing.md,
    padding: spacing.md,
  },
  securityItem: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  securityText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  pressableCard: {
    flex: 1,
    padding: spacing.md,
  },
  pressableContent: {
    alignItems: "center",
    gap: spacing.sm,
  },
  pressableIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  pressableTitle: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: "700",
    textAlign: "center",
  },
  pressableSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: "center",
    height: 36,
  },
  pressableBtn: {
    width: "100%",
    marginTop: 4,
  },
  infoBox: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: `${colors.text.tertiary}10`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    flex: 1,
    lineHeight: 18,
    fontStyle: "italic",
  },
});
