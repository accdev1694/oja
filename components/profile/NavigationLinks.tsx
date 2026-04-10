import { View, Text, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  GlassCard,
  AnimatedSection,
  colors,
  typography,
  spacing,
  borderRadius,
} from "@/components/ui/glass";

export function NavigationLinks({
  router,
  convexUser,
  myAdminPerms,
  subscription,
  pointsBalance,
  aiUsage,
  outOfStockItems,
  lowStockItems,
  handleSupportPress,
  animationDelay,
}: {
  router: ReturnType<typeof useRouter>;
  convexUser: {
    isAdmin?: boolean;
  } | null | undefined;
  myAdminPerms: {
    role?: string;
  } | null | undefined;
  subscription: {
    status?: string;
    isActive?: boolean;
    trialEndsAt?: number;
  } | null | undefined;
  pointsBalance: {
    tier?: string;
    tierProgress?: number;
  } | null | undefined;
  aiUsage: {
    voice?: {
      usage?: number;
      limit?: number;
    };
  } | null | undefined;
  outOfStockItems: number;
  lowStockItems: number;
  handleSupportPress: () => void;
  animationDelay: number;
}) {
  return (
    <AnimatedSection animation="fadeInDown" duration={400} delay={animationDelay}>
      <View style={styles.section}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(app)/points-history");
          }}
        >
          <GlassCard variant="standard" style={styles.navCard}>
            <View style={styles.navRow}>
              <View style={[styles.navIcon, { backgroundColor: `${colors.accent.primary}20` }]}>
                <MaterialCommunityIcons name="star-circle-outline" size={20} color={colors.accent.primary} />
              </View>
              <View style={styles.navInfo}>
                <Text style={styles.navTitle}>Points History</Text>
                <Text style={styles.navSubtitle}>Detailed log of your rewards</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
            </View>
          </GlassCard>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(app)/insights");
          }}
        >
          <GlassCard variant="standard" style={styles.navCard}>
            <View style={styles.navRow}>
              <View style={[styles.navIcon, { backgroundColor: `${colors.accent.primary}20` }]}>
                <MaterialCommunityIcons name="chart-line" size={20} color={colors.accent.primary} />
              </View>
              <View style={styles.navInfo}>
                <Text style={styles.navTitle}>Insights</Text>
                <Text style={styles.navSubtitle}>Trends, savings & achievements</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
            </View>
          </GlassCard>
        </Pressable>

        <Pressable
          onPress={handleSupportPress}
        >
          <GlassCard variant="standard" style={styles.navCard}>
            <View style={styles.navRow}>
              <View style={[
                styles.navIcon,
                { backgroundColor: myAdminPerms?.role === "super_admin" ? `${colors.semantic.danger}20` : `${colors.accent.primary}20` }
              ]}>
                <MaterialCommunityIcons
                  name={
                    myAdminPerms?.role === "super_admin"
                      ? "pulse"
                      : (convexUser?.isAdmin || myAdminPerms)
                        ? "shield-account-outline"
                        : "help-circle-outline"
                  }
                  size={20}
                  color={myAdminPerms?.role === "super_admin" ? colors.semantic.danger : colors.accent.primary}
                />
              </View>
              <View style={styles.navInfo}>
                <Text style={styles.navTitle}>
                  {myAdminPerms?.role === "super_admin"
                    ? "System Status"
                    : (convexUser?.isAdmin || myAdminPerms)
                      ? "Internal Support"
                      : "Help & Support"}
                </Text>
                <Text style={styles.navSubtitle}>
                  {myAdminPerms?.role === "super_admin"
                    ? "Monitoring & Diagnostics"
                    : (convexUser?.isAdmin || myAdminPerms)
                      ? "Support for admins & policy"
                      : "Contact support & view my tickets"}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
            </View>
          </GlassCard>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(app)/ai-usage");
          }}
        >
          <GlassCard variant="standard" style={styles.navCard}>
            <View style={styles.navRow}>
              <View style={[styles.navIcon, { backgroundColor: `${colors.accent.secondary}20` }]}>
                <MaterialCommunityIcons name="robot" size={20} color={colors.accent.secondary} />
              </View>
              <View style={styles.navInfo}>
                <Text style={styles.navTitle}>AI Usage</Text>
                <Text style={styles.navSubtitle}>
                  Voice: {aiUsage?.voice?.usage ?? 0}/{aiUsage?.voice?.limit ?? 200} this month
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
            </View>
          </GlassCard>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(app)/subscription");
          }}
        >
          <GlassCard variant="standard" style={styles.navCard}>
            <View style={styles.navRow}>
              <View style={[styles.navIcon, { backgroundColor: `${colors.accent.secondary}20` }]}>
                <MaterialCommunityIcons
                  name={subscription?.isActive ? "crown" : "crown-outline"}
                  size={20}
                  color={subscription?.status === "expired" ? colors.text.tertiary : colors.accent.secondary}
                />
              </View>
              <View style={styles.navInfo}>
                <Text style={styles.navTitle}>
                  {subscription?.status === "trial"
                    ? "Premium Trial"
                    : subscription?.status === "expired"
                      ? "Free Plan"
                      : subscription?.isActive
                        ? "Premium"
                        : "Free Plan"}
                </Text>
                <Text style={styles.navSubtitle}>
                  {subscription?.status === "trial" && subscription?.trialEndsAt
                    ? `${Math.max(0, Math.ceil((subscription.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))} days left · `
                    : subscription?.status === "expired"
                      ? "Trial ended · "
                      : ""}
                  {(pointsBalance?.tier || "bronze").charAt(0).toUpperCase() + (pointsBalance?.tier || "bronze").slice(1)} tier · {pointsBalance?.tierProgress ?? 0} scans
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
            </View>
          </GlassCard>
        </Pressable>

        {outOfStockItems > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.navigate("/(app)/(tabs)");
            }}
          >
            <GlassCard variant="standard" style={styles.navCard}>
              <View style={styles.navRow}>
                <View style={[styles.navIcon, { backgroundColor: `${colors.semantic.danger}20` }]}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color={colors.semantic.danger} />
                </View>
                <View style={styles.navInfo}>
                  <Text style={styles.navTitle}>Stock Alerts</Text>
                  <Text style={styles.navSubtitle}>
                    {outOfStockItems} out{lowStockItems > 0 ? ` · ${lowStockItems} low` : ""}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.text.tertiary} />
              </View>
            </GlassCard>
          </Pressable>
        )}
      </View>
    </AnimatedSection>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  navCard: {
    marginBottom: spacing.xs,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  navInfo: {
    flex: 1,
  },
  navTitle: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: "600",
    marginBottom: 2,
  },
  navSubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
});
