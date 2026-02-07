import { useEffect, useRef, useState } from "react";
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
  useGlassAlert,
} from "@/components/ui/glass";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { alert } = useGlassAlert();
  const { firstName } = useCurrentUser();

  const allLists = useQuery(api.shoppingLists.getByUser);
  const pantryItems = useQuery(api.pantryItems.getByUser);
  const scanCredits = useQuery(api.subscriptions.getScanCredits);
  const subscription = useQuery(api.subscriptions.getCurrentSubscription);
  const aiUsage = useQuery(api.aiUsage.getUsageSummary);
  const receipts = useQuery(api.receipts.getByUser);
  const activeChallenge = useQuery(api.insights.getActiveChallenge);
  const generateChallenge = useMutation(api.insights.generateChallenge);
  const resetMyAccount = useMutation(api.users.resetMyAccount);
  const deleteMyAccount = useMutation(api.users.deleteMyAccount);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: onConfirm },
    ]);
  };

  const handleResetAccount = () => {
    confirmAction(
      "Reset Account",
      "This will delete ALL your data (pantry, lists, receipts, etc.) and restart onboarding. Your login stays intact.",
      async () => {
        setIsResetting(true);
        try {
          await resetMyAccount();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/onboarding/welcome" as any);
        } catch (e) {
          console.error("Reset failed:", e);
          setIsResetting(false);
        }
      }
    );
  };

  const handleDeleteAccount = () => {
    confirmAction(
      "Delete Account",
      "This permanently deletes EVERYTHING — Convex data AND your Clerk login. You'll need to sign up with a fresh email. Are you sure?",
      async () => {
        setIsDeleting(true);
        try {
          // 1. Delete all Convex data + user doc
          await deleteMyAccount();

          // 2. Delete Clerk account (removes email from auth system)
          if (user) {
            try {
              await user.delete();
            } catch (clerkErr) {
              console.error("Clerk account deletion failed:", clerkErr);
              // Retry once
              try {
                await user.delete();
              } catch (retryErr) {
                console.error("Clerk deletion retry failed:", retryErr);
                alert(
                  "Partial Deletion",
                  "Your app data was deleted but the login account could not be removed. Please contact support or delete it manually from account settings."
                );
              }
            }
          }

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          try { await signOut(); } catch {}
          router.replace("/(auth)/sign-in");
        } catch (e) {
          console.error("Delete failed:", e);
          try { await signOut(); } catch {}
          router.replace("/(auth)/sign-in");
          setIsDeleting(false);
        }
      }
    );
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
        title={firstName ? `Hey, ${firstName}` : "Profile"}
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

        {/* New user milestone path — hide once all steps are done */}
        {(() => {
          const milestones = [
            { icon: "package-variant" as const, text: "Add items to your stock", done: pantryItems.length > 0 },
            { icon: "clipboard-list-outline" as const, text: "Create your first list", done: allLists.length > 0 },
            { icon: "camera" as const, text: "Scan a receipt", done: (receipts?.filter((r) => r.processingStatus === "completed").length ?? 0) > 0 },
            { icon: "trophy-outline" as const, text: "Earn your first credit", done: (scanCredits?.creditsEarned ?? 0) > 0 },
          ];
          const allDone = milestones.every((m) => m.done);
          if (allDone) return null;
          return (
            <View style={styles.section}>
              <GlassCard variant="standard" style={styles.milestonePath}>
                <Text style={styles.milestoneTitle}>Your journey starts here</Text>
                <Text style={styles.milestoneSubtitle}>
                  Most shoppers save £30+ in their first month. Here's how to get there:
                </Text>
                <View style={styles.milestoneSteps}>
                  {milestones.map((step, i) => (
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
          );
        })()}

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
              <Text style={styles.quickStatValue}>{receipts?.filter((r) => r.processingStatus === "completed").length ?? 0}</Text>
              <Text style={styles.quickStatLabel}>receipts</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={[styles.quickStatValue, { color: colors.accent.primary }]}>
                {scanCredits?.lifetimeScans ?? 0}
              </Text>
              <Text style={styles.quickStatLabel}>scans</Text>
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
              router.push("/(app)/ai-usage" as any);
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
              router.push("/(app)/subscription" as any);
            }}
          >
            <GlassCard variant="standard" style={styles.navCard}>
              <View style={styles.navRow}>
                <View style={[styles.navIcon, { backgroundColor: `${colors.accent.secondary}20` }]}>
                  <MaterialCommunityIcons
                    name={(subscription as any)?.isActive ? "crown" : "crown-outline"}
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
                        : (subscription as any)?.isActive
                          ? "Premium"
                          : "Free Plan"}
                  </Text>
                  <Text style={styles.navSubtitle}>
                    {subscription?.status === "trial" && (subscription as any)?.trialEndsAt
                      ? `${Math.max(0, Math.ceil(((subscription as any).trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))} days left · `
                      : subscription?.status === "expired"
                        ? "Trial ended · "
                        : ""}
                    {(scanCredits?.tier || "bronze").charAt(0).toUpperCase() + (scanCredits?.tier || "bronze").slice(1)} tier · {scanCredits?.lifetimeScans ?? 0} scans
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

        {/* Dev Tools — Reset & Delete */}
        <View style={styles.devToolsSection}>
          <Text style={styles.devToolsLabel}>Dev Tools</Text>
          <GlassButton
            variant="secondary"
            size="md"
            icon="refresh"
            onPress={handleResetAccount}
            disabled={isResetting}
          >
            {isResetting ? "Resetting..." : "Reset Account (re-onboard)"}
          </GlassButton>
          <View style={{ height: spacing.sm }} />
          <GlassButton
            variant="danger"
            size="md"
            icon="delete-forever"
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
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

  // Dev Tools
  devToolsSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  devToolsLabel: {
    ...typography.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
});
