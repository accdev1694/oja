import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  GlassScreen,
  GlassCard,
  GlassButton,
  SimpleHeader,
  SkeletonCard,
  colors,
  typography,
  spacing,
} from "@/components/ui/glass";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const allLists = useQuery(api.shoppingLists.getByUser);
  const pantryItems = useQuery(api.pantryItems.getByUser);
  const loyalty = useQuery(api.subscriptions.getLoyaltyPoints);
  const subscription = useQuery(api.subscriptions.getCurrentSubscription);
  const receipts = useQuery(api.receipts.getByUser);
  const activeChallenge = useQuery(api.insights.getActiveChallenge);
  const generateChallenge = useMutation(api.insights.generateChallenge);

  // Auto-generate a weekly challenge if none active
  const challengeSeeded = useRef(false);
  useEffect(() => {
    if (activeChallenge === undefined || challengeSeeded.current) return; // still loading
    if (activeChallenge === null) {
      challengeSeeded.current = true;
      generateChallenge().catch(console.warn);
    }
  }, [activeChallenge]);

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  // Loading state with skeletons
  if (allLists === undefined || pantryItems === undefined) {
    return (
      <GlassScreen>
        <SimpleHeader title="Profile" accentColor={colors.semantic.profile} subtitle="Loading..." />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.skeletonContent}>
          <View style={styles.section}>
            <SkeletonCard />
          </View>
          <View style={styles.section}>
            <SkeletonCard />
          </View>
          <View style={styles.section}>
            <SkeletonCard />
          </View>
        </ScrollView>
      </GlassScreen>
    );
  }

  // Calculate stats
  const completedLists = allLists.filter((list) => list.status === "completed");
  const outOfStockItems = pantryItems.filter((item) => item.stockLevel === "out").length;
  const lowStockItems = pantryItems.filter((item) => item.stockLevel === "low").length;

  return (
    <GlassScreen>
      <SimpleHeader
        title="Profile"
        accentColor={colors.semantic.profile}
        subtitle="Your insights & settings"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <GlassCard variant="bordered" accentColor={colors.semantic.profile}>
            <View style={styles.accountRow}>
              <View style={styles.avatarContainer}>
                <MaterialCommunityIcons
                  name="account-circle"
                  size={48}
                  color={colors.semantic.profile}
                />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>
                  {user?.firstName || user?.username || "User"}
                </Text>
                <Text style={styles.accountEmail}>
                  {user?.primaryEmailAddress?.emailAddress || "Not set"}
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* New user milestone path */}
        {completedLists.length === 0 && allLists.length === 0 && (
          <View style={styles.section}>
            <GlassCard variant="standard" style={styles.milestonePath}>
              <Text style={styles.milestoneTitle}>Your journey starts here</Text>
              <Text style={styles.milestoneSubtitle}>
                Most shoppers save £30+ in their first month. Here's how to get there:
              </Text>
              <View style={styles.milestoneSteps}>
                {[
                  { icon: "package-variant" as const, text: "Add items to your stock", done: pantryItems.length > 0 },
                  { icon: "clipboard-list-outline" as const, text: "Create your first list", done: false },
                  { icon: "camera" as const, text: "Scan a receipt", done: false },
                  { icon: "trophy-outline" as const, text: "See your first savings", done: false },
                ].map((step, i) => (
                  <View key={i} style={styles.milestoneStep}>
                    <MaterialCommunityIcons
                      name={step.done ? "check-circle" : step.icon}
                      size={18}
                      color={step.done ? colors.accent.primary : colors.text.tertiary}
                    />
                    <Text style={[styles.milestoneStepText, step.done && styles.milestoneStepDone]}>
                      {step.text}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </View>
        )}

        {/* Quick Stats — single condensed row */}
        <GlassCard variant="standard" style={styles.quickStatsCard}>
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{completedLists.length}</Text>
              <Text style={styles.quickStatLabel}>trips</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{pantryItems.length}</Text>
              <Text style={styles.quickStatLabel}>items</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{receipts?.length ?? 0}</Text>
              <Text style={styles.quickStatLabel}>receipts</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={[styles.quickStatValue, { color: colors.accent.primary }]}>
                {loyalty?.points ?? 0}
              </Text>
              <Text style={styles.quickStatLabel}>pts</Text>
            </View>
          </View>
        </GlassCard>

        {/* Navigation Links */}
        <View style={styles.section}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(app)/insights" as any);
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
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Subscription screen — placeholder navigation
            }}
          >
            <GlassCard variant="standard" style={styles.navCard}>
              <View style={styles.navRow}>
                <View style={[styles.navIcon, { backgroundColor: `${colors.accent.secondary}20` }]}>
                  <MaterialCommunityIcons
                    name={subscription?.plan === "free" ? "crown-outline" : "crown"}
                    size={20}
                    color={colors.accent.secondary}
                  />
                </View>
                <View style={styles.navInfo}>
                  <Text style={styles.navTitle}>
                    {subscription?.plan === "free" ? "Free Plan" : "Premium"}
                  </Text>
                  <Text style={styles.navSubtitle}>
                    {loyalty?.points ?? 0} pts · {(loyalty?.tier || "bronze").charAt(0).toUpperCase() + (loyalty?.tier || "bronze").slice(1)} tier
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
                router.navigate("/(app)/(tabs)/" as any);
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

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <GlassButton
            variant="danger"
            size="lg"
            icon="logout"
            onPress={handleSignOut}
          >
            Sign Out
          </GlassButton>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </GlassScreen>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  skeletonContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  skeletonSectionTitle: {
    width: 80,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.glass.backgroundStrong,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  bottomSpacer: {
    height: 140,
  },

  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  // Account Card
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.semantic.profile}20`,
    justifyContent: "center",
    alignItems: "center",
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: 2,
  },
  accountEmail: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },

  // Milestone path (new user)
  milestonePath: {
    marginBottom: spacing.md,
  },
  milestoneTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    marginBottom: 4,
  },
  milestoneSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  milestoneSteps: {
    gap: spacing.sm,
  },
  milestoneStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  milestoneStepText: {
    ...typography.bodyMedium,
    color: colors.text.tertiary,
  },
  milestoneStepDone: {
    color: colors.accent.primary,
    textDecorationLine: "line-through",
  },

  // Quick Stats
  quickStatsCard: {
    marginBottom: spacing.lg,
  },
  quickStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  quickStat: {
    alignItems: "center",
    flex: 1,
  },
  quickStatValue: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    fontWeight: "700",
  },
  quickStatLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.glass.border,
  },

  // Navigation Cards
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
    borderRadius: 18,
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

  // Sign Out
  signOutSection: {
    marginTop: spacing.lg,
  },
});
